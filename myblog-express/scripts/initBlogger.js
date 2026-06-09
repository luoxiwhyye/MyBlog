/**
 * 初始化博主账号 — 独立脚本入口
 *
 * 直接运行时调用 utils/initBlogger.js（唯一标准实现）。
 * 用法：node scripts/initBlogger.js
 */
const { initBlogger } = require("../utils/initBlogger");

if (require.main === module) {
  initBlogger()
    .then((initialized) => {
      if (!initialized) {
        console.log("ℹ️ 博主已存在，无需重复初始化");
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ 初始化失败:", err.message || err);
      process.exit(1);
    });
}

module.exports = initBlogger;
