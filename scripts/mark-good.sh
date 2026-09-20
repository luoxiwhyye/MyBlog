# ============================================================
# 回滚点标记 —— 给「当前这组可用镜像」打上 rollback-<commit> 标签并记进台账
#
# 为什么要脚本化（本次真实踩到）：
#   1. 手工打标签时把镜像名前缀写错（应是 myblog-myblog-<服务名>，写成了 myblog-<服务名>），
#      而命令里带了 `2>/dev/null || true` → 报错被吞掉、表面上「成功」了。
#   2. 打完标签必须人工核对「标签指向的镜像 ID == 容器实际在用的镜像 ID」才敢信任。
#   3. 更隐蔽的：某个 commit 只重建了前端，backend / backup 的镜像比它更早，
#      但标签名 rollback-<commit> 会让人以为四个服务都是那个 commit 构建的
#      → 所以台账里必须记「这次重建了哪些服务」。
#
# 使用方式（在仓库根执行，脚本自己找 compose 项目）：
#   bash scripts/mark-good.sh                       # 用 git HEAD 打标签
#   bash scripts/mark-good.sh --built=blog,admin    # 声明这次重建了哪些服务
#   bash scripts/mark-good.sh --list                # 只看现有回滚点台账
#
# 退出码：0 = 四个服务的标签都已校验一致 / 1 = 存在不一致或失败（见逐行输出）
# ============================================================

#!/bin/bash
set -euo pipefail

# ── 配置 ──
# 镜像名不硬编码前缀：直接从「容器正在用的镜像」取（compose 项目名改了也不会失效）
SERVICES_DEFAULT="myblog-backend myblog-blog myblog-admin myblog-backup"
ROLLBACK_POINTS_FILE="${ROLLBACK_POINTS_FILE:-/root/myblog-rollback-points.txt}"
# compose 项目名（容器名前缀）。留空则从容器名推断
COMPOSE_PROJECT="${COMPOSE_PROJECT:-myblog}"

# 取镜像引用的「仓库名」部分（去掉 tag）。
# docker tag 的第二个参数必须是 <仓库名>:<标签>，而容器拿到的引用可能已经带 tag
# （如 mysql:8.0）—— 直接拼会得到 "mysql:8.0:rollback-xxx" 这种非法引用，docker 直接报错。
#   仅当最后一段（最后一个 / 之后）含冒号时才当作 tag 去掉 —— 这样
#   localhost:5000/myapp 这种带端口的仓库不会被误截。
image_repo() {
    local ref="$1" last
    last="${ref##*/}"
    if [ "${last#*:}" != "${last}" ]; then
        printf '%s' "${ref%:*}"
    else
        printf '%s' "${ref}"
    fi
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
    exit 1
}

# ── 参数 ──
BUILT=""
LIST_ONLY=0
SERVICES="${SERVICES_DEFAULT}"
for arg in "$@"; do
    case "${arg}" in
        --help|-h)
            echo "用法: bash scripts/mark-good.sh [--built=svc1,svc2] [--list] [--services=svc1,svc2]"
            echo ""
            echo "  --built=<列表>     声明这次重建了哪些服务（写进台账；强烈建议给）"
            echo "  --list             只打印现有回滚点台账"
            echo "  --services=<列表>  要打标签的服务（默认: ${SERVICES_DEFAULT}）"
            echo ""
            echo "环境变量: ROLLBACK_POINTS_FILE（默认 /root/myblog-rollback-points.txt）"
            echo "退出码: 0 全部一致 / 1 有不一致或失败"
            exit 0
            ;;
        --built=*)
            BUILT="${arg#--built=}"
            ;;
        --services=*)
            SERVICES="$(printf '%s' "${arg#--services=}" | tr ',' ' ')"
            ;;
        --list)
            LIST_ONLY=1
            ;;
        *)
            fail "无法识别的参数: ${arg}（--help 看用法）"
            ;;
    esac
done

# ── --list：只打印台账 ──
if [ "${LIST_ONLY}" -eq 1 ]; then
    if [ ! -f "${ROLLBACK_POINTS_FILE}" ]; then
        log "台账不存在（还没有打过回滚点）: ${ROLLBACK_POINTS_FILE}"
        exit 0
    fi
    cat "${ROLLBACK_POINTS_FILE}"
    exit 0
fi

# ── 读 git HEAD ──
command -v git >/dev/null 2>&1 || fail "环境里没有 git 命令"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail "当前目录不是 git 仓库（请在仓库根执行）"
COMMIT="$(git rev-parse --short HEAD)"
SUBJECT="$(git log -1 --pretty=%s)"
TAG_SUFFIX="rollback-${COMMIT}"

log "回滚点标记: commit=${COMMIT}  标题=${SUBJECT}"
if [ -z "${BUILT}" ]; then
    log "WARN: 未传 --built=<服务列表> —— 台账里那一栏会标「未声明」，"
    log "      下次回滚时就只能靠镜像时间逐个核对哪些服务真的对应这个 commit"
