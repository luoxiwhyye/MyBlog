/**
 * 标签 / 分类「名称唯一」迁移脚本
 *
 * 用途（幂等，可重复执行）：
 *   1. 去掉存入的标签名 / 分类名首尾空白（TRIM）。
 *   2. 合并存量重名：保留 id 最小的一条，把其余重复项的文章关联迁移过去后删除
 *      （否则加唯一索引会失败）。
 *   3. 给 `label.label_name` / `type.type_name` 加 UNIQUE 索引。
 *
 * 运行方式：
 *   node scripts/addUniqueNames.js           # 实际执行
 *   $env:DRY_RUN=1; node scripts/addUniqueNames.js   # 只预览，不改数据
 *
 * 说明：
 *   - 列 collation 为 utf8mb4_unicode_ci（PAD SPACE），故 `GROUP BY 列名` 天然把
 *     「大小写不同」「尾部空格不同」的名称视为同一组，无需额外统一大小写。
 *   - 合并顺序很重要：先复制关联 → 再删旧关联 → 最后删重复字典项，避免外键报错；
 *     `article_label` 上有 `uk_article_label(article_id, label_id)`，故复制用
 *     INSERT IGNORE，防止「同一文章同时挂了保留项与重复项」时撞唯一键。
 *   - 全新部署直接导入 myblog-1.1.sql 即可（建表已含唯一索引），无需本脚本。
 */

const pool = require("../config/database");

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

const indexExists = async (conn, table, index) => {
  const [rows] = await conn.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, index],
  );
  return rows.length > 0;
};

const countEmptyNames = async (conn, table, column) => {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n FROM \`${table}\` WHERE ${column} = '' OR ${column} IS NULL`,
  );
  return rows[0].n;
};

/** 找出重名分组（GROUP BY 走列 collation，大小写/尾空格不敏感） */
const findDuplicateGroups = async (conn, table, column) => {
  const [rows] = await conn.query(
    `SELECT ${column} AS name, COUNT(*) AS n, GROUP_CONCAT(id ORDER BY id) AS ids
     FROM \`${table}\`
     GROUP BY ${column}
     HAVING n > 1`,
  );
  return rows;
};

/** TRIM 首尾空白 */
const trimNames = async (conn, table, column) => {
  if (DRY_RUN) {
    const [rows] = await conn.query(
      `SELECT id, CONCAT('[', ${column}, ']') AS raw FROM \`${table}\`
       WHERE ${column} <> TRIM(${column})`,
    );
    if (rows.length) {
      console.log(
        `  [dry-run] ${table}.${column} 待 TRIM ${rows.length} 条:`,
        JSON.stringify(rows),
      );
    }
    return rows.length;
  }
  const [result] = await conn.query(
    `UPDATE \`${table}\` SET ${column} = TRIM(${column}) WHERE ${column} <> TRIM(${column})`,
  );
  return result.affectedRows;
};

/** 合并标签重名：保留 id 最小者，迁移 article_label 关联后删除其余 */
const mergeLabelDuplicates = async (conn) => {
  const groups = await findDuplicateGroups(conn, "label", "label_name");
  let removed = 0;

  for (const group of groups) {
    const ids = String(group.ids).split(",").map(Number);
    const keepId = Math.min(...ids);
    const dupIds = ids.filter((id) => id !== keepId);
    const name = String(group.name).trim();

    console.log(
      `  标签「${name}」重复 ${ids.length} 条（${ids.join(", ")}）→ 保留 id=${keepId}，删除 ${dupIds.join(", ")}`,
    );
    if (DRY_RUN) {
      removed += dupIds.length;
      continue;
    }

    // 1) 把重复标签的文章关联复制到保留标签（已存在则忽略）
    await conn.query(
      `INSERT IGNORE INTO article_label (article_id, label_id)
       SELECT article_id, ? FROM article_label WHERE label_id IN (?)`,
      [keepId, dupIds],
    );
    // 2) 删掉重复标签的关联
    await conn.query("DELETE FROM article_label WHERE label_id IN (?)", [
      dupIds,
    ]);
    // 3) 删除重复标签本身
    await conn.query("DELETE FROM label WHERE id IN (?)", [dupIds]);
    // 4) 保留项名称规范化为 TRIM 后的值
    await conn.query("UPDATE label SET label_name = ? WHERE id = ?", [
      name,
      keepId,
    ]);

    removed += dupIds.length;
  }

  return { groups: groups.length, removed };
};

