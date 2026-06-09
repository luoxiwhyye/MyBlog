const app = require("./app");
const pool = require("./config/database");
const { initBlogger } = require("./utils/initBlogger");
const { assertSecret } = require("./config/jwt");
require("dotenv").config();

const PORT = process.env.PORT || 3000;

let server;
let initError = null;

const startServer = async () => {
  try {
    // P0: JWT Secret 安全检查
    assertSecret();

    console.log("✅ 数据库连接成功");

    await initBlogger();

    server = app.listen(PORT, () => {
      console.log(`✅ 服务器启动成功，端口: ${PORT}`);
    });
  } catch (err) {
    initError = err;
    console.error("❌ 初始化失败:", err.message);
    // 开发环境继续启动方便调试；生产环境应中止
    if (process.env.NODE_ENV === "production") {
      console.error("❌ 生产环境初始化失败，服务不启动。");
      process.exit(1);
    }
    server = app.listen(PORT, () => {
      console.log(`⚠️ 服务器以降级模式启动（初始化失败），端口: ${PORT}`);
    });
  }
};

startServer();

// 优雅关闭
const gracefulShutdown = async () => {
  console.log("准备关闭服务器...");

  server.close(async () => {
    console.log("HTTP 服务器已关闭");

    try {
      // 关闭数据库连接池
      await pool.end();
      console.log("数据库连接已关闭");
    } catch (err) {
      console.error("关闭数据库连接时出错:", err);
    }

    process.exit(0);
  });

  // 30秒后强制退出
  setTimeout(() => {
    console.error("无法正常关闭，强制退出");
    process.exit(1);
  }, 30000);
};

// 监听关闭信号
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// 处理未捕获的异常
process.on("uncaughtException", (err) => {
  console.error("未捕获的异常:", err);
  process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on("unhandledRejection", (reason, promise) => {
  console.error("未处理的 Promise 拒绝:", reason);
  process.exit(1);
});

module.exports = server;
