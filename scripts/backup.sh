# ============================================================
# O-03: 数据库自动备份脚本 (MySQL)
# 使用方式：
#   # 手动执行
#   bash scripts/backup.sh
#   # 每天凌晨 2 点自动备份（crontab -e）
#   0 2 * * * /app/scripts/backup.sh >> /var/log/myblog-backup.log 2>&1
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

# ── 生成备份文件名 ──
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

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
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created: ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup failed!" >&2
    exit 1
fi

# ── 上传到 S3（可选） ──
if [ -n "${S3_BUCKET}" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploading to S3: ${S3_BUCKET}"
    if [ -n "${S3_ENDPOINT}" ]; then
        aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/${TIMESTAMP}/" \
            --endpoint-url "${S3_ENDPOINT}"
    else
        aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/backups/${TIMESTAMP}/"
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Upload complete"
fi

# ── 清理过期备份 ──
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning backups older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup finished successfully"
