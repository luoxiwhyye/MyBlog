# ============================================================
# O-03: 恢复演练脚本 —— 建临时库 → 恢复 → 逐表比对 → 删临时库
#
# 为什么需要：只校验 sha256 只能证明「文件没坏」，证明不了「能恢复出完整数据」；
# 而恢复演练是手工 5 步高危操作，必须定期重复做。高危 × 高频 × 手工 = 迟早出事，
# 其中最危险的一步是漏写 -e DB_NAME=<临时库>（备份里的 DROP TABLE 不带库名前缀，
# 会作用在当前连接的库上 → 直接清空生产库）。所以整条流程脚本化，只留一个入口。
#
# 使用方式（在 myblog-backup 容器里跑：它才有 mysql 客户端与挂在 /backups 的备份卷）：
#   docker compose exec myblog-backup bash /scripts/rehearse-restore.sh
#   docker compose exec myblog-backup bash /scripts/rehearse-restore.sh /backups/myblog_20260920_020000.sql.gz
#
# 退出码：0 = 演练通过（临时库已删）/ 1 = 演练失败（临时库同样会被删）
#
# 设计要点：
#   · 临时库名带时间戳（<生产库>_rehearse_YYYYMMDD_HHMMSS），撞名不可能
#   · trap EXIT / INT / TERM 一律删临时库 —— 报错或 Ctrl+C 都不留垃圾库
#   · 比对不写死表名列表，而是取 information_schema 里两库的表并集逐表 COUNT(*)，
#     将来加表自动覆盖（写死列表漏一张表就会给出假通过）
#   · 对生产库只做 SELECT COUNT(*)，不写一行
# ============================================================

#!/bin/bash
set -euo pipefail

# ── 配置 ──
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASSWORD="${DB_PASSWORD:-}"
# 生产库名：compose 给 myblog-backup 注入了 PROD_DB_NAME；没有则退回 DB_NAME
PROD_DB="${PROD_DB_NAME:-${DB_NAME:-myblog}}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
# restore.sh 与本脚本同目录（容器内是 /scripts）
RESTORE_SCRIPT="${RESTORE_SCRIPT:-$(dirname "$0")/restore.sh}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

fail() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
    exit 1
}

# 用 MYSQL_PWD 而不是 -p<密码>：后者会让每个 mysql 调用都往 stderr 吐一行
# 「Using a password on the command line interface can be insecure」，
# 每张表 4 次调用下来日志会被噪声淹没。
export MYSQL_PWD="${DB_PASSWORD}"

# 纯查询：-N 去表头、-B 制表符分隔（busybox / mariadb 客户端都支持）
mysql_sql() {
    mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -N -B "$@"
}

count_rows() {
    mysql_sql -e "SELECT COUNT(*) FROM \`$1\`.\`$2\`" || fail "COUNT(*) 失败: $1.$2"
}

# 判断某个表名是否在换行分隔的列表里
in_list() {
    printf '%s\n' "$1" | grep -Fxq -- "$2"
}

# ── 参数 ──
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    echo "用法: bash scripts/rehearse-restore.sh [备份文件]"
    echo ""
    echo "  不带参数：自动选 ${BACKUP_DIR} 里最新的 *.sql.gz"
    echo "  环境变量：DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME"
    echo "            PROD_DB_NAME（生产库名，默认取 DB_NAME）/ BACKUP_DIR"
    echo ""
    echo "退出码: 0 演练通过 / 1 演练失败"
    exit 0
fi

# ── 选定备份文件 ──
BACKUP_FILE="${1:-}"
if [ -z "${BACKUP_FILE}" ]; then
    BACKUP_FILE="$(ls -t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | head -1 || true)"
    [ -n "${BACKUP_FILE}" ] || fail "备份目录里没有 *.sql.gz: ${BACKUP_DIR}（先跑 backup.sh，或用参数指定备份文件）"
    log "未指定备份文件，自动选最近一份: ${BACKUP_FILE}"
fi
[ -f "${BACKUP_FILE}" ] || fail "备份文件不存在: ${BACKUP_FILE}"
[ -f "${BACKUP_FILE}.sha256" ] || fail "缺少校验和文件: ${BACKUP_FILE}.sha256（无法证明备份完整，演练不予进行）"
[ -f "${RESTORE_SCRIPT}" ] || fail "找不到 restore.sh: ${RESTORE_SCRIPT}（用 RESTORE_SCRIPT=<路径> 指定）"

