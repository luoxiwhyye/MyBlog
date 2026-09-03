/**
 * 初始化博主账号 — 独立脚本入口
 *
 * 直接运行时调用 utils/initBlogger.js（唯一标准实现）。
 * 支持交互式输入账号密码：node scripts/initBlogger.js
 *
 * 用法：
 *   node scripts/initBlogger.js                # 交互式输入账号密码
 *   node scripts/initBlogger.js --yes          # 跳过交互，直接使用环境变量/默认值
 */
const readline = require("readline/promises");
const { stdin, stdout } = require("process");
const { initBlogger } = require("../utils/initBlogger");

/** 通过 readline 交互式收集账号信息 */
async function collectCredentials() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    console.log("📝 请输入初始管理员账号信息：");
    const username =
      (await rl.question("用户名（默认 admin）: ")).trim() || "admin";
    const nickname =
      (await rl.question("昵称（默认 博主）: ")).trim() || "博主";
    const email =
      (await rl.question("邮箱（默认 admin@blog.com）: ")).trim() ||
      "admin@blog.com";
    const password =
      (await rl.question("密码（默认 admin123）: ")).trim() || "admin123";
    return { username, nickname, email, password };
  } finally {
    rl.close();
  }
}

async function main() {
  let credentials = {};
  if (!process.argv.includes("--yes")) {
    credentials = await collectCredentials();
  }
  const initialized = await initBlogger(credentials);
  if (!initialized) {
    console.log("ℹ️ 博主已存在，无需重复初始化");
  }
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error("❌ 初始化失败:", err.message || err);
    process.exit(1);
  });
}

module.exports = initBlogger;
