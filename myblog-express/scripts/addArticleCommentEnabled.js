/**
 * 文章评论区开关迁移脚本
 *
 * 用途：
 *   article.comment_enabled  tinyint(1) NOT NULL DEFAULT 1 —— 该文章是否开放评论区
 *
 * 为什么默认 1（开放）：
 *   「下线评论区」是**例外**动作，默认必须是原来的行为 —— 存量文章、以及没带这个字段的
 *   旧客户端新建的文章，都应当继续能评论。若默认 0，迁移一跑全站评论区集体消失。
 *
 * 运行方式：
 *   node scripts/addArticleCommentEnabled.js
 *   DRY_RUN=1 node scripts/addArticleCommentEnabled.js   # 只打印将要执行的语句，不写库
 *
 * 幂等：列已存在则跳过；重复运行不改动任何数据。
 *
 * ⚠️ 两件事必须同时做，否则线上会出现「列加了但应用不认」：
 *   1. myblog-1.1.sql 里的建表语句同步了这一列（新库直接带列，不必再跑本脚本）；
 *   2. Express 与 Spring 的实体 / DTO / formatter / 更新白名单都接了这个字段。
 *      只加库列不改代码，档位永远写不进去。
 */

const pool = require("../config/database");

const DRY_RUN = ["1", "true", "yes"].includes(
  String(process.env.DRY_RUN || "").toLowerCase(),
);

/** 目标列：[表名, 列名, DDL 片段, 列注释] */
const COLUMNS = [
  [
    "article",
    "comment_enabled",
    "`comment_enabled` tinyint(1) NOT NULL DEFAULT 1",
    "是否开放评论区（0=下线）",
  ],
];

const columnExists = async (conn, table, column) => {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return rows.length > 0;
};

const countRows = async (conn, table) => {
  const [rows] = await conn.query(`SELECT COUNT(*) AS count FROM ${table}`);
  return rows[0].count;
};

const countDisabled = async (conn, table) => {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS count FROM \`${table}\` WHERE comment_enabled = 0`,
  );
  return row.count;
};

const up = async () => {
  const conn = await pool.getConnection();
  try {
    console.log(
      `[addArticleCommentEnabled] 开始（${DRY_RUN ? "DRY_RUN：只打印不执行" : "实际执行"}）`,
    );

    for (const [table, column, ddl, comment] of COLUMNS) {
      if (await columnExists(conn, table, column)) {
        console.log(
          `[addArticleCommentEnabled] ${table}.${column} 已存在，跳过`,
        );
        continue;
      }

      const stmt = `ALTER TABLE \`${table}\`\n  ADD COLUMN ${ddl} COMMENT '${comment}'`;
      if (DRY_RUN) {
        console.log(`[addArticleCommentEnabled] 将执行：\n${stmt};`);
      } else {
        console.log(`[addArticleCommentEnabled] 新增 ${table}.${column} ...`);
        await conn.query(stmt);
      }
    }

    // 存量影响面：新列默认 1，迁移后所有文章评论区保持开放（这正是期望结果）
    const total = await countRows(conn, "article");
    const disabled = DRY_RUN ? 0 : await countDisabled(conn, "article");
    console.log(
      `[addArticleCommentEnabled] article：共 ${total} 行，` +
        `其中已下线评论区 ${disabled} 行` +
        `（其余 ${total - disabled} 行评论区保持开放）`,
    );

    console.log(
      `[addArticleCommentEnabled] 完成${DRY_RUN ? "（DRY_RUN，未写入任何改动）" : ""}`,
    );
  } finally {
    conn.release();
    await pool.end();
  }
};

up().catch((err) => {
  console.error("[addArticleCommentEnabled] 迁移失败：", err);
  process.exit(1);
});