fi

# ── 打标签 + 校验（逐行打印，不吞错误）──
OK_COUNT=0
MISMATCH_COUNT=0
FAILED_COUNT=0

for service in ${SERVICES}; do
    # 容器名两种形态都试：compose 里写死的 container_name（myblog-backend），
    # 以及 compose 自动命名（myblog-myblog-backend-1）
    cid="$(docker ps -a --filter "name=^${service}$" --format '{{.ID}}' | head -1)"
    if [ -z "${cid}" ]; then
        cid="$(docker ps -a --filter "name=^${COMPOSE_PROJECT}-${service}-1$" --format '{{.ID}}' | head -1)"
    fi
    if [ -z "${cid}" ]; then
        cid="$(docker ps -a --filter "name=^${service}-1$" --format '{{.ID}}' | head -1)"
    fi
    if [ -z "${cid}" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')]   x ${service}: 找不到容器（该服务没部署？）"
        FAILED_COUNT="$((FAILED_COUNT + 1))"
        continue
    fi

    image="$(docker inspect --format '{{.Config.Image}}' "${cid}")"
    # ⚠️ docker inspect 给的是 "sha256:<64位>"，而 docker images 默认给 12 位短 ID ——
    #    两者直接比永远不等。统一去前缀 + 取全 ID 比较，展示时再截短。
    running_id="$(docker inspect --format '{{.Image}}' "${cid}" | sed 's/^sha256://')"
    repo="$(image_repo "${image}")"
    target="${repo}:${TAG_SUFFIX}"

    if ! docker tag "${image}" "${target}"; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')]   x ${service}: docker tag 失败（镜像 ${image} 不存在？）"
        FAILED_COUNT="$((FAILED_COUNT + 1))"
        continue
    fi

    # 校验标签指向的镜像 == 容器实际在跑的那个：只靠「命令成功」不足信，
    # 必须看 ID 对得上（同名 tag 可能已被后来的构建覆盖）。
    tagged_id="$(docker images --no-trunc --format '{{.ID}}' "${target}" | head -1 | sed 's/^sha256://')"
    # 展示用短 ID：用 printf 而不是 ${var:0:12}（后者是 bash 专属语法）
    short_tagged="$(printf '%.12s' "${tagged_id}")"
    short_running="$(printf '%.12s' "${running_id}")"
    if [ "${tagged_id}" = "${running_id}" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')]   ok ${service}: ${target}"
        echo "                                   标签 ${short_tagged} == 容器在用镜像（一致）"
        OK_COUNT="$((OK_COUNT + 1))"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')]   !! ${service}: 标签镜像与容器在用镜像不是同一份" >&2
        echo "                                   标签 ${short_tagged}" >&2
        echo "                                   容器 ${short_running}" >&2
        echo "                                   容器不是用当前这份镜像名跑的（镜像名已被新构建覆盖？）" >&2
        MISMATCH_COUNT="$((MISMATCH_COUNT + 1))"
    fi
done

# ── 台账：一行一个回滚点，便于日后判断标签可信度 ──
LEDGER_LINE="$(date '+%Y-%m-%d %H:%M:%S')  ${COMMIT}  重建=[${BUILT:-未声明}]  ${SUBJECT}"
if [ -n "$(dirname "${ROLLBACK_POINTS_FILE}")" ] && [ ! -d "$(dirname "${ROLLBACK_POINTS_FILE}")" ]; then
    mkdir -p "$(dirname "${ROLLBACK_POINTS_FILE}")" || fail "无法创建台账目录: $(dirname "${ROLLBACK_POINTS_FILE}")"
fi

if [ "${FAILED_COUNT}" -eq 0 ] && [ "${MISMATCH_COUNT}" -eq 0 ]; then
    printf '%s\n' "${LEDGER_LINE}" >> "${ROLLBACK_POINTS_FILE}" || fail "写入台账失败: ${ROLLBACK_POINTS_FILE}"
    log "台账已追加: ${ROLLBACK_POINTS_FILE}"
else
    log "WARN: 有 ${FAILED_COUNT} 个服务失败、${MISMATCH_COUNT} 个不一致，本次不写台账（台账只记可信回滚点）"
fi

echo ""
log "结果: 一致 ${OK_COUNT} / 不一致 ${MISMATCH_COUNT} / 失败 ${FAILED_COUNT}"
echo ""
log "回滚做法（标签名就是上面 ok 行里打印的那个）:"
log "  1) docker compose --env-file .env.docker stop <服务>"
log "  2) docker tag <上面那个标签> <同一个仓库名>:latest"
log "  3) docker compose --env-file .env.docker up -d <服务>   # 镜像 ID 变了，会重建容器"
log "  4) docker compose ps && curl -sS https://<域名>/health"
log "台账查看：bash scripts/mark-good.sh --list"

if [ "${FAILED_COUNT}" -gt 0 ] || [ "${MISMATCH_COUNT}" -gt 0 ]; then
    exit 1
fi
exit 0
