/**
 * Redis 客户端配置
 *
 * 基于 ioredis，提供连接池管理与优雅关闭。
 *
 * 环境变量：
 *   REDIS_URL  — 完整连接串（优先级最高，如 redis://user:pass@host:6379/0）
 *   REDIS_HOST — 主机（默认 127.0.0.1）
 *   REDIS_PORT — 端口（默认 6379）
 *   REDIS_PASSWORD — 密码（可选）
 *   REDIS_DB   — 数据库编号（默认 0）
 */

const Redis = require("ioredis");
require("dotenv").config();

let redis = null;

const getRedis = () => {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.warn("⚠️ Redis 重试次数已达上限，放弃连接");
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });
  } else {
    redis = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB) || 0,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.warn("⚠️ Redis 重试次数已达上限，放弃连接");
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });
  }

  redis.on("connect", () => {
    console.log("✅ Redis 连接成功");
  });

  redis.on("error", (err) => {
    console.error("❌ Redis 错误:", err.message);
  });

  return redis;
};

/**
 * 初始化 Redis 连接（在 server.js 中调用）
 */
const connectRedis = async () => {
  const client = getRedis();
  try {
    await client.connect();
    console.log("✅ Redis 已就绪");
  } catch (err) {
    console.warn("⚠️ Redis 连接失败，缓存功能将不可用:", err.message);
    // 不阻塞启动——缓存不可用时回退到数据库直查
  }
};

/**
 * 关闭 Redis 连接（优雅关闭时调用）
 */
const closeRedis = async () => {
  if (redis) {
    try {
      await redis.quit();
      console.log("✅ Redis 连接已关闭");
    } catch (err) {
      console.error("❌ 关闭 Redis 连接时出错:", err.message);
    }
  }
};

module.exports = { getRedis, connectRedis, closeRedis };
