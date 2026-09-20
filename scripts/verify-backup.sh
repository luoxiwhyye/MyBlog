# ============================================================
# O-03: 备份完整性校验脚本 — 校验指定备份或目录下全部备份
#
# 使用方式：
#   # 校验单个备份文件
#   bash scripts/verify-backup.sh ./backups/myblog_20260101_020000.sql.gz
#
#   # 校验目录下全部备份（逐个校验，任一失败即退出）
#   bash scripts/verify-backup.sh
#
# ⚠️ sha256 只能证明【文件没坏】，证明不了【里面有内容】：
#    全新站点的首次备份只有种子数据（实测 4.0K），有文章的备份是 36K ——
#    只看到 4.0K 很容易以为是坏了，而它其实是「空站点」的正常产物。
#    所以校验通过后会再打一份内容摘要（表数 + 关键表行数）。
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
    summarize "${file}"
    return 0
}

# ── 内容摘要 ──
# sha256 只能证明「文件没坏」，证明不了「里面有内容」：全新站点的首次备份只有种子
# 数据（实测 4.0K），有文章的是 36K —— 只看到 4.0K 很容易以为文件坏了，其实它是
# 「空站点」的正常产物。这里在完整性之后补一份内容摘要，让两类备份一眼可分。
#
# 计数口径（对着 mysqldump 的真实输出定的，不是想当然）：
#   · 表数 = `-- Table structure for table \`x\`` 的数量（连空表也计入）
#   · 行数 = `INSERT INTO \`x\` VALUES` 之后**以 ( 开头的行数**
#     mysqldump 默认是 extended insert：一条 INSERT 带多行元组，且**每个元组独占一行**，
#     所以「以 ( 开头的行」就是数据行数。若按「INSERT 语句条数」计数，3 行会被报成 1 行。
#     单行形式（`INSERT INTO \`x\` VALUES (...);` 同一行）作为兜底，按 1 行计。
# 只解压一次、一趟 awk 扫完（两次 grep 各扫一遍大归档会明显更慢）。
summarize() {
    local file="$1"
    local size_bytes size_human
    size_bytes="$(wc -c < "${file}" | tr -d ' ')"
    if [ "${size_bytes}" -ge 1048576 ]; then
        size_human="$((size_bytes / 1048576)) MB"
    elif [ "${size_bytes}" -ge 1024 ]; then
        size_human="$((size_bytes / 1024)) KB"
    else
        size_human="${size_bytes} B"
    fi

    local summary
    summary="$(gzip -dc "${file}" 2>/dev/null | awk '
        /^-- Table structure for table/ {
            match($0, /`[^`]+`/)
            if (RSTART > 0) {
                name = substr($0, RSTART + 1, RLENGTH - 2)
                if (!(name in declared)) { declared[name] = 1; ndeclared++ }
            }
            next
        }
        /^INSERT INTO/ {
            match($0, /`[^`]+`/)
            if (RSTART > 0) {
                name = substr($0, RSTART + 1, RLENGTH - 2)
                cur = name
                if (!(name in seen)) { seen[name] = 1; nseen++ }
                # 单行形式兜底：同一行里就带着数据
                rest = substr($0, RSTART + RLENGTH)
                if (index(rest, "(") > 0) rows[name]++
            }
            next
        }
        /^\(/ {
            if (cur != "") rows[cur]++
            next
        }
        END {
            printf "META %d %d\n", ndeclared + 0, nseen + 0
            for (n in declared) printf "ROW %s %d\n", n, rows[n] + 0
        }
    ')" || {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: 内容摘要读取失败（归档可能仍是坏的）: ${file}" >&2
        return 0
    }

    local total_tables tables_with_data article_rows
    total_tables="$(printf '%s\n' "${summary}" | awk '/^META /{print $2}')"
    tables_with_data="$(printf '%s\n' "${summary}" | awk '/^META /{print $3}')"
    article_rows="$(printf '%s\n' "${summary}" | awk '/^ROW article /{print $3}')"
    : "${total_tables:=0}" "${tables_with_data:=0}" "${article_rows:=0}"

    echo "        大小: ${size_human} / 表数: ${total_tables} / 含数据的表: ${tables_with_data} / article 行数: ${article_rows}"
    printf '%s\n' "${summary}" | awk '/^ROW / && $3 > 0 {printf "        %-24s %s 行\n", $2, $3}' | sort

    if [ "${article_rows}" -eq 0 ]; then
        echo "        [warn ] article 表无数据 —— 这是一份【空站点】备份。"
        echo "               恢复它只能得到一个没有文章的站点，灾难恢复时务必选最新那份。"
    fi
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
