# ============================================================
# O-03: 备份完整性校验脚本 — 校验指定备份或目录下全部备份
#
# 使用方式：
#   # 校验单个备份文件
#   bash scripts/verify-backup.sh ./backups/myblog_20260101_020000.sql.gz
#
#   # 校验目录下全部备份（逐个校验，任一失败即退出）
#   bash scripts/verify-backup.sh
# ============================================================

#!/bin/bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"

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

verify_one() {
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

    if ! gzip -t "${file}" 2>/dev/null; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: gzip 完整性校验失败: ${file}" >&2
        return 1
    fi

    local expected actual
    expected="$(awk '{print $1}' "${checksum}")"
    actual="$(calc_hash "${file}")"
    if [ "${expected}" != "${actual}" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: sha256 校验失败! ${file}" >&2
        echo "          expected=${expected}" >&2
        echo "          actual  =${actual}" >&2
        return 1
    fi

    echo "[$(date '+%Y-%m-%d %H:%M:%S')] VERIFY OK: ${file}"
    return 0
}

# ── 指定文件则校验该文件，否则校验目录下全部 ──
if [ -n "${1:-}" ]; then
    verify_one "$1"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 校验目录: ${BACKUP_DIR}"
    count=0
    for file in "${BACKUP_DIR}"/*.sql.gz; do
        [ -e "${file}" ] || continue
        verify_one "${file}"
        count=$((count + 1))
    done
    if [ "${count}" -eq 0 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 备份目录下无备份文件: ${BACKUP_DIR}" >&2
        exit 1
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 校验完成，共 ${count} 个备份"
fi
