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

# 可选：上传到 S3/OSS
S3_BUCKET="${S3_BUCKET:-}"
S3_ENDPOINT="${S3_ENDPOINT:-}"

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
        # 校验目录下最近一个备份
        local latest
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
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup failed!" >&2
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

# ── 上传到 S3（可选） ──
if [ -n "${S3_BUCKET}" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploading to S3: ${S3_BUCKET}"
    if [ -n "${S3_ENDPOINT}" ]; then
        aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/${TIMESTAMP}/" \
            --endpoint-url "${S3_ENDPOINT}"
        aws s3 cp "${CHECKSUM_FILE}" "s3://${S3_BUCKET}/backups/${TIMESTAMP}/" \
            --endpoint-url "${S3_ENDPOINT}"
    else
        aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/${TIMESTAMP}/"
        aws s3 cp "${CHECKSUM_FILE}" "s3://${S3_BUCKET}/backups/${TIMESTAMP}/"
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Upload complete"
fi

# ── 清理过期备份（同步清理校验和文件） ──
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete -print
find "${BACKUP_DIR}" -name "*.sha256" -mtime "+${RETENTION_DAYS}" -delete -print

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup finished successfully"