TEMP_DB="${PROD_DB}_rehearse_$(date '+%Y%m%d_%H%M%S')"

# ── 无论正常结束、报错还是中断，都删临时库 ──
cleanup() {
    [ -n "${TEMP_DB}" ] || return 0
    if mysql_sql -e "DROP DATABASE IF EXISTS \`${TEMP_DB}\`" >/dev/null 2>&1; then
        log "已删除临时库 ${TEMP_DB}"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN: 临时库 ${TEMP_DB} 删除失败，请手工执行: DROP DATABASE \`${TEMP_DB}\`;" >&2
    fi
    return 0
}
trap cleanup EXIT
trap 'log "收到中断信号（Ctrl+C / kill），清理后退出"; exit 130' INT TERM

log "演练开始: 备份=$(basename "${BACKUP_FILE}")  生产库=${PROD_DB}  临时库=${TEMP_DB}"

# ── 建临时库（restore.sh 不会建库）──
mysql_sql -e "CREATE DATABASE \`${TEMP_DB}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" \
    || fail "创建临时库失败: ${TEMP_DB}"
log "已创建临时库 ${TEMP_DB}"

# ── 恢复到临时库（restore.sh 内部会先校验 sha256 + gzip）──
STARTED="$(date +%s)"
if ! DB_NAME="${TEMP_DB}" PROD_DB_NAME="${PROD_DB}" CONFIRM=1 bash "${RESTORE_SCRIPT}" "${BACKUP_FILE}"; then
    fail "恢复失败: restore.sh 返回非 0（临时库会被清理）"
fi
RESTORE_SECONDS="$(( $(date +%s) - STARTED ))"

# ── 逐表比对（表并集，不写死表名）──
PROD_TABLES="$(mysql_sql -e "SELECT table_name FROM information_schema.tables WHERE table_schema='${PROD_DB}' ORDER BY table_name")"
TEMP_TABLES="$(mysql_sql -e "SELECT table_name FROM information_schema.tables WHERE table_schema='${TEMP_DB}' ORDER BY table_name")"

PROD_TABLE_COUNT="$(printf '%s\n' "${PROD_TABLES}" | grep -c . || true)"
TEMP_TABLE_COUNT="$(printf '%s\n' "${TEMP_TABLES}" | grep -c . || true)"

echo ""
printf '  %-34s %10s %10s\n' "表" "生产库" "临时库"
printf '  %s\n' "---------------------------------------------------------------"

DIFFS=0
for table in $(printf '%s\n%s\n' "${PROD_TABLES}" "${TEMP_TABLES}" | sort -u); do
    [ -n "${table}" ] || continue
    if in_list "${PROD_TABLES}" "${table}"; then
        prod_count="$(count_rows "${PROD_DB}" "${table}")"
    else
        prod_count="缺失"
    fi
    if in_list "${TEMP_TABLES}" "${table}"; then
        temp_count="$(count_rows "${TEMP_DB}" "${table}")"
    else
        temp_count="缺失"
    fi
    if [ "${prod_count}" = "${temp_count}" ]; then
        printf '  %-34s %10s %10s   ok\n' "${table}" "${prod_count}" "${temp_count}"
    else
        printf '  %-34s %10s %10s   <= 不一致\n' "${table}" "${prod_count}" "${temp_count}"
        DIFFS="$((DIFFS + 1))"
    fi
done
echo ""

if [ "${PROD_TABLE_COUNT}" != "${TEMP_TABLE_COUNT}" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 表数不同: 生产库 ${PROD_TABLE_COUNT} / 临时库 ${TEMP_TABLE_COUNT}" >&2
    DIFFS="$((DIFFS + 1))"
fi

log "RTO 实测值: 恢复 + 建库耗时 ${RESTORE_SECONDS} 秒（不含比对）"

if [ "${DIFFS}" -gt 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: 演练失败: ${DIFFS} 处不一致（见上表）—— 备份不可用于灾难恢复，先查清原因" >&2
    exit 1
fi

log "演练通过: ${PROD_TABLE_COUNT} 张表、逐表行数与生产库一致"
exit 0
