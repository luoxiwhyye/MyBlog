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

# ── 参数 ──
BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ]; then
    echo "用法: bash scripts/restore.sh <备份文件> [--yes]" >&2
    echo "示例: bash scripts/restore.sh ./backups/myblog_20260101_020000.sql.gz" >&2
    exit 1
fi

# ── 校验 ──
verify_backup "${BACKUP_FILE}"

# ── 确认 ──
if [ "${CONFIRM:-0}" != "1" ]; then
    echo ""
    echo "⚠️  即将把备份 ${BACKUP_FILE} 恢复到数据库 ${DB_NAME}@${DB_HOST}:${DB_PORT}" >&2
    echo "    这会覆盖当前 ${DB_NAME} 库的所有数据，操作不可逆！" >&2
    read -r -p "  请输入 YES 以确认恢复: " answer
    if [ "${answer}" != "YES" ]; then
        echo "已取消恢复操作。"
        exit 0
    fi
fi

# ── 恢复（解压后导入） ──
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始恢复数据库: ${DB_NAME}"
if gzip -dc "${BACKUP_FILE}" | mysql \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -p"${DB_PASSWORD}" \
    "${DB_NAME}"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 数据库恢复成功: ${DB_NAME}"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 恢复失败!" >&2
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 恢复完成。建议立即检查数据完整性。"
