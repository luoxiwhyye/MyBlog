const pool = require("./config/database");
const bloggerModel = require("./models/Blogger");
require("dotenv").config();

/**
 * 初始化数据库和默认账户
 */
async function initializeBlogger() {
  try {
    const username = process.env.BLOGGER_USERNAME || "admin";
    const password = process.env.BLOGGER_PASSWORD || "admin123";
    const email = process.env.BLOGGER_EMAIL || "admin@example.com";

    // 检查是否已存在博主账户
    const existingBlogger = await bloggerModel.getBloggerByUsername(username);

    if (existingBlogger) {
      console.log(`博主账户 '${username}' 已存在`);
      return;
    }

    // 创建默认博主账户
    const bloggerId = await bloggerModel.createBlogger({
      username,
      password,
      email,
    });

    console.log(`博主账户初始化成功! ID: ${bloggerId}`);
    console.log(`用户名: ${username}`);
    console.log(`邮箱: ${email}`);
  } catch (err) {
    console.error("博主账户初始化失败:", err);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeBlogger().then(() => {
    process.exit(0);
  });
}

module.exports = initializeBlogger;
