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
    const email = process.env.BLOGGER_EMAIL || "admin@blog.com";

    const existingBlogger = await bloggerModel.getBloggerByUsername(username);
    if (existingBlogger) {
      console.log("✅ 博主账号已存在，跳过初始化");
      return false;
    }

    console.log("📝 博主账号不存在，开始初始化...");

    let createdId;
    try {
      createdId = await bloggerModel.createBlogger({
        username,
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
    console.log(`📝 默认账号: ${username}`);
    console.log(`🔐 默认密码: ${password}`);
    console.log("⚠️  请及时修改默认密码！");
    console.log(`ℹ️ 博主ID: ${createdId}`);

    return true;
  } catch (err) {
    console.error("❌ 博主初始化失败:", err.message || err);
    return false;
  }
}

module.exports = {
  initBlogger,
};