/** 合并分类重名：保留 id 最小者，迁移 article.type_id 后删除其余 */
const mergeTypeDuplicates = async (conn) => {
  const groups = await findDuplicateGroups(conn, "type", "type_name");
  let removed = 0;

  for (const group of groups) {
    const ids = String(group.ids).split(",").map(Number);
    const keepId = Math.min(...ids);
    const dupIds = ids.filter((id) => id !== keepId);
    const name = String(group.name).trim();

    console.log(
      `  分类「${name}」重复 ${ids.length} 条（${ids.join(", ")}）→ 保留 id=${keepId}，删除 ${dupIds.join(", ")}`,
    );
    if (DRY_RUN) {
      removed += dupIds.length;
      continue;
    }

    // 先改文章归属（article.type_id NOT NULL + 外键），再删字典项
    await conn.query("UPDATE article SET type_id = ? WHERE type_id IN (?)", [
      keepId,
      dupIds,
    ]);
    await conn.query("DELETE FROM type WHERE id IN (?)", [dupIds]);
    await conn.query("UPDATE type SET type_name = ? WHERE id = ?", [
      name,
      keepId,
    ]);

    removed += dupIds.length;
  }

  return { groups: groups.length, removed };
};

const addUniqueIndex = async (conn, table, index, column) => {
  if (await indexExists(conn, table, index)) {
    console.log(`  ${table}.${index} 已存在，跳过`);
    return false;
  }
  if (DRY_RUN) {
    console.log(
      `  [dry-run] 将新增 UNIQUE INDEX ${index} ON ${table}(${column})`,
    );
    return true;
  }
  await conn.query(
    `ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${index}\`(\`${column}\` ASC) USING BTREE`,
  );
  console.log(`  ✅ 已新增 UNIQUE INDEX ${index} ON ${table}(${column})`);
  return true;
};

const up = async () => {
  const conn = await pool.getConnection();
  try {
    console.log(
      `[addUniqueNames] 开始${DRY_RUN ? "（dry-run，不改数据）" : ""}`,
    );

    // ── 1. TRIM ──
    console.log("步骤 1/4：规范化首尾空白");
    const labelTrimmed = await trimNames(conn, "label", "label_name");
    const typeTrimmed = await trimNames(conn, "type", "type_name");
    console.log(`  label 处理 ${labelTrimmed} 条，type 处理 ${typeTrimmed} 条`);

    // ── 2. 合并重名 ──
    console.log("步骤 2/4：合并存量重名");
    const labelMerge = await mergeLabelDuplicates(conn);
    const typeMerge = await mergeTypeDuplicates(conn);
    console.log(
      `  标签：${labelMerge.groups} 组重名，删除 ${labelMerge.removed} 条；` +
        `分类：${typeMerge.groups} 组重名，删除 ${typeMerge.removed} 条`,
    );

    // ── 3. 空名称检查（不阻断，仅提示）──
    console.log("步骤 3/4：空名称检查");
    const labelEmpty = await countEmptyNames(conn, "label", "label_name");
    const typeEmpty = await countEmptyNames(conn, "type", "type_name");
    if (labelEmpty > 1 || typeEmpty > 1) {
      console.warn(
        `  ⚠️ 存在多条空名称（label=${labelEmpty}, type=${typeEmpty}），唯一索引可能失败，请先手工清理`,
      );
    } else {
      console.log(
        `  label 空名称 ${labelEmpty} 条，type 空名称 ${typeEmpty} 条`,
      );
    }

    // ── 4. 加唯一索引 ──
    console.log("步骤 4/4：添加唯一索引");
    await addUniqueIndex(conn, "label", "uk_label_name", "label_name");
    await addUniqueIndex(conn, "type", "uk_type_name", "type_name");

    // 复核
    const labelLeft = await findDuplicateGroups(conn, "label", "label_name");
    const typeLeft = await findDuplicateGroups(conn, "type", "type_name");
    console.log(
      `[addUniqueNames] 完成，剩余重名：label=${labelLeft.length} 组，type=${typeLeft.length} 组${
        DRY_RUN ? "（dry-run 未落库）" : ""
      }`,
    );
  } finally {
    conn.release();
    await pool.end();
  }
};

up().catch((err) => {
  console.error("[addUniqueNames] 迁移失败：", err.message);
  process.exit(1);
});
