#!/usr/bin/env node
/**
 * 上线后冒烟自检（smoke）—— 只读，不写任何数据
 *
 * 它检查的是「按部署方式真的跑起来了」这件事：反代链路、健康检查的每一个分块、
 * 关键公开接口、上传路由、权限矩阵、以及必须靠站点域名才能对的 SEO 元数据。
 *
 * 用法：
 *   node scripts/smoke.mjs --base=https://blog.example.com --admin=https://admin.example.com
 *   node scripts/smoke.mjs --base=http://127.0.0.1:3001          # 本机预览
 *   node scripts/smoke.mjs --base=... --allow-degraded           # 接受搜索降级为 SQL LIKE
 *   node scripts/smoke.mjs --base=... --require-mail             # 邮件未配置也视为阻断
 *
 * 退出码：0 = 全部通过 / 1 = 有阻断项 / 2 = 用法错误
 */

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      "用法: node scripts/smoke.mjs --base=<博客域名> [--admin=<后台域名>]",
      "",
      "  --base=<url>        博客前台地址（必填，健康检查也从它下面取）",
      "  --admin=<url>       管理后台地址（可选）",
      "  --allow-degraded    接受搜索降级 / 图片变体不可用（默认视为阻断）",
      "  --require-mail      邮件未配置也视为阻断（默认只是警告）",
      "",
      "退出码: 0 通过 / 1 有阻断项 / 2 用法错误",
    ].join("\n"),
  );
  process.exit(0);
}

const getArg = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3).replace(/\/+$/, "") : "";
};

const BASE = getArg("base");
const ADMIN = getArg("admin");
const ALLOW_DEGRADED = args.includes("--allow-degraded");
const REQUIRE_MAIL = args.includes("--require-mail");

if (!BASE) {
  console.error("用法错误：--base=<博客域名> 是必填项（--help 看说明）");
  process.exit(2);
}
const unknown = args.filter((a) => !a.startsWith("--"));
if (unknown.length > 0) {
  console.error(`用法错误：无法识别的参数 ${unknown.join(" ")}`);
  process.exit(2);
}

const TIMEOUT_MS = 10000;
const findings = [];
const add = (level, message, fix) =>
  findings.push({ level, message, fix: fix || "" });
const error = (m, f) => add("error", m, f);
const warn = (m, f) => add("warn", m, f);
const pass = (m) => add("ok", m);

const hostOf = (url) => {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
};

/** 取响应；网络错误不抛出，返回 { error } 让调用方统一处理 */
const probe = async (url, options = {}) => {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "myblog-smoke/1.0", ...(options.headers || {}) },
    });
    const text = await res.text().catch(() => "");
    return {
      status: res.status,
      headers: res.headers,
      text,
      ms: Date.now() - started,
    };
  } catch (err) {
    return { error: err?.message || String(err), ms: Date.now() - started };
  }
};

const expectStatus = async (
  label,
  url,
  expected,
  { fix = "", level = "error" } = {},
) => {
  const res = await probe(url, { redirect: "manual" });
  if (res.error) {
    add(level, `${label} 请求失败：${res.error}`, fix || `确认 ${url} 可达`);
    return null;
  }
  const list = Array.isArray(expected) ? expected : [expected];
  if (!list.includes(res.status)) {
    add(
      level,
      `${label} 状态码 ${res.status}（期望 ${list.join(" / ")}）`,
      fix,
    );
    return res;
  }
  pass(`${label} ${res.status}（${res.ms}ms）`);
  return res;
};

// ─────────────────────────────────────────────
// 1. 健康检查（反代链路 + 每个分块）
// ─────────────────────────────────────────────

console.log(`冒烟自检：${BASE}${ADMIN ? ` + ${ADMIN}` : ""}`);
console.log("=".repeat(70));

const healthRes = await probe(`${BASE}/health`);
let health = null;
if (healthRes.error) {
  error(
    `健康检查不可达：${healthRes.error}`,
    "先确认反代到后端 3000 的 /health 路由与后端进程都在",
  );
} else if (healthRes.status !== 200) {
  error(`健康检查返回 ${healthRes.status}`);
} else {
  try {
    health = JSON.parse(healthRes.text);
  } catch {
    error(
      "/health 返回的不是 JSON",
      "确认 /health 被反代到了 API 后端而不是博客前端",
    );
  }
}

