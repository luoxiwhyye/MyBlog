# ============================================================
# 上传文件（图片）备份脚本 — 备份 + 校验 + 清理 + 可选同步到对象存储
#
# 为什么单独一份：scripts/backup.sh 只做 mysqldump，而文章正文里的图片是
# 「数据库之外」的资产 —— 丢了没法从库里重建。数据库备份与图片备份必须成对。
#
# 使用方式：
#   # 宿主机的 uploads 目录（不经容器）
#   UPLOAD_DIR=./myblog-express/uploads BACKUP_DIR=./backups bash scripts/backup-uploads.sh
#
#   # 容器内（docker-compose 已把 uploads-data 只读挂到 /uploads）
#   docker compose exec myblog-backup bash /scripts/backup-uploads.sh
#
#   # 同时同步到对象存储（先配好 rclone remote）
#   RCLONE_REMOTE=oss:myblog-backup bash scripts/backup-uploads.sh
#
# 关键约束：
#   1. 产物是 tar.gz + 同名 .sha256，格式与 backup.sh 一致（可直接用 verify-backup.sh 的
#      gzip -t + sha256 双校验逻辑复核，只是它按 .sql.gz 遍历目录，故本脚本自带一次校验）。
#   2. 备份完成后立即校验；校验不过就删掉产物并返回非 0 —— 不留「不可信备份」。
#   3. 配置了 RCLONE_REMOTE 而同步失败时同样返回非 0：备份留在本机 = 宿主机磁盘挂了就没了，
#      静默失败等于没有异地备份。
# ============================================================

#!/bin/bash
set -euo pipefail

UPLOAD_DIR="${UPLOAD_DIR:-/uploads}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
PREFIX="uploads"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
    exit 1
}

calc_hash() {
    local file="$1"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file" | awk '{print $1}'
    elif command -v shasum >/dev/null 2>&1; then
        shasum -a 256 "$file" | awk '{print $1}'
    else
        fail "未找到 sha256sum/shasum 校验工具"
    fi
}

# 按字节换算显示（du -h 在部分容器里对小文件会输出 0，看着像没生成）
human_size() {
    local bytes="$1"
    if [ "${bytes}" -ge 1048576 ]; then
        echo "$((bytes / 1048576)) MB"
    elif [ "${bytes}" -ge 1024 ]; then
        echo "$((bytes / 1024)) KB"
    else
        echo "${bytes} B"
    fi
}

# ── 定位 uploads 目录（容器内为 /uploads，宿主机常见为仓库下的相对路径）──
if [ ! -d "${UPLOAD_DIR}" ]; then
    for candidate in "./myblog-express/uploads" "../myblog-express/uploads" "/app/uploads"; do
        if [ -d "${candidate}" ]; then
            log "UPLOAD_DIR=${UPLOAD_DIR} 不存在，改用 ${candidate}"
            UPLOAD_DIR="${candidate}"
            break
        fi
    done
fi
[ -d "${UPLOAD_DIR}" ] || fail "上传目录不存在: ${UPLOAD_DIR}（用 UPLOAD_DIR=<路径> 指定）"

mkdir -p "${BACKUP_DIR}"

FILE_COUNT="$(find "${UPLOAD_DIR}" -type f | wc -l | tr -d ' ')"
if [ "${FILE_COUNT}" -eq 0 ]; then
    log "提示：${UPLOAD_DIR} 下没有文件（空库首启属正常），仍会生成一个空归档作为时间点标记"
fi

TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
ARCHIVE="${BACKUP_DIR}/${PREFIX}_${TIMESTAMP}.tar.gz"
CHECKSUM="${ARCHIVE}.sha256"

log "开始打包: ${UPLOAD_DIR}（${FILE_COUNT} 个文件）→ ${ARCHIVE}"
# -C 到父目录再打成子目录名，解包时自然得到 uploads/... 结构
PARENT_DIR="$(dirname "${UPLOAD_DIR}")"
BASE_NAME="$(basename "${UPLOAD_DIR}")"
tar -czf "${ARCHIVE}" -C "${PARENT_DIR}" "${BASE_NAME}" || fail "打包失败: ${ARCHIVE}"

# ── 生成校验和 ──
HASH="$(calc_hash "${ARCHIVE}")"
echo "${HASH}  $(basename "${ARCHIVE}")" > "${CHECKSUM}"

# ── 立即校验：gzip 完整性 + sha256 ──
if ! gzip -t "${ARCHIVE}" 2>/dev/null; then
    rm -f "${ARCHIVE}" "${CHECKSUM}"
    fail "gzip 完整性校验失败，已删除不可信产物: ${ARCHIVE}"
fi
ACTUAL="$(calc_hash "${ARCHIVE}")"
if [ "${HASH}" != "${ACTUAL}" ]; then
    rm -f "${ARCHIVE}" "${CHECKSUM}"
    fail "sha256 校验失败，已删除不可信产物: ${ARCHIVE}"
fi
log "校验通过: $(basename "${ARCHIVE}") 大小 $(human_size "$(wc -c < "${ARCHIVE}" | tr -d ' ')")"

# ── 同步到对象存储（可选；配了就必须成功）──
if [ -n "${RCLONE_REMOTE}" ]; then
    command -v rclone >/dev/null 2>&1 || fail "配置了 RCLONE_REMOTE 但容器 / 宿主机没有 rclone 命令"
    log "同步到对象存储: ${RCLONE_REMOTE}/"
    rclone copy "${ARCHIVE}" "${RCLONE_REMOTE}/" --no-traverse || fail "rclone 同步失败: ${ARCHIVE}"
    rclone copy "${CHECKSUM}" "${RCLONE_REMOTE}/" --no-traverse || fail "rclone 同步失败: ${CHECKSUM}"
    log "对象存储同步完成"
else
    log "未配置 RCLONE_REMOTE：本次备份只留在 ${BACKUP_DIR}（宿主机磁盘损坏即丢失）"
fi

# ── 清理过期备份（归档与校验和成对删除）──
DELETED=0
while IFS= read -r old; do
    [ -e "${old}" ] || continue
    rm -f "${old}" "${old}.sha256"
    DELETED=$((DELETED + 1))
done < <(find "${BACKUP_DIR}" -maxdepth 1 -name "${PREFIX}_*.tar.gz" -mtime "+${RETENTION_DAYS}" 2>/dev/null || true)
if [ "${DELETED}" -gt 0 ]; then
    log "已清理 ${DELETED} 个超过 ${RETENTION_DAYS} 天的旧备份"
fi

log "图片备份完成"
# 恢复方式（务必在演练里走过一遍）：
#   tar -xzf <归档> -C <目标父目录>      # 归档内是 uploads/ 前缀，解包即还原目录树
#   容器部署的目标目录 = myblog-backup 容器里 /uploads 的来源目录（uploads-data 卷）
exit 0
