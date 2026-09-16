/**
 * 邮件订阅开关迁移脚本
 *
 * 用途：
 *   1. comment.notify_email        tinyint(1) NOT NULL DEFAULT 0 —— 是否同意「有人回复我时邮件通知我」
 *   2. message_board.notify_email  tinyint(1) NOT NULL DEFAULT 0 —— 是否同意「留言通过审核后邮件通知我」
 *   3. comment.reply_to_id         int NULL                      —— 被回复的**具体**那条评论
 *
 * 为什么需要第 3 列（不在最初拟定的两列里）：
 *   评论是「两级扁平」结构 —— 回复一条二级评论时，parent_id 会被规整到其**顶层**父评论，
 *   因此仅凭 parent_id 无法知道「你回复的到底是谁」。而回复通知是**审核通过后**才发的，
 *   那时早已拿不到请求里的目标，只能靠落库。没有这一列，「回复表单」上的
 *   「有人回复我时，邮件通知我」永远不可能触发（= 虚假承诺）。
 *   → 语义：reply_to_id = 被回复的具体评论；为空时回退用 parent_id（兼容旧数据 / 旧客户端）。
 *
 * 运行方式：
 *   node scripts/addNotifyEmailColumns.js
 *   DRY_RUN=1 node scripts/addNotifyEmailColumns.js   # 只打印将要执行的语句，不写库
 *
 * 幂等：列 / 外键已存在则跳过；重复运行不改动任何数据。
 *
 * ⚠️ 存量数据不处理（默认 0 = 不接收），因此：
 *   - 存量评论者从此收不到「有人回复我」的邮件；
 *   - 存量留言者不会收到「留言通过审核」的邮件。
 *   这是「默认不接收」的必然结果，脚本结束前会打印受影响的存量条数供核对。
 *   需要给某一批存量开权限时，请自行 UPDATE 指定行，不要改默认值。
 */

const pool = require("../config/database");

const DRY_RUN = ["1", "true", "yes"].includes(
  String(process.env.DRY_RUN || "").toLowerCase(),
);

/** 目标列：[表名, 列名, DDL 片段, 列注释] */
const COLUMNS = [
  [
    "comment",
    "notify_email",
    "`notify_email` tinyint(1) NOT NULL DEFAULT 0",
    "是否同意在有回复时邮件通知（0=不接收，默认）",
  ],
  [
    "message_board",
    "notify_email",
    "`notify_email` tinyint(1) NOT NULL DEFAULT 0",
    "是否同意在审核通过时邮件通知（0=不接收，默认）",
  ],
  [
    "comment",
    "reply_to_id",
    "`reply_to_id` int NULL DEFAULT NULL",
    "被回复的具体评论ID（回复二级评论时才会与 parent_id 不同；只用于定位通知收件人）",
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

const constraintExists = async (conn, table, name) => {
  const [rows] = await conn.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [table, name],
  );
  return rows.length > 0;
};

const countRows = async (conn, table) => {
  const [rows] = await conn.query(`SELECT COUNT(*) AS count FROM ${table}`);
  return rows[0].count;
};

const countOptedIn = async (conn, table) => {
  const [[row]] = await conn.query(
    `SELECT COUNT(*) AS count FROM \`${table}\` WHERE notify_email = 1`,
  );
  return row.count;
};

const up = async () => {
  const conn = await pool.getConnection();
  try {
    console.log(
      `[addNotifyEmailColumns] 开始（${DRY_RUN ? "DRY_RUN：只打印不执行" : "实际执行"}）`,
    );

    for (const [table, column, ddl, comment] of COLUMNS) {
      if (await columnExists(conn, table, column)) {
        console.log(`[addNotifyEmailColumns] ${table}.${column} 已存在，跳过`);
        continue;
      }

      const stmt = `ALTER TABLE \`${table}\`\n  ADD COLUMN ${ddl} COMMENT '${comment}'`;
      if (DRY_RUN) {
        console.log(`[addNotifyEmailColumns] 将执行：\n${stmt};`);
      } else {
        console.log(`[addNotifyEmailColumns] 新增 ${table}.${column} ...`);
        await conn.query(stmt);
      }
    }

    // reply_to_id 的外键：ON DELETE SET NULL（目标被彻底删除时只丢「回复谁」的信息，
    // 不能像 parent_id 的 CASCADE 那样把回复者自己那条评论也删掉）
    const FK_NAME = "fk_comment_reply_to";
    if (await constraintExists(conn, "comment", FK_NAME)) {
      console.log(`[addNotifyEmailColumns] 外键 ${FK_NAME} 已存在，跳过`);
    } else {
      const fkStmt =
        `ALTER TABLE \`comment\`\n` +
        `  ADD CONSTRAINT \`${FK_NAME}\` FOREIGN KEY (\`reply_to_id\`)\n` +
        `  REFERENCES \`comment\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`;
      if (DRY_RUN) {
        console.log(`[addNotifyEmailColumns] 将执行：\n${fkStmt};`);
      } else {
        console.log(`[addNotifyEmailColumns] 新增外键 ${FK_NAME} ...`);
        await conn.query(fkStmt);
      }
    }

    // 存量影响面：新列默认 0，这些行此后都不会触发邮件
    for (const table of ["comment", "message_board"]) {
      const total = await countRows(conn, table);
      const optedIn = DRY_RUN ? 0 : await countOptedIn(conn, table);
      console.log(
        `[addNotifyEmailColumns] ${table}：共 ${total} 行，` +
          `其中已勾选接收通知 ${optedIn} 行` +
          `（其余 ${total - optedIn} 行按「不接收」处理，不再发邮件）`,
      );
    }

    console.log(
      `[addNotifyEmailColumns] 完成${DRY_RUN ? "（DRY_RUN，未写入任何改动）" : ""}`,
    );
  } finally {
    conn.release();
    await pool.end();
  }
};

up().catch((err) => {
  console.error("[addNotifyEmailColumns] 迁移失败：", err);
  process.exit(1);
});