/** Express 的 /health 是扁平结构 { status, db, redis, meili, mail, imageVariants }，
 *  Spring 侧把分块放在 data 里 —— 两种都兼容。 */
const block = (key) => {
  if (!health) return undefined;
  const source =
    health.data && typeof health.data === "object" ? health.data : health;
  return source[key];
};
const statusOf = (key) => {
  const value = block(key);
  if (value === undefined || value === null) return "missing";
  if (typeof value === "string") return value;
  return value.status ?? "missing";
};
const reasonOf = (key) => {
  const value = block(key);
  return typeof value === "object" && value ? (value.reason ?? "") : "";
};

if (health) {
  const top =
    health.status ?? (health.code === 0 ? "ok" : `code=${health.code ?? "?"}`);
  if (top === "ok") pass("/health 顶层 status = ok");
  else warn(`/health 顶层 status = ${top}`);

  for (const key of ["db", "redis"]) {
    const status = statusOf(key);
    if (status === "ok") pass(`${key} = ok`);
    else
      error(`${key} = ${status}${reasonOf(key) ? `（${reasonOf(key)}）` : ""}`);
  }

  const meili = statusOf("meili");
  if (meili === "ok") pass("meili = ok（搜索走搜索引擎，不是 SQL LIKE）");
  else if (ALLOW_DEGRADED)
    warn(
      `meili = ${meili}，已按 --allow-degraded 接受降级（搜索退化为 SQL LIKE）`,
    );
  else
    error(
      `meili = ${meili}${reasonOf("meili") ? `（${reasonOf("meili")}）` : ""}`,
      "无密钥 / 错密钥都不影响 /health 的 200，但索引操作会被 403 拒掉 → 搜索静默降级",
    );

  const variants = statusOf("imageVariants");
  if (variants === "ok") pass("imageVariants = ok（WebP 变体在生成）");
  else if (ALLOW_DEGRADED) warn(`imageVariants = ${variants}，已接受`);
  else
    error(
      `imageVariants = ${variants}${reasonOf("imageVariants") ? `（${reasonOf("imageVariants")}）` : ""}`,
      "缺 sharp（Express）/ webp-imageio（Spring）时缩略图 404，前端虽会回退原图但流量翻倍",
    );

  const mail = statusOf("mail");
  if (mail === "ok") pass("mail = ok");
  else if (REQUIRE_MAIL) error("mail = " + mail, "按 --require-mail 视为阻断");
  else
    warn(`mail = ${mail}（通知停用；后台「系统设置 · 邮件通知」能看到原因）`);
}

// ─────────────────────────────────────────────
// 2. HTTPS 与重定向
// ─────────────────────────────────────────────

if (BASE.startsWith("https://")) {
  if (healthRes.headers) {
    const hsts = healthRes.headers.get("strict-transport-security");
    if (hsts) pass(`HSTS 已下发（${hsts}）`);
    else
      warn(
        "未下发 HSTS 头",
        "在 Nginx 的 https server 块加 add_header Strict-Transport-Security",
      );
  }
  const httpUrl = BASE.replace(/^https:/, "http:");
  const redirectRes = await probe(httpUrl, { redirect: "manual" });
  if (redirectRes.error) {
    warn(
      `http 入口不可达（${redirectRes.error}）`,
      "确认 80 端口有 301 到 https 的 server 块",
    );
  } else if ([301, 302, 308].includes(redirectRes.status)) {
    pass(`http 自动跳转 https（${redirectRes.status}）`);
  } else {
    warn(`http 入口返回 ${redirectRes.status}，未跳转 https`);
  }
} else {
  warn(
    "当前用 http 检查（本地预览正常）；上线检查必须用 https 域名",
    "上线后重跑一次",
  );
}

// ─────────────────────────────────────────────
// 3. 公开接口
// ─────────────────────────────────────────────

const api = async (label, path, expected = [200]) =>
  expectStatus(label, `${BASE}${path}`, expected, {
    fix: "确认后端已启动且该路由已注册",
  });

