/**
 * 缓存清理运维脚本
 *
 * 背景：缓存失效机制本身是完整的 —— 所有写接口（如 `PUT /settings/:key`）都会
 * `await cache.invalidate("...")`，Redis 层即时失效；后台「运维监控」页也能一键清空。
 * 缺口在于「绕过应用层之后的操作手段」：直接改库（例如排查时改 setting_value），
 * 或需要手动干预时，没有按前缀清理的 CLI 入口，只能现写临时脚本、用完即删。
 *
 * 本脚本补齐这个入口，并显式处理一个已知陷阱：
 *   `config/redis.js` 使用 `lazyConnect`，若不先建立连接，`keys` / `del` 会**静默
 *   no-op**（不报错、也没有删掉任何东西）。所以脚本会先确保连接就绪；连不上就明确
 *   报错退出，而不是打印「已清除 0 条」让人误以为已经清干净。
 *
 * 用法（在 myblog-express 目录执行）：
 *   node scripts/clearCache.js                    只列出全部 cache:* 键（默认不删）
 *   node scripts/clearCache.js --prefix=settings  按前缀清除（可重复传多个前缀）
 *   node scripts/clearCache.js --all              清除全部 cache:* 键
 *   node scripts/clearCache.js -h                 查看帮助
 *
 * 只预览不删除（与 addUniqueNames.js 的约定一致）：
 *   $env:DRY_RUN=1; node scripts/clearCache.js --prefix=settings
 *
 * 说明：
 *   - 缓存键形如 `cache:<前缀>[:<角色>][:<查询串>]`（见 `middleware/cache.js` 的
 *     `makeKey`），故按「第一个冒号前的片段」分组即可得到前缀。
 *   - 清除缓存是安全的：数据不会丢，只是下一次请求回源数据库重建。
 *   - **不改动缓存策略**（TTL 与失效时机均维持原样），本脚本只负责「手动清理」。
 */

require("dotenv").config();

const { getRedis, closeRedis } = require("../config/redis");

const KEY_PREFIX = "cache:";
const CONNECT_TIMEOUT_MS = 5000;
const DEL_CHUNK = 500;
/** 键数超过该值时只打印分组统计，避免刷屏 */
const FULL_LIST_LIMIT = 30;

/** 项目中实际使用的缓存前缀（来自各路由的 `cache("<prefix>", ttl)`） */
const KNOWN_PREFIXES = ["settings", "types", "labels", "friend-links"];

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

/** 前缀只允许字母、数字、下划线、连字符（拒绝 `*` `:` 空格等，防止误清全部） */
const VALID_PREFIX = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

const line = (char = "─", length = 64) => char.repeat(length);

const HELP = [
  "缓存清理运维脚本",
  "",
  "用法：",
  "  node scripts/clearCache.js                    只列出全部 cache:* 键（不删除）",
  "  node scripts/clearCache.js --prefix=settings  按前缀清除（可重复传多个）",
  "  node scripts/clearCache.js --all              清除全部 cache:* 键",
  "  node scripts/clearCache.js -h, --help         查看帮助",
  "",
  "只预览不删除：",
  "  $env:DRY_RUN=1; node scripts/clearCache.js --prefix=settings",
  "",
  `已知前缀：${KNOWN_PREFIXES.join(" / ")}`,
].join("\n");

/* ------------------------------------------------------------------ */
/* 参数解析                                                            */
/* ------------------------------------------------------------------ */

const parseArgs = (argv) => {
  const opts = { all: false, prefixes: [], help: false };

  for (const arg of argv) {
    if (arg === "--all") {
      opts.all = true;
    } else if (arg === "-h" || arg === "--help") {
      opts.help = true;
    } else if (arg.startsWith("--prefix=")) {
      // 宽容一点：允许写成 --prefix=cache:settings
      const value = arg
        .slice("--prefix=".length)
        .trim()
        .replace(/^cache:/, "");
      if (!value) {
        throw new Error("--prefix 不能为空");
      }
      if (!VALID_PREFIX.test(value)) {
        throw new Error(
          `非法的前缀「${value}」：只允许字母、数字、下划线、连字符（不接受通配符）`,
        );
      }
      opts.prefixes.push(value);
    } else {
      throw new Error(`未知参数「${arg}」`);
    }
  }

  if (opts.all && opts.prefixes.length > 0) {
    throw new Error("--all 与 --prefix 不能同时使用");
  }

  return opts;
};

