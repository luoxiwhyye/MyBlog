/**
 * 文章内容格式迁移脚本
 *
 * 用途：
 *   1. 为 article 表新增 content_format 列（不存在则 ALTER）。
 *   2. 回填存量文章：按「是否含 Markdown 块级语法」判定并写入 content_format。
 *
 * 依赖项目 util/response 之外无特殊依赖，仅用 mysql2 连接池。
 * 运行方式：node scripts/addContentFormat.js
 *
 * 说明：
 *   - 判定逻辑与博客前台 utils/markdown.ts 的 looksLikeMarkdown 保持一致，
 *     保证迁移后渲染结果与旧「自动识别」行为一致。
 *   - 幂等：列已存在则跳过 ALTER；再次运行不会破坏已有 content_format。
 */

const pool = require("../config/database");

/** 复刻 frontend looksLikeMarkdown 的判定：内容是否含 Markdown 块级语法 */
const looksLikeMarkdown = (content) => {
  if (!content) return false;

  // 先剥离 HTML 标签（避免富文本 <p> 前缀干扰检测）
  const text = content.replace(/<[^>]+>/g, "");
  if (!text.trim()) return false;

  // 正向检测 Markdown 块级语法（标题/列表/引用/代码块/表格/分隔线/任务列表）
  return /(^|\n)\s{0,4}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|\|(?=.*\|)|---($|\n)|\[[ x]\]\s)/m.test(
    text,
  );
};

const up = async () => {
  const conn = await pool.getConnection();
  try {
    // 1. 确保列存在
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'article' AND COLUMN_NAME = 'content_format'`,
    );
    if (cols.length === 0) {
      console.log("[addContentFormat] 新增 article.content_format 列 ...");
      await conn.query(
        `ALTER TABLE article
         ADD COLUMN content_format varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT 'html'
         COMMENT '内容格式（html/markdown）' AFTER content`,
      );
    } else {
      console.log(
        "[addContentFormat] article.content_format 列已存在，跳过 ALTER",
      );
    }

    // 2. 回填未标记格式的存量文章（content_format IS NULL 或空）
    const [rows] = await conn.query(
      `SELECT id, content FROM article
       WHERE content_format IS NULL OR content_format = ''`,
    );

    if (rows.length === 0) {
      console.log("[addContentFormat] 无待回填文章，完成");
      return;
    }

    console.log(`[addContentFormat] 待回填文章数：${rows.length}`);

    for (const row of rows) {
      const format = looksLikeMarkdown(row.content) ? "markdown" : "html";
      await conn.query("UPDATE article SET content_format = ? WHERE id = ?", [
        format,
        row.id,
      ]);
    }

    console.log(`[addContentFormat] 回填完成，共处理 ${rows.length} 篇`);
  } finally {
    conn.release();
    await pool.end();
  }
};

up().catch((err) => {
  console.error("[addContentFormat] 迁移失败：", err);
  process.exit(1);
});
