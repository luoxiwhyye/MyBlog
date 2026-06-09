const pool = require("../config/database");
const bloggerModel = require("../models/Blogger");
require("dotenv").config();

/**
 * 初始化博主账号
 * 检查博主表，如果没有博主则创建默认博主
 * @returns {Promise<boolean>} 是否执行了初始化
 */
async function initBlogger() {
  try {
    const username = process.env.BLOGGER_USERNAME || "admin";
    const password = process.env.BLOGGER_PASSWORD || "admin123";
    const nickname = process.env.BLOGGER_NICKNAME || "博主";
    const email = process.env.BLOGGER_EMAIL || "admin@blog.com";

    // 检查 blogger 表是否存在
    const [tables] = await pool.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'blogger'",
    );
    if (!tables || tables.length === 0) {
      const msg =
        "blogger 表不存在，请先执行数据库迁移脚本（myblog.sql / myblog-1.1.sql）。";
      console.error("❌ " + msg);
      throw new Error(msg);
    }

    // 确保 role / nickname 字段存在（兼容未升级的旧表结构）
    const [columns] = await pool.query("SHOW COLUMNS FROM blogger");
    const columnNames = columns.map((c) => c.Field);
    if (!columnNames.includes("role")) {
      console.log("🔧 添加 blogger.role 列...");
      await pool.query(
        "ALTER TABLE blogger ADD COLUMN role VARCHAR(50) DEFAULT 'admin' COMMENT '角色: admin'",
      );
    }
    if (!columnNames.includes("nickname")) {
      console.log("🔧 添加 blogger.nickname 列...");
      await pool.query(
        "ALTER TABLE blogger ADD COLUMN nickname VARCHAR(50) NOT NULL DEFAULT '' COMMENT '博主昵称（展示用）' AFTER username",
      );
    }

    const existingBlogger = await bloggerModel.getBloggerByUsername(username);
    if (existingBlogger) {
      console.log("✅ 博主账号已存在，跳过初始化");
      // 若旧数据 nickname 为空则补上默认值
      if (!existingBlogger.nickname) {
        await pool.query("UPDATE blogger SET nickname = ? WHERE id = ?", [
          nickname,
          existingBlogger.id,
        ]);
        console.log("📝 已为现有博主补充默认昵称");
      }
      return false;
    }

    console.log("📝 博主账号不存在，开始初始化...");

    let createdId;
    try {
      createdId = await bloggerModel.createBlogger({
        username,
        nickname,
        password,
        email,
      });
    } catch (createErr) {
      if (createErr.code === "ER_DUP_ENTRY") {
        console.log("✅ 博主账号已存在（并发冲突），跳过重复创建");
        return false;
      }
      throw createErr;
    }

    console.log("✅ 博主初始化成功");
    console.log("📝 账号信息:");
    console.log(`   用户名: ${username}`);
    console.log(`   昵  称: ${nickname}`);
    console.log(`   邮  箱: ${email}`);
    console.log(`   密  码: ${password}`);
    console.log("⚠️  请及时修改默认密码！");
    console.log(`ℹ️  博主ID: ${createdId}`);

    return true;
  } catch (err) {
    console.error("❌ 博主初始化失败:", err.message || err);
    throw err;
  }
}

module.exports = {
  initBlogger,
};