/* ------------------------------------------------------------------ */
/* Redis 连接                                                          */
/* ------------------------------------------------------------------ */

/**
 * 确保 Redis 已就绪
 *
 * 这是本脚本的关键点：lazyConnect 下不先连接，后续 `keys` / `del` 会静默 no-op。
 */
const ensureRedisReady = async (client) => {
  if (client.status === "ready") return;

  // 懒连接状态：主动发起连接，失败时 connect() 会 reject
  if (client.status === "wait") {
    await client.connect();
    return;
  }

  // 已在连接 / 重连中：等 ready 事件，并加超时避免脚本永久挂起
  await new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      client.off("ready", onReady);
      client.off("end", onEnd);
    };
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onEnd = () => {
      cleanup();
      reject(new Error(`连接已关闭（当前状态：${client.status}）`));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`等待 Redis 就绪超时（当前状态：${client.status}）`));
    }, CONNECT_TIMEOUT_MS);

    client.once("ready", onReady);
    client.once("end", onEnd);
  });
};

const safeClose = async () => {
  try {
    await closeRedis();
  } catch {
    // 连接本就不存在时无需处理
  }
};

/* ------------------------------------------------------------------ */
/* 数据读取                                                            */
/* ------------------------------------------------------------------ */

/** 取出全部 cache:* 键（量级很小，用 KEYS 即可；与 middleware/cache.js 保持一致） */
const fetchCacheKeys = async (client) => {
  const keys = await client.keys(`${KEY_PREFIX}*`);
  return keys.sort();
};

/** 按「第一个冒号前的片段」分组得到前缀 */
const prefixOf = (key) => {
  const rest = key.slice(KEY_PREFIX.length);
  const colon = rest.indexOf(":");
  return colon === -1 ? rest : rest.slice(0, colon);
};

const groupByPrefix = (keys) => {
  const groups = new Map();
  for (const key of keys) {
    const prefix = prefixOf(key);
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(key);
  }
  return groups;
};

const filterByPrefixes = (keys, prefixes) => {
  const wanted = new Set(prefixes);
  return keys.filter((key) => wanted.has(prefixOf(key)));
};

/** 批量读取 TTL（用 pipeline，避免逐键往返） */
const readTtls = async (client, keys) => {
  if (keys.length === 0) return new Map();

  const pipeline = client.pipeline();
  for (const key of keys) pipeline.ttl(key);
  const results = await pipeline.exec();

  return new Map(keys.map((key, index) => [key, results[index]?.[1]]));
};

const formatTtl = (ttl) => {
  if (ttl === -1) return "无过期时间";
  if (ttl === -2) return "已不存在";
  if (typeof ttl !== "number") return "TTL 未知";
  return `剩余 ${ttl}s`;
};

/* ------------------------------------------------------------------ */
/* 输出                                                                */
/* ------------------------------------------------------------------ */

const describeTarget = (client) => {
  const { host = "127.0.0.1", port = 6379, db = 0 } = client.options || {};
  return `${host}:${port}（db ${db}）`;
};

/** 打印键列表；键数过多时退化为分组统计 */
const printKeys = async (client, keys) => {
  if (keys.length === 0) return;

  if (keys.length > FULL_LIST_LIMIT) {
    for (const [prefix, group] of groupByPrefix(keys)) {
      console.log(`  ${prefix}：${group.length} 个`);
    }
    console.log(`  （键数较多，仅显示分组统计；共 ${keys.length} 个）`);
    return;
  }

  // 列宽取「最长键 + 2」，保证键名再长也不会和 TTL 粘在一起
  const width = Math.max(...keys.map((key) => key.length + 2), 56);
  const ttls = await readTtls(client, keys);
  for (const [prefix, group] of groupByPrefix(keys)) {
    console.log("");
    console.log(`${prefix}（${group.length} 个）`);
    for (const key of group) {
      console.log(`  ${key}`.padEnd(width) + formatTtl(ttls.get(key)));
    }
  }
};

