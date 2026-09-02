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

// -------------------- 缓存统计（进程内） --------------------
const stats = {
  hits: 0,
  misses: 0,
  startedAt: new Date(),
};

const recordHit = () => {
  stats.hits += 1;
};

const recordMiss = () => {
  stats.misses += 1;
};

/**
 * 生成缓存键
 * @param {boolean} [byUser=false] 是否把用户角色纳入 key（用于同一 URL 但不同身份返回不同数据的接口）
 */
const makeKey = (prefix, req, byUser = false) => {
  const qs = req.originalUrl?.split("?")[1] || "";
  const role = byUser ? `:${req.user?.role || "anon"}` : "";
  return `cache:${prefix}${role}${qs ? `:${qs}` : ""}`;
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
 * @param {boolean} [byUser=false] 按用户角色区分缓存 key（同一 URL 但公开/管理员返回不同数据的接口用）
 */
const cache = (prefix, ttl = DEFAULT_TTL, byUser = false) => {
  return async (req, res, next) => {
    // 仅缓存 GET 请求
    if (req.method !== "GET") return next();

    // 始终设置 Cache-Control 头（即使 Redis 不可用）
    setCacheHeaders(res, ttl);

    const client = getRedis();
    if (!client || client.status !== "ready") {
      recordMiss();
      return next();
    }

    const key = makeKey(prefix, req, byUser);

    try {
      const cached = await client.get(key);
      if (cached) {
        recordHit();
        const parsed = JSON.parse(cached);
        return res.status(parsed.code || 200).json(parsed);
      }

      recordMiss();

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
    return keys.length;
  } catch (err) {
    console.error("缓存清除失败:", err.message);
    return 0;
  }
};

/**
 * 获取缓存统计信息
 */
cache.getStats = async () => {
  const client = getRedis();
  let keyCount = 0;

  if (client && client.status === "ready") {
    try {
      const keys = await client.keys("cache:*");
      keyCount = keys.length;
    } catch {
      keyCount = 0;
    }
  }

  const total = stats.hits + stats.misses;
  return {
    hits: stats.hits,
    misses: stats.misses,
    hitRate: total > 0 ? Number(((stats.hits / total) * 100).toFixed(2)) : 0,
    keyCount,
    startedAt: stats.startedAt,
  };
};

/**
 * 清除所有缓存（管理后台手动清空）
 */
cache.clearAll = async () => {
  const client = getRedis();
  if (!client || client.status !== "ready") return 0;

  try {
    const keys = await client.keys("cache:*");
    if (keys.length > 0) {
      await client.del(...keys);
    }
    return keys.length;
  } catch (err) {
    console.error("清空缓存失败:", err.message);
    return 0;
  }
};

/**
 * 缓存预热：预取热门路由，缓解首次访问慢的问题
 * @param {object} options { prefixes: string[], ttl: number }
 */
cache.preheat = async ({ prefixes = ["settings"], ttl = DEFAULT_TTL } = {}) => {
  const client = getRedis();
  if (!client || client.status !== "ready") return;

  const baseUrl = `http://127.0.0.1:${process.env.PORT || 3000}/api/v1`;

  for (const prefix of prefixes) {
    const url = `${baseUrl}/${prefix}`;
    try {
      // 使用全局 fetch（Node 18+）请求自身接口，命中缓存中间件完成预热
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (response.ok) {
        console.log(`[cache] 预热成功: GET ${url}`);
      } else {
        console.warn(`[cache] 预热跳过(${response.status}): GET ${url}`);
      }
    } catch (err) {
      console.warn(`[cache] 预热失败: ${url} - ${err.message}`);
    }
  }
};

module.exports = cache;