const articlesRes = await probe(`${BASE}/api/v1/articles?page=1&pageSize=1`);
let firstArticleId = null;
if (articlesRes.error) {
  error(`GET /api/v1/articles 请求失败：${articlesRes.error}`);
} else if (articlesRes.status !== 200) {
  error(`GET /api/v1/articles 状态码 ${articlesRes.status}`);
} else {
  try {
    const body = JSON.parse(articlesRes.text);
    if (body.code !== 0) {
      error(`GET /api/v1/articles 业务码 ${body.code}（${body.message}）`);
    } else {
      const list = body.data?.list ?? body.data?.rows ?? body.data ?? [];
      const items = Array.isArray(list) ? list : (list.list ?? []);
      if (items.length > 0) {
        firstArticleId = items[0].id ?? null;
        pass(`GET /api/v1/articles 返回 ${items.length} 条`);
      } else {
        warn("文章列表为空：若是新站点属正常，先发一篇再重跑本脚本");
      }
    }
  } catch {
    error("GET /api/v1/articles 返回的不是 JSON");
  }
}

await api("GET /api/v1/types", "/api/v1/types");
await api("GET /api/v1/labels", "/api/v1/labels");
await api("GET /api/v1/settings", "/api/v1/settings");
await api("GET /api/v1/friend-links", "/api/v1/friend-links");
await api("GET /api/v1/message-board", "/api/v1/message-board");
if (firstArticleId) {
  await api(
    `GET /api/v1/articles/${firstArticleId}`,
    `/api/v1/articles/${firstArticleId}`,
  );
  await api(
    `GET /api/v1/comments?articleId=${firstArticleId}`,
    `/api/v1/comments?articleId=${firstArticleId}`,
  );
}

// ─────────────────────────────────────────────
// 4. 前台页面与 SEO
// ─────────────────────────────────────────────

const homeRes = await expectStatus("博客首页（SSR 直出）", `${BASE}/`, 200, {
  fix: "确认博客容器在跑且反代默认路由指向 3001",
});
if (homeRes && !homeRes.error) {
  if (homeRes.text.includes('id="__nuxt"'))
    pass("首页 HTML 含 Nuxt 根节点（SSR 正常）");
  else warn("首页 HTML 不含 #__nuxt，可能返回了错误页或纯静态回退");

  const ogImage = /property="og:image"\s+content="([^"]+)"/i.exec(homeRes.text);
  if (ogImage) {
    const ogHost = hostOf(ogImage[1]);
    if (!ogHost) warn(`og:image 不是绝对地址：${ogImage[1]}`);
    else if (ogHost !== hostOf(BASE))
      error(
        `og:image 指向 ${ogHost}，与站点域名（${hostOf(BASE)}）不同`,
        "分享卡片会指到后端域名：确认 APP_BASE_URL / NUXT_SITE_URL 用的是站点域名",
      );
    else pass(`og:image 使用站点域名（${ogHost}）`);
  } else {
    warn("首页没有 og:image 元数据");
  }

  const canonical = /rel="canonical"\s+href="([^"]+)"/i.exec(homeRes.text);
  if (
    canonical &&
    hostOf(canonical[1]) &&
    hostOf(canonical[1]) !== hostOf(BASE)
  ) {
    error(
      `canonical 指向 ${canonical[1]}，与站点域名不同`,
      "确认 NUXT_SITE_URL",
    );
  } else if (canonical) {
    pass("canonical 使用站点域名");
  }
}

await expectStatus("sitemap.xml", `${BASE}/sitemap.xml`, 200, {
  level: "warn",
  fix: "确认 routeRules 生成 sitemap，且反代没有拦掉 .xml",
});

const notFoundRes = await expectStatus(
  "上传目录（不存在的文件应为 404，不能列目录）",
  `${BASE}/uploads/__smoke_missing__.png`,
  404,
  { fix: "确认 /uploads/ 由后端静态服务处理且未开启目录索引" },
);
if (notFoundRes?.status === 403) {
  warn(
    "/uploads/ 对不存在的文件返回 403，可能被反代规则拦下",
    "确认 ^~ /uploads/ 的转发规则",
  );
}