const printClearHint = () => {
  console.log("");
  console.log(line());
  console.log("清除方式：");
  console.log(
    "  node scripts/clearCache.js --prefix=settings   按前缀清除（可传多个）",
  );
  console.log("  node scripts/clearCache.js --all               清除全部");
  console.log("  在命令前加 DRY_RUN=1 则只预览、不删除");
};

/** 删除键，返回实际删除数量（分批，避免单次参数过多） */
const deleteKeys = async (client, keys) => {
  let deleted = 0;
  for (let i = 0; i < keys.length; i += DEL_CHUNK) {
    const chunk = keys.slice(i, i + DEL_CHUNK);
    deleted += await client.del(...chunk);
  }
  return deleted;
};

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

const main = async () => {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`参数错误：${err.message}`);
    console.error("用 -h 查看用法。");
    process.exitCode = 1;
    return;
  }

  if (opts.help) {
    console.log(HELP);
    return;
  }

  const client = getRedis();

  try {
    await ensureRedisReady(client);
  } catch (err) {
    console.error("");
    console.error(`✗ Redis 不可用，已中止：${err.message}`);
    console.error(
      "  → 确认 Redis 已启动，并核对 .env 中的 REDIS_URL / REDIS_HOST / REDIS_PORT",
    );
    console.error(
      "  → 这里刻意不静默跳过：lazyConnect 下未连接时 keys/del 会静默失效，",
    );
    console.error("     那样只会打印「已清除 0 条」，反而误导排查方向。");
    process.exitCode = 1;
    await safeClose();
    return;
  }

  const allKeys = await fetchCacheKeys(client);

  console.log(line("="));
  console.log("缓存清理（Redis）");
  console.log(line("="));
  console.log(`Redis 目标：${describeTarget(client)}`);
  console.log(`cache:* 键：${allKeys.length} 个`);

  /* ---- 默认模式：只列出 ---- */
  if (!opts.all && opts.prefixes.length === 0) {
    if (allKeys.length === 0) {
      console.log("");
      console.log(
        "当前没有任何 cache:* 键（缓存为空，或缓存功能未启用、TTL 内已自然过期）。",
      );
      await safeClose();
      return;
    }

    await printKeys(client, allKeys);

    console.log("");
    console.log(line());
    const groups = groupByPrefix(allKeys);
    console.log(
      `分组：${[...groups.entries()]
        .map(([prefix, group]) => `${prefix}(${group.length})`)
        .join("  ")}`,
    );
    printClearHint();

    await safeClose();
    return;
  }

  /* ---- 删除模式 ---- */
  const targets = opts.all ? allKeys : filterByPrefixes(allKeys, opts.prefixes);

  if (targets.length === 0) {
    const existing = [...groupByPrefix(allKeys).keys()];
    console.log("");
    if (opts.all) {
      console.log("没有任何 cache:* 键需要清除。");
    } else {
      console.log(`⚠ 前缀「${opts.prefixes.join(" / ")}」下没有缓存键。`);
      console.log(
        `  当前存在的键前缀：${existing.length ? existing.join(" / ") : "（无）"}`,
      );
      console.log(`  项目已知前缀：${KNOWN_PREFIXES.join(" / ")}`);
    }
    console.log("");
    console.log("未删除任何内容。");
    await safeClose();
    return;
  }

  const label = opts.all ? "全部" : opts.prefixes.join(" / ");
  const scopeGroups = groupByPrefix(targets);
  console.log("");
  console.log(
    `将清除：${label} → ${targets.length} 个键（${[...scopeGroups.entries()]
      .map(([prefix, group]) => `${prefix}×${group.length}`)
      .join("  ")}）`,
  );
  await printKeys(client, targets);

  if (DRY_RUN) {
    console.log("");
    console.log("DRY_RUN=1：仅预览，未实际删除。");
    await safeClose();
    return;
  }

  const deleted = await deleteKeys(client, targets);
  const remaining = (await fetchCacheKeys(client)).length;

  console.log("");
  console.log(line());
  console.log(`✓ 已清除 ${deleted} 条缓存（范围：${label}）`);
  console.log(`  剩余 cache:* 键：${remaining} 个`);

  await safeClose();
};

main().catch(async (err) => {
  console.error("缓存清理脚本执行失败:", err.message);
  process.exitCode = 1;
  await safeClose();
});
