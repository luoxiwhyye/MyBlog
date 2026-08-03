const mysql = require("mysql2/promise");
require("dotenv").config();

// ── 安全检查：生产环境不允许使用默认密码 ──
if (
  process.env.NODE_ENV === "production" &&
  (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === "root")
) {
  console.error(
    "❌ 安全错误：生产环境禁止使用默认数据库密码。请设置 DB_PASSWORD 环境变量。",
  );
  process.exit(1);
}

// 创建连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  // 开发环境可读取 .env 中 DB_PASSWORD；生产环境禁止空密码
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "myblog",
  waitForConnections: true,
  connectionLimit:
    process.env.NODE_ENV === "production"
      ? Number(process.env.DB_POOL_MAX) || 50
      : 10,
  queueLimit: 0,
  enableKeepAlive: true,
});

// 测试连接
pool
  .getConnection()
  .then((connection) => {
    console.log("✅ 数据库连接成功");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ 数据库连接失败:", err.message);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  });

module.exports = pool;
