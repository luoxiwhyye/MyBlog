# ============================================================
# O-03: 数据库一键恢复脚本 (MySQL) — 校验后恢复
#
# 使用方式：
#   # 恢复指定备份（会先校验 sha256 + gzip 完整性，通过才导入）
#   bash scripts/restore.sh /path/to/myblog_20260101_020000.sql.gz
#
#   # 跳过交互确认（用于自动化/恢复演练）
#   CONFIRM=1 bash scripts/restore.sh <备份文件>
#
# 安全设计：
#   1. 必须先通过 sha256 校验和 + gzip 完整性校验，否则拒绝恢复
#   2. 默认交互确认（打印目标库名，需输入 YES），CONFIRM=1 跳过
#   3. 恢复前可选是否保留旧库文件（DROP 由 SQL 内建语句决定）
#   4. 生产库保险：目标库 = 生产库时必须显式 ALLOW_PROD=1（见下面「生产库保险」注释）
# ============================================================

#!/bin/bash
set -euo pipefail

# ── 配置 ──
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-myblog}"

# 校验和工具（优先 sha256sum，回退 shasum）
calc_hash() {
    local file="$1"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file" | awk '{print $1}'
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file" | awk '{print $1}'
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 未找到 sha256sum/shasum 校验工具" >&2
        exit 1
    fi
}

# ── 校验备份文件 ──
verify_backup() {
    local file="$1"
    local checksum="$1.sha256"

    if [ ! -f "${file}" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 备份文件不存在: ${file}" >&2
        exit 1
    fi
    if [ ! -f "${checksum}" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 缺少校验和文件: ${checksum}" >&2
        exit 1
    fi

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 校验 gzip 完整性..."
    if ! gzip -t "${file}" 2>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: gzip 完整性校验失败: ${file}" >&2
        exit 1
    fi

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 校验 sha256 校验和..."
    local expected actual
    expected="$(awk '{print $1}' "${checksum}")"
    actual="$(calc_hash "${file}")"
    if [ "${expected}" != "${actual}" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: sha256 校验失败! 备份已损坏或被篡改:" >&2
        echo "          expected=${expected}" >&2
        echo "          actual  =${actual}" >&2
        exit 1
    fi

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 校验通过，备份完整可信: ${file}"
}

# ── 生产库保险 ──
# 为什么需要：备份文件里每个表都带【不带库名前缀】的 DROP TABLE IF EXISTS，作用在「当前连接的
# 库」上 —— 于是下面两条命令长得一模一样，后果却相反：
#
#   灾难恢复（就该打到生产库）
#     docker compose exec myblog-backup bash /scripts/restore.sh <备份文件>
#   演练漏写 -e DB_NAME（会先清空生产库的表再重灌）
#     docker compose exec myblog-backup bash /scripts/restore.sh <备份文件>
#
# 所以：目标库 = 生产库时必须由人显式确认（ALLOW_PROD=1），脚本不做「猜意图」。
#
# 生产库名（不硬编码，用户可能改过库名）按优先级取：
#   ① PROD_DB_NAME 环境变量（docker-compose 已给 myblog-backup 注入）
#   ② 备份文件名前缀（backup.sh 的命名契约 <库名>_YYYYMMDD_HHMMSS.sql.gz）
#   ③ 都拿不到 → 按最保守处理：当成生产库，要求 ALLOW_PROD=1
# 之所以要 ②：演练命令里 DB_NAME 已被改成临时库，此时只有文件名还能指出生产库是谁。
derive_prod_db_name() {
    local base time_part rest stamp name
    base="$(basename "$1")"
    case "${base}" in
        *.sql.gz) base="${base%.sql.gz}" ;;
        *) return 1 ;;
    esac
    case "${base}" in
        *_*) : ;;
        *) return 1 ;;
    esac
    time_part="${base##*_}"
    rest="${base%_*}"
    stamp="${rest##*_}"
    name="${rest%_*}"
    case "${time_part}" in [0-9][0-9][0-9][0-9][0-9][0-9]) : ;; *) return 1 ;; esac
    case "${stamp}" in [0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]) : ;; *) return 1 ;; esac
    [ -n "${name}" ] || return 1
    printf '%s' "${name}"
}

# 拒绝恢复：不只说「不许」，要把两条正确命令都写出来
refuse_prod_restore() {
    local why="$1"
    echo "" >&2
    echo "⚠️  拒绝恢复：${why}" >&2
    echo "    备份里的 DROP TABLE 不带库名前缀，会作用在当前连接的库（${TARGET_DB}）上。" >&2
    echo "" >&2
    echo "    如果你在做【灾难恢复】（确实要覆盖生产库 ${PROD_DB:-?}），显式确认：" >&2
    echo "      docker compose exec -e ALLOW_PROD=1 myblog-backup bash /scripts/restore.sh ${BACKUP_FILE}" >&2
    echo "" >&2
    echo "    如果你在做【恢复演练】（推荐用 rehearse-restore.sh 一键完成），改指向临时库：" >&2
    echo "      docker compose exec -e DB_NAME=myblog_restore_test -e CONFIRM=1 myblog-backup bash /scripts/restore.sh ${BACKUP_FILE}" >&2
    echo "" >&2
    exit 1
}

# ── 参数 ──
BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ]; then
    echo "用法: bash scripts/restore.sh <备份文件> [--yes]" >&2
    echo "示例: bash scripts/restore.sh ./backups/myblog_20260101_020000.sql.gz" >&2
    exit 1
fi

# ── 校验 ──
verify_backup "${BACKUP_FILE}"

# ── 生产库保险 ──
TARGET_DB="${DB_NAME:-myblog}"
PROD_DB="${PROD_DB_NAME:-}"
PROD_SOURCE="PROD_DB_NAME"
if [ -z "${PROD_DB}" ]; then
    if derived="$(derive_prod_db_name "${BACKUP_FILE}")"; then
        PROD_DB="${derived}"
        PROD_SOURCE="备份文件名前缀"
    fi
fi

if [ "${ALLOW_PROD:-0}" != "1" ]; then
    if [ -n "${PROD_DB}" ] && [ "${TARGET_DB}" = "${PROD_DB}" ]; then
        refuse_prod_restore "目标库 ${TARGET_DB} 就是生产库（生产库名来自 ${PROD_SOURCE}），且未设置 ALLOW_PROD=1"
    elif [ -z "${PROD_DB}" ]; then
        refuse_prod_restore "无法判断生产库名（PROD_DB_NAME 未设置，备份文件名 ${BACKUP_FILE} 也不是 <库名>_YYYYMMDD_HHMMSS.sql.gz 形状），且未设置 ALLOW_PROD=1"
    fi
fi

# ── 确认 ──
if [ "${CONFIRM:-0}" != "1" ]; then
    echo ""
    echo "⚠️  即将把备份 ${BACKUP_FILE} 恢复到数据库 ${TARGET_DB}@${DB_HOST}:${DB_PORT}" >&2
    echo "    这会覆盖当前 ${TARGET_DB} 库的所有数据，操作不可逆！" >&2
    read -r -p "  请输入 YES 以确认恢复: " answer
    if [ "${answer}" != "YES" ]; then
        echo "已取消恢复操作。"
        exit 0
    fi
fi

# ── 恢复（解压后导入） ──
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始恢复数据库: ${TARGET_DB}"
if gzip -dc "${BACKUP_FILE}" | mysql \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -p"${DB_PASSWORD}" \
    "${TARGET_DB}"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 数据库恢复成功: ${TARGET_DB}"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 恢复失败!" >&2
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 恢复完成。建议立即检查数据完整性。"
