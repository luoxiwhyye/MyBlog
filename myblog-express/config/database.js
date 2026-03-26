const mysql = require("mysql2/promise");
require("dotenv").config();

// 创建连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "myblog",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});

// 测试连接
pool
  .getConnection()
  .then((connection) => {
    console.log("数据库连接成功");
    connection.release();
  })
  .catch((err) => {
    console.error("数据库连接失败:", err.message);
  });

module.exports = pool;
