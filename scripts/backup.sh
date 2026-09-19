# ============================================================
# O-03: 数据库自动备份脚本 (MySQL) — 增强版：备份 + 校验 + 清理
#
# 使用方式：
#   # 手动执行（备份 + 生成校验和 + 校验完整性）
#   bash scripts/backup.sh
#
#   # 只校验最近一次备份（不触发新的备份）
#   VERIFY_ONLY=1 bash scripts/backup.sh [备份文件名]
#
#   # 每天凌晨 2 点自动备份（crontab -e）
#   0 2 * * * /app/scripts/backup.sh >> /var/log/myblog-backup.log 2>&1
#
# 关键改进：
#   1. 备份后生成同名的 .sha256 校验和文件
#   2. 备份完成后立即校验 gzip -t + sha256 -c，失败即报错退出
#      （不产生不可信备份，杜绝"备份了但损坏/传输错误"的静默风险）
#   3. 可选 VERIFY_ONLY 仅校验已有备份
#   4. 可选 RCLONE_REMOTE 同步到对象存储（备份只留本机 = 磁盘挂了就没了）
# ============================================================

#!/bin/bash
set -euo pipefail

# ── 配置 ──
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-myblog}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

# 可选：同步到对象存储（rclone 远端名 + 桶名，与 backup-uploads.sh 同一套配置）
RCLONE_REMOTE="${RCLONE_REMOTE:-}"

# 本脚本产物的文件名前缀。同一目录里还住着 uploads_* 的图片备份，
# 清理时必须按前缀区分 —— 用 *.sha256 这种通配会连对方的校验和一起删掉。
FILENAME_PREFIX="${DB_NAME}"

# ── 生成校验和 ──
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

# ── 校验单个备份文件（gzip 完整性 + sha256 校验和） ──
verify_backup() {
    local file="$1"
    local checksum="$1.sha256"

    if [ ! -f "${file}" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 备份文件不存在: ${file}" >&2
        return 1
    fi

    if [ ! -f "${checksum}" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 缺少校验和文件: ${checksum}" >&2
        return 1
    fi

    # 1) gzip 完整性（解压测试，能读到结尾 EOF）
    if ! gzip -t "${file}" 2>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: gzip 完整性校验失败: ${file}" >&2
        return 1
    fi

    # 2) sha256 校验和比对
    local expected actual
    expected="$(awk '{print $1}' "${checksum}")"
    actual="$(calc_hash "${file}")"
    if [ "${expected}" != "${actual}" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: sha256 校验失败! 文件已损坏或被篡改: ${file}" >&2
        echo "          expected=${expected}" >&2
        echo "          actual  =${actual}" >&2
        return 1
    fi

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] VERIFY OK: ${file} (sha256 summary)"
    return 0
}

# ── VERIFY_ONLY 模式 ──
if [ "${VERIFY_ONLY:-0}" = "1" ]; then
    if [ -n "${1:-}" ]; then
        verify_backup "$1" || exit 1
    else
        # 校验目录下最近一个备份（⚠️ 这里不在函数体内，不能用 local）
        latest="$(ls -t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -1 || true)"
        if [ -z "${latest}" ]; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 备份目录为空: ${BACKUP_DIR}" >&2
            exit 1
        fi
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] VERIFY_ONLY 校验最近备份: ${latest}"
        verify_backup "${latest}" || exit 1
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 校验完成"
    exit 0
fi

# ── 生成备份文件名 ──
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
CHECKSUM_FILE="${BACKUP_FILE}.sha256"

mkdir -p "${BACKUP_DIR}"

# ── 执行备份 ──
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup: ${DB_NAME}"

if mysqldump \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -p"${DB_PASSWORD}" \
    --single-transaction \
    --quick \
    --skip-lock-tables \
    --no-tablespaces \
    "${DB_NAME}" | gzip > "${BACKUP_FILE}"; then
    SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created: ${BACKUP_FILE} (${SIZE})"
else
    # gzip 已经把（空的）归档写出来了，必须删掉：否则备份目录里会留下一个
    # 几十字节、看着像备份的假文件，灾难恢复时才发现它是空的。
    rm -f "${BACKUP_FILE}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup failed! 已删除不完整产物: ${BACKUP_FILE}" >&2
    exit 1
fi

# ── 生成校验和 ──
calc_hash "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checksum created: ${CHECKSUM_FILE}"

# ── 立即校验（形成闭环：备份即可信） ──
if verify_backup "${BACKUP_FILE}"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 备份后校验通过"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 备份完整性校验失败，删除坏备份" >&2
    rm -f "${BACKUP_FILE}" "${CHECKSUM_FILE}"
    exit 1
fi

# ── 同步到对象存储（可选；配了就必须成功） ──
# 备份只留在本机等于没有备份（宿主机磁盘损坏即全丢），所以这里不做「试着上传、失败就算了」：
# 同步失败一律返回非 0，让 cron 日志/监控能看见。
if [ -n "${RCLONE_REMOTE}" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 同步到对象存储: ${RCLONE_REMOTE}/"
    if ! command -v rclone >/dev/null 2>&1; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 配置了 RCLONE_REMOTE 但环境里没有 rclone 命令" >&2
        exit 1
    fi
    if ! rclone copy "${BACKUP_FILE}" "${RCLONE_REMOTE}/" --no-traverse; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: rclone 同步失败: ${BACKUP_FILE}" >&2
        exit 1
    fi
    if ! rclone copy "${CHECKSUM_FILE}" "${RCLONE_REMOTE}/" --no-traverse; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: rclone 同步失败: ${CHECKSUM_FILE}" >&2
        exit 1
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 对象存储同步完成"
fi

# ── 清理过期备份（同步清理校验和文件） ──
# 只清理本脚本的产物（${FILENAME_PREFIX}_*.sql.gz 及其校验和）
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name "${FILENAME_PREFIX}_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete -print
find "${BACKUP_DIR}" -name "${FILENAME_PREFIX}_*.sql.gz.sha256" -mtime "+${RETENTION_DAYS}" -delete -print

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup finished successfully"
