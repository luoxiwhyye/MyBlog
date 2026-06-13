/**
 * Express 缓存中间件
 *
 * 使用 Redis 缓存 GET 请求的 JSON 响应，同时设置 Cache-Control HTTP 头。
 * 写操作（POST/PUT/DELETE）自动清除相关缓存。
 *
 * 用法：
 *   router.get("/", cache("settings", 300), controller.getSettings);
 *   // 写操作中调用 cache.invalidate("settings") 清除缓存
 */

const { getRedis } = require("../config/redis");

const DEFAULT_TTL = 300; // 默认 5 分钟

/**
 * 生成缓存键
 */
const makeKey = (prefix, req) => {
  const qs = req.originalUrl?.split("?")[1] || "";
  return `cache:${prefix}${qs ? `:${qs}` : ""}`;
};

/**
 * 设置 Cache-Control 响应头
 * 使用 stale-while-revalidate 策略：浏览器缓存 + CDN 缓存 + 后台刷新
 */
const setCacheHeaders = (res, ttl) => {
  // max-age: 浏览器和 CDN 缓存时间
  // stale-while-revalidate: 缓存过期后仍可使用旧数据，同时后台异步刷新
  const stale = Math.max(ttl * 2, 600);
  res.set(
    "Cache-Control",
    `public, max-age=${ttl}, stale-while-revalidate=${stale}`,
  );
};

/**
 * 缓存中间件——缓存 GET 响应
 * @param {string} prefix  缓存前缀（如 "settings"）
 * @param {number} ttl    过期时间（秒），默认 300
 */
const cache = (prefix, ttl = DEFAULT_TTL) => {
  return async (req, res, next) => {
    // 仅缓存 GET 请求
    if (req.method !== "GET") return next();

    // 始终设置 Cache-Control 头（即使 Redis 不可用）
    setCacheHeaders(res, ttl);

    const client = getRedis();
    if (!client || client.status !== "ready") return next();

    const key = makeKey(prefix, req);

    try {
      const cached = await client.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        return res.status(parsed.code || 200).json(parsed);
      }

      // 拦截 res.json 来捕获响应并缓存
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // 仅缓存成功的响应
        if (res.statusCode >= 200 && res.statusCode < 300) {
          client.set(key, JSON.stringify(body), "EX", ttl).catch(() => {});
        }
        return originalJson(body);
      };

      next();
    } catch {
      // 缓存失败不影响正常响应
      next();
    }
  };
};

/**
 * 清除匹配前缀的所有缓存键
 * @param {string} pattern 缓存键模式（如 "cache:settings*"）
 */
cache.invalidate = async (pattern) => {
  const client = getRedis();
  if (!client || client.status !== "ready") return;

  try {
    const keys = await client.keys(`cache:${pattern}*`);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    console.error("缓存清除失败:", err.message);
  }
};

module.exports = cache;