// ─────────────────────────────────────────────
// 5. 权限矩阵（未登录不得可读的管理端接口）
// ─────────────────────────────────────────────

const guarded = [
  "/api/v1/articles/trash",
  "/api/v1/metrics",
  "/api/v1/error-log",
  "/api/v1/cache/stats",
];
for (const path of guarded) {
  const res = await probe(`${BASE}${path}`, { redirect: "manual" });
  if (res.error) {
    warn(
      `未登录访问 ${path} 请求失败：${res.error}`,
      "管理员口通常返回 401/403 而不是不可达",
    );
    continue;
  }
  if ([401, 403].includes(res.status)) {
    pass(`未登录访问 ${path} → ${res.status}（已保护）`);
  } else if (res.status === 200) {
    error(
      `未登录访问 ${path} 返回 200：该接口对匿名开放`,
      "历史上回收站曾因安全规则顺序对匿名开放；权限必须收紧",
    );
  } else {
    warn(`未登录访问 ${path} 返回 ${res.status}（期望 401/403）`);
  }
}

// ─────────────────────────────────────────────
// 6. 管理后台
// ─────────────────────────────────────────────

if (!ADMIN) {
  warn("未提供 --admin，跳过管理后台检查");
} else {
  const adminRes = await expectStatus("管理后台入口", `${ADMIN}/`, 200, {
    fix: "后台必须挂在独立域名的根路径（不能是 域名/admin 子路径）",
  });
  if (adminRes && !adminRes.error) {
    if (/\/assets\//.test(adminRes.text))
      pass("后台 index.html 引用 /assets/ 资源（base 未设子路径）");
    else warn("后台 index.html 未发现 /assets/ 引用，确认构建产物完整");

    const assetPath = /(?:src|href)="(\/assets\/[^"]+)"/.exec(adminRes.text);
    if (assetPath) {
      await expectStatus("后台静态资源", `${ADMIN}${assetPath[1]}`, 200, {
        fix: "资源 404 说明后台被挂到了子路径，或构建产物未打进镜像",
      });
    }
  }

  const adminGuard = await probe(`${ADMIN}/api/v1/blogger/profile`, {
    redirect: "manual",
  });
  if (adminGuard.error) {
    warn(
      `后台 /api 代理不可达（${adminGuard.error}）`,
      "确认 admin 域名的 location /api/ 已配置",
    );
  } else if ([401, 403].includes(adminGuard.status)) {
    pass(`后台域名下未登录访问 /api/v1/blogger/profile → ${adminGuard.status}`);
  } else {
    warn(
      `后台域名下未登录访问 /api/v1/blogger/profile 返回 ${adminGuard.status}`,
    );
  }
}

// ─────────────────────────────────────────────
// 输出
// ─────────────────────────────────────────────

const label = { error: "[error]", warn: "[warn ]", ok: "[ok   ]" };
const errors = findings.filter((f) => f.level === "error");
const warns = findings.filter((f) => f.level === "warn");

console.log("");
console.log("-".repeat(70));
for (const level of ["error", "warn", "ok"]) {
  for (const f of findings.filter((x) => x.level === level)) {
    console.log(`${label[f.level]} ${f.message}`);
    if (f.fix) console.log(`        → ${f.fix}`);
  }
}
console.log("-".repeat(70));
console.log(
  `合计：阻断 ${errors.length} 项 / 警告 ${warns.length} 项 / 通过 ${findings.filter((f) => f.level === "ok").length} 项`,
);
console.log(
  errors.length === 0
    ? "结论：冒烟通过。仍须人工走一遍「功能冒烟清单」（登录、写文章、上传、评论、收信）。"
    : "结论：存在阻断项，逐条处理后重跑。",
);
console.log("-".repeat(70));

// 只设置退出码、不调用 process.exit()：在 Windows 上，undici 的句柄回收期间强制退出会
// 触发断言失败（退出码变成 0xC0000409），让事件循环自然结束才能拿到干净的退出码。
process.exitCode = errors.length > 0 ? 1 : 0;
