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

// ── 时间字段口径：显式钉住「读时区」 ──
// mysql2 默认按「Node 进程本地时区」解释 DB 里的 datetime 字面量，而这与 MySQL
// 会话 time_zone（写入端）是否一致**不会报错**：不一致时返回的时间字段会整体偏移
// 若干小时（典型是 8 小时），且日志里看不出任何异常。因此这里显式声明 timezone，
// 让口径不再依赖进程 TZ。
// 取值必须是固定偏移（`+08:00` / `-05:30` / `Z`），mysql2 不支持 IANA 名称。
// ⚠️ 必须与 MySQL 会话 time_zone 相同：docker-compose 里由 mysql 服务的 TZ 决定，
//    本地开发由 MySQL 实例的 time_zone 决定（默认 SYSTEM = 宿主时区）。
const DB_TIME_ZONE = process.env.DB_TIME_ZONE || "+08:00";

// 把 `+08:00` / `Z` / `local` 折算成小时偏移，用于启动自检
function resolveOffsetHours(tz) {
  const value = String(tz || "").trim();
  if (value === "" || value === "local") {
    return -new Date().getTimezoneOffset() / 60;
  }
  if (value === "Z" || value === "UTC") {
    return 0;
  }
  const matched = /^([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(value);
  if (!matched) {
    return null;
  }
  return (
    (matched[1] === "-" ? -1 : 1) *
    (Number(matched[2]) + Number(matched[3] || 0) / 60)
  );
}

// 创建连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  // 开发环境可读取 .env 中 DB_PASSWORD；生产环境禁止空密码
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "myblog",
  // 见文件头：与写入端（MySQL 会话 time_zone）保持一致的读时区
  timezone: DB_TIME_ZONE,
  waitForConnections: true,
  connectionLimit:
    process.env.NODE_ENV === "production"
      ? Number(process.env.DB_POOL_MAX) || 50
      : 10,
  queueLimit: 0,
  enableKeepAlive: true,
});

// 启动自检：DB_TIME_ZONE 与 MySQL 会话 time_zone 不一致时告警（而非静默偏移）
async function assertTimeZoneConsistency(connection) {
  try {
    const [[row]] = await connection.query(
      "SELECT NOW() AS now_at, UTC_TIMESTAMP() AS utc_at, " +
        "@@session.time_zone AS session_tz, @@global.time_zone AS global_tz",
    );
    // 推导：设 MySQL 会话偏移为 S、读时区偏移为 R，则两个值都被 mysql2 按 R 解析，
    // NOW() - UTC_TIMESTAMP() 恒等于 S（与 R 无关）。于是「读时区 == 写入端时区」
    // 等价于 diff == R；不等则说明两者错配，实际差值为 (S - R) 小时。
    const diffHours = (row.now_at.getTime() - row.utc_at.getTime()) / 3600000;
    const readOffsetHours =
      resolveOffsetHours(DB_TIME_ZONE) ?? -new Date().getTimezoneOffset() / 60;
    if (Math.abs(diffHours - readOffsetHours) > 1 / 60) {
      console.warn(
        `⚠️  时区不一致：DB_TIME_ZONE=${DB_TIME_ZONE}（读偏移 ${readOffsetHours}h），` +
          `但 MySQL 写入端偏移为 ${diffHours}h（time_zone=${row.session_tz}/${row.global_tz}）` +
          ` → 时间字段会整体偏移约 ${((diffHours - readOffsetHours) * 60).toFixed(0)} 分钟。` +
          `请把 DB_TIME_ZONE 改成与 MySQL 会话 time_zone 一致的固定偏移。`,
      );
    }
  } catch (err) {
    console.warn("⚠️  时区自检失败（已忽略）:", err.message);
  }
}

// 测试连接
pool
  .getConnection()
  .then(async (connection) => {
    console.log(
      `✅ 数据库连接成功（读时区 ${DB_TIME_ZONE}；时间字段输出 UTC 瞬时串）`,
    );
    await assertTimeZoneConsistency(connection);
    connection.release();
  })
  .catch((err) => {
    console.error("❌ 数据库连接失败:", err.message);
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  });

module.exports = pool;
