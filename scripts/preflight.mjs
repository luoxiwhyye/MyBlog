#!/usr/bin/env node
/**
 * 上线前配置自检（preflight）—— 只读，不改文件、不联网、不打印任何密钥值
 *
 * 它解决的是「最容易发生、且发生后不报错」的一类部署事故：
 *   docker-compose.yml 给每个环境变量都写了兜底默认值 → 漏配一项照样起得来、
 *   容器照样 healthy、页面照样能开，但功能是坏的或凭据是公开的。
 *
 * 用法（在仓库根执行）：
 *   node scripts/preflight.mjs                       # 读取 ./.env.docker
 *   node scripts/preflight.mjs --env-file=.env.docker
 *   node scripts/preflight.mjs --no-strict           # 有问题也只提示，退出码仍为 0
 *
 * 退出码：0 = 无阻断问题 / 1 = 检出阻断问题（或配置不可读）/ 2 = 用法错误
 * 只有 [error] 会阻断；[warn] 与 [info] 不阻断，但仍应逐条看过。
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

// ─────────────────────────────────────────────
// 参数与路径
// ─────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log(
    [
      "用法: node scripts/preflight.mjs [--env-file=<路径>] [--no-strict]",
      "",
      "  --env-file=<路径>  要自检的配置文件，默认 ./.env.docker",
      "  --no-strict        即使检出 [error] 也返回退出码 0（仅打印）",
      "",
      "退出码: 0 正常 / 1 检出阻断问题 / 2 用法错误",
    ].join("\n"),
  );
  process.exit(0);
}

const envFileArg = args.find((a) => a.startsWith("--env-file="));
const ENV_FILE = path.resolve(
  REPO_ROOT,
  envFileArg ? envFileArg.slice("--env-file=".length) : ".env.docker",
);
const STRICT = !args.includes("--no-strict");

const unknown = args.filter(
  (a) => !a.startsWith("--env-file=") && !a.startsWith("--"),
);
if (unknown.length > 0) {
  console.error(`用法错误：无法识别的参数 ${unknown.join(" ")}`);
  process.exit(2);
}

// ─────────────────────────────────────────────
// 结果收集
// ─────────────────────────────────────────────

const findings = [];
const add = (level, message, fix) =>
  findings.push({ level, message, fix: fix || "" });
const error = (m, f) => add("error", m, f);
const warn = (m, f) => add("warn", m, f);
const info = (m, f) => add("info", m, f);
const ok = (m) => add("ok", m);

// ─────────────────────────────────────────────
// 读取 .env 文件
// ─────────────────────────────────────────────

const parseEnvFile = (file) => {
  const out = {};
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // 去掉成对引号（模板里写得较少，但手改时常见）
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
};

if (!fs.existsSync(ENV_FILE)) {
  error(
    `找不到配置文件：${ENV_FILE}`,
    "先复制模板：cp .env.docker.example .env.docker，再按注释逐项填写",
  );
  report();
}

const env = parseEnvFile(ENV_FILE);
const get = (key) => (env[key] ?? "").trim();
const set = (key) => get(key) !== "";

// 未替换的占位符（形如 __DB_PASSWORD__）必须当成「没填」：否则它的长度、非空都能骗过下面
// 每一项检查，最后得到一个「全部通过」的假结论。
const PLACEHOLDER = /^__[A-Z0-9_]+__$/;
const placeholders = Object.entries(env)
  .filter(([, v]) => PLACEHOLDER.test((v ?? "").trim()))
  .map(([k]) => k);
if (placeholders.length > 0) {
  error(
    `以下配置项仍是未替换的占位符：${placeholders.join(" / ")}`,
    "用 .env.docker 顶部注释里给的两条命令替换（密钥在本地生成，不必经过任何第三方）",
  );
}
/** 判断某项是否「有效配置」：非空且不是占位符 */
const filled = (key) => {
  const value = get(key);
  return value !== "" && !PLACEHOLDER.test(value);
};

// ─────────────────────────────────────────────
// 复用运行时实现的判定规则（避免两套口径）
// ─────────────────────────────────────────────

/**
 * mailer.js 的 undeliverableSiteUrlReason / undeliverableReason 是「站点地址 / 收件人能否送达」
 * 的唯一实现（且与 Spring 侧逐项对齐）→ 这里直接复用，不要在自检脚本里另写一套。
 * 该模块的 nodemailer 是在函数内部懒加载的，因此未安装依赖时也能安全导入。
 */
let mailboxRules = null;
try {
  const mailerPath = path.join(
    REPO_ROOT,
    "myblog-express",
    "services",
    "mailer.js",
  );
  const mod = await import(pathToFileURL(mailerPath).href);
  const resolved = mod?.undeliverableSiteUrlReason
    ? mod
    : (mod?.default ?? null);
  if (resolved?.undeliverableSiteUrlReason) mailboxRules = resolved;
} catch {
  mailboxRules = null;
}
if (!mailboxRules) {
  warn(
    "未能加载 myblog-express/services/mailer.js，SITE_URL 与收件人邮箱只做形状检查",
    "在 myblog-express 目录跑一次 npm ci 后再执行本脚本，可获得完整判定",
  );
}

// ─────────────────────────────────────────────
// 1. 密钥
// ─────────────────────────────────────────────

/** 与本文件同源的「一定不能上线」的值（模板值 + compose 兜底值） */
const FORBIDDEN_SECRETS = {
  JWT_SECRET: [
    "change-me-to-a-random-string-at-least-32-chars",
    "change-me-in-production",
    "your-jwt-secret-change-me",
    "secret",
  ],
  DB_PASSWORD: ["your-strong-password-here", "root", "password", "123456"],
  MEILI_MASTER_KEY: [
    "meili-master-key-change-me",
    "your-meili-key",
    "masterKey",
  ],
  BLOGGER_PASSWORD: [
    "admin123",
    "your-strong-password-here",
    "your-password",
    "password",
  ],
};

const checkSecret = (key, { minLength, why }) => {
  const value = get(key);
  if (!filled(key)) {
    // 占位符已由上面的总检查报过，这里不重复报同一件事
    if (!PLACEHOLDER.test(value)) {
      error(
        `${key} 未配置${why ? `（${why}）` : ""}`,
        `${key} 留空时 docker-compose.yml 会采用兜底默认值，必须显式填一个随机值`,
      );
    }
    return;
  }
  if (FORBIDDEN_SECRETS[key].includes(value)) {
    error(
      `${key} 仍是模板 / 兜底默认值${why ? `（${why}）` : ""}`,
      "生成随机值：openssl rand -hex 32（每个密钥各跑一次，三个密钥不要相同）",
    );
    return;
  }
  if (/^(.)\1+$/.test(value) || value.length < minLength) {
    error(
      `${key} 强度不足（长度 ${value.length}，要求至少 ${minLength}）`,
      "生成随机值：openssl rand -hex 32",
    );
    return;
  }
  ok(`${key} 已自定义（长度 ${value.length}）`);
};

checkSecret("JWT_SECRET", {
  minLength: 32,
  why: "默认值写在本公开仓库里，等同于任何人都能签发管理员 token",
});
checkSecret("DB_PASSWORD", {
  minLength: 12,
  why: "MySQL root 口令",
});
checkSecret("MEILI_MASTER_KEY", {
  minLength: 16,
  why: "搜索索引的读写密钥",
});
checkSecret("BLOGGER_PASSWORD", {
  minLength: 12,
  why: "本次是空库首启，博主账号会按这里的值创建",
});

// 密码里出现 shell 特殊字符会让 .env.docker 的解析出问题（典型表现：mysql 一直不 healthy）
for (const key of ["DB_PASSWORD", "JWT_SECRET", "MEILI_MASTER_KEY"]) {
  const value = get(key);
  if (/[$&#]/.test(value)) {
    warn(
      `${key} 含有 $ & # 之一，可能在 .env.docker 的 shell 解析中被特殊处理`,
      "换一组只含字母数字与 - _ 的随机值",
    );
  }
}

// 配置文件本身不能被 git 跟踪（`*.example` 模板是仓库资产，跳过这项）
if (path.basename(ENV_FILE).endsWith(".example")) {
  info(`${path.basename(ENV_FILE)} 是模板文件，跳过「是否被 git 跟踪」检查`);
} else {
  try {
    const tracked = execFileSync(
      "git",
      ["ls-files", "--error-unmatch", path.basename(ENV_FILE)],
      {
        cwd: path.dirname(ENV_FILE),
        stdio: ["ignore", "pipe", "ignore"],
      },
    )
      .toString()
      .trim();
    if (tracked) {
      error(
        `${path.basename(ENV_FILE)} 已被 git 跟踪，密钥会随仓库一起泄露`,
        "git rm --cached <文件>，并确认 .gitignore 里的 .env.* 规则生效",
      );
    } else {
      ok(`${path.basename(ENV_FILE)} 未被 git 跟踪`);
    }
  } catch {
    ok(`${path.basename(ENV_FILE)} 未被 git 跟踪`);
  }
}

// ─────────────────────────────────────────────
// 2. 地址类（配错的表现全是「页面能开、功能静默坏」）
// ─────────────────────────────────────────────

const CONTAINER_HOSTS = ["myblog-backend", "backend", "admin", "blog", "mysql"];

const hostOf = (url) => {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return "";
  }
};
const isHttpUrl = (v) => /^https?:\/\//i.test(v);
const isLoopbackish = (v) =>
  /(^|\/\/)(localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(v);

// 2.1 VITE_API_BASE —— 浏览器直连（构建期注入）
{
  const value = get("VITE_API_BASE");
  if (!filled("VITE_API_BASE")) {
    if (!PLACEHOLDER.test(value)) {
      error(
        "VITE_API_BASE 未配置（后台的浏览器直连地址）",
        "反向代理同源部署填 /api/v1；不填会落到 compose 兜底的容器服务名，浏览器解析不了",
      );
    }
  } else if (CONTAINER_HOSTS.some((h) => value.includes(h))) {
    error(
      "VITE_API_BASE 含容器服务名，浏览器无法解析（表现为「后台能开页面，一登录就转圈」）",
      "反向代理同源部署填 /api/v1；IP 直连填 http://<服务器IP>:3000/api/v1",
    );
  } else if (!value.startsWith("/") && !isHttpUrl(value)) {
    error(
      "VITE_API_BASE 既不是同源相对路径（/api/v1）也不是完整 http(s) 地址",
      "改完必须重新构建：docker compose --env-file .env.docker build myblog-admin",
    );
  } else {
    ok(`VITE_API_BASE 形状正确（${value}）`);
  }
}

// 2.2 APP_BASE_URL —— 入库图片的绝对地址前缀
{
  const value = get("APP_BASE_URL");
  if (!filled("APP_BASE_URL")) {
    if (!PLACEHOLDER.test(value)) {
      error(
        "APP_BASE_URL 未配置，新上传的图片会以 http://localhost:3000/uploads/... 入库",
        "后台把库里的地址直接绑到 <img src>，会表现为封面 / 头像 / 表情全部裂掉；填站点域名",
      );
    }
  } else if (!isHttpUrl(value)) {
    error(
      "APP_BASE_URL 必须是带协议的完整地址",
      "例如 https://blog.example.com（不要带路径与结尾斜杠）",
    );
  } else if (isLoopbackish(value)) {
    error(
      "APP_BASE_URL 指向本机 / 回环地址，访客与后台都取不到图",
      "填站点域名，例如 https://blog.example.com",
    );
  } else {
    if (!value.startsWith("https://")) {
      warn(
        "APP_BASE_URL 用的是 http://，浏览器可能拦截混合内容（页面 https + 图片 http）",
      );
    }
    const site = get("SITE_URL");
    if (site && isHttpUrl(site) && hostOf(site) !== hostOf(value)) {
      warn(
        `APP_BASE_URL 的域名（${hostOf(value)}）与 SITE_URL 的域名（${hostOf(site)}）不同`,
        "两者通常都应是博客站点域名；不同的话要确认两台都能取到 /uploads/**",
      );
    }
    ok(`APP_BASE_URL 形状正确（${value}）`);
  }
}

// 2.3 SITE_URL —— 邮件里链接的前缀（收信人视角）
{
  const value = get("SITE_URL");
  if (!filled("SITE_URL")) {
    if (!PLACEHOLDER.test(value)) {
      error(
        "SITE_URL 未配置：邮件里的链接会渲染成 /article/1，收信人点开是空页",
      );
    }
  } else if (mailboxRules) {
    const reason = mailboxRules.undeliverableSiteUrlReason(value);
    if (reason) {
      error(`SITE_URL 不可用：${reason}`, "必须是收信人在公网能打开的地址");
    } else {
      ok(`SITE_URL 可用（${value}）`);
    }
  } else if (isLoopbackish(value) || !isHttpUrl(value)) {
    error(
      `SITE_URL 形状可疑（${value}）：本机 / 内网 / 非 http(s) 地址收信人打不开`,
      "填站点域名",
    );
  }
}

// 2.4 CORS 白名单 —— 必须与页面实际 origin 逐字一致
{
  const frontend = get("FRONTEND_ORIGIN");
  const admin = get("ADMIN_ORIGIN");
  const origins = [
    ["FRONTEND_ORIGIN", frontend],
    ["ADMIN_ORIGIN", admin],
  ];
  for (const [key, value] of origins) {
    if (!filled(key)) {
      if (!PLACEHOLDER.test(value)) {
        error(
          `${key} 未配置：CORS 白名单为空时，前端请求会被整体拦下`,
          "填页面实际 origin，含协议与端口，末尾不要带斜杠",
        );
      }
      continue;
    }
    if (!isHttpUrl(value)) {
      error(`${key} 必须是带协议的完整 origin（如 https://blog.example.com）`);
      continue;
    }
    if (value.endsWith("/")) {
      error(`${key} 末尾多了斜杠，与浏览器发送的 Origin 头不相等`);
      continue;
    }
    if (isLoopbackish(value)) {
      error(
        `${key} 仍是本机地址，线上页面（真域名）的 Origin 与它不匹配 → 接口全被 CORS 拦`,
        "改成真域名",
      );
      continue;
    }
    if (!value.startsWith("https://")) {
      warn(
        `${key} 用的是 http://，上线应为 https（后台登录 token 走明文可被窃取）`,
      );
    }
    ok(`${key} 已配置（${value}）`);
  }
  if (frontend && admin && frontend === admin) {
    error(
      "FRONTEND_ORIGIN 与 ADMIN_ORIGIN 相同：后台不能挂在博客域名的子路径",
      "后台必须独立域名（它的构建未设 Vite base，资源路径是 /assets/**）",
    );
  }
  if (admin && /\/admin\/?$/i.test(admin)) {
    error(
      "ADMIN_ORIGIN 指向了 /admin 子路径：后台必须挂在域名根",
      "表现为页面空白 + 静态资源 404；改建成 admin.example.com 这种独立域名",
    );
  }
}

// 2.5 NUXT_* —— 容器内调用与站点公开地址
{
  const api = get("NUXT_API_BASE");
  if (api && !CONTAINER_HOSTS.some((h) => api.includes(h))) {
    warn(
      `NUXT_API_BASE 不是容器内服务名（当前 ${api}）`,
      "博客容器自带 /api/v1 代理，填容器服务名即可；填公网域名只是多绕一圈",
    );
  }
  const nuxtSite = get("NUXT_SITE_URL");
  const site = get("SITE_URL");
  if (nuxtSite && site && nuxtSite !== site) {
    warn(
      `NUXT_SITE_URL（${nuxtSite}）与 SITE_URL（${site}）不一致`,
      "两者通常都应是博客站点域名；不一致会让 canonical / sitemap 与邮件链接指向不同域名",
    );
  }
}

// ─────────────────────────────────────────────
// 3. 时区四项同区
// ─────────────────────────────────────────────

/** IANA 名称 → 当前偏移分钟数；不支持或不识别时返回 null */
const tzOffsetMinutes = (tz) => {
  if (!tz) return null;
  // 固定偏移写法（compose 里允许，但 IANA 名称更稳）
  const fixed = /^([+-])(\d{1,2}):?(\d{2})$/.exec(tz);
  if (fixed) {
    const sign = fixed[1] === "-" ? -1 : 1;
    return sign * (Number(fixed[2]) * 60 + Number(fixed[3]));
  }
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    if (name === "GMT" || name === "UTC") return 0;
    const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(name);
    if (!m) return null;
    const sign = m[1] === "-" ? -1 : 1;
    return sign * (Number(m[2]) * 60 + Number(m[3] || 0));
  } catch {
    return null;
  }
};

const fmtOffset = (minutes) => {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
};

{
  const tz = get("TZ") || "Asia/Shanghai";
  const dbTz = get("DB_TIME_ZONE");
  const appTz = get("APP_TIME_ZONE");

  const tzOffset = tzOffsetMinutes(tz);
  const dbOffset = tzOffsetMinutes(dbTz);

  if (tzOffset === null) {
    error(`TZ 无法识别（${tz}）`, "用 IANA 名称，如 Asia/Shanghai");
  } else if (!dbTz) {
    error(
      "DB_TIME_ZONE 未配置（Express 的时间字段读时区）",
      "必须与 TZ 表示同一时区，固定偏移写法，如 +08:00（mysql2 不支持 IANA 名称）",
    );
  } else if (dbOffset === null) {
    error(`DB_TIME_ZONE 无法识别（${dbTz}）`, "固定偏移写法，如 +08:00 或 Z");
  } else if (dbOffset !== tzOffset) {
    error(
      `时区不同区：TZ=${tz}（${fmtOffset(tzOffset)}）而 DB_TIME_ZONE=${dbTz}（${fmtOffset(dbOffset)}）`,
      "不一致不会报错，只会让全部时间字段整体偏移；改成一致后重启后端",
    );
  } else {
    ok(`TZ 与 DB_TIME_ZONE 同区（${fmtOffset(tzOffset)}）`);
  }

  if (!appTz) {
    warn(
      "APP_TIME_ZONE 未配置（仅 Spring 后端使用；当前部署用 Express 可忽略）",
    );
  } else if (tzOffset !== null && tzOffsetMinutes(appTz) !== tzOffset) {
    error(
      `APP_TIME_ZONE（${appTz}）与 TZ（${tz}）不同区（仅 Spring 后端使用）`,
      "切到 Spring 后端前必须改一致",
    );
  } else {
    ok("APP_TIME_ZONE 与 TZ 同区");
  }

  info(
    "时区还依赖 compose 里 mysql 服务的 TZ 与前台 myblog-blog 服务的 TZ，它们都取同一个 TZ 变量",
  );
}

// ─────────────────────────────────────────────
// 4. 反向代理
// ─────────────────────────────────────────────

{
  const value = get("TRUST_PROXY");
  if (value === "") {
    error(
      "TRUST_PROXY 未配置",
      "Nginx 一跳反代填 1；填 0 会让所有访客共用一个限流桶（正常浏览被 429）",
    );
  } else if (!/^\d+$/.test(value)) {
    error(`TRUST_PROXY 必须是整数（当前 ${value}）`, "反代一跳填 1");
  } else if (Number(value) === 0) {
    error(
      "TRUST_PROXY=0：不信任转发头，限流会把所有访客当成同一个 IP",
      "经 Nginx 反代应填 1",
    );
  } else if (Number(value) > 2) {
    warn(
      `TRUST_PROXY=${value} 信任跳数偏多`,
      "只有在真实链路有这么多层代理时才这么填，否则可伪造 X-Forwarded-For 换桶绕过限流",
    );
  } else {
    ok(`TRUST_PROXY=${value}（与单层反代一致）`);
  }

  const bind = get("BIND_ADDR");
  if (bind === "0.0.0.0") {
    warn(
      "BIND_ADDR=0.0.0.0：MySQL / Redis / Meilisearch 与后端端口会暴露到所有网卡",
      "有反向代理时应保持默认 127.0.0.1，只让 Nginx 访问",
    );
  }
}

// ─────────────────────────────────────────────
// 5. 端口
// ─────────────────────────────────────────────

{
  const ports = [
    ["BACKEND_PORT", get("BACKEND_PORT") || "3000"],
    ["BLOG_PORT", get("BLOG_PORT") || "3001"],
    ["ADMIN_PORT", get("ADMIN_PORT") || "3002"],
  ];
  const seen = new Map();
  for (const [key, value] of ports) {
    if (!/^\d+$/.test(value)) {
      error(`${key} 不是合法端口（${value}）`);
      continue;
    }
    const num = Number(value);
    if (num === 80 || num === 443) {
      error(
        `${key}=${num} 与宿主机的 Nginx 冲突`,
        "容器端口应映射到 3000~3002 这类高端口，由 Nginx 对外提供 80/443",
      );
    }
    if (seen.has(num)) {
      error(`${key} 与 ${seen.get(num)} 用了同一个端口 ${num}`);
    }
    seen.set(num, key);
  }
  info(
    `数据库 / Redis / Meilisearch 的宿主机端口（当前 ${get("DB_PORT") || 3307} / ${get("REDIS_PORT") || 6379} / ${get("MEILI_PORT") || 7700}）仅用于本机调试；反代部署下它们会绑定到回环地址`,
  );
}

// ─────────────────────────────────────────────
// 6. 邮件
// ─────────────────────────────────────────────

{
  const port = get("SMTP_PORT") || "465";
  const secure = get("SMTP_SECURE").toLowerCase();
  const smtpKeys = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"];
  const smtpFilled = smtpKeys.filter((k) => filled(k));
  const smtpPlaceholder = smtpKeys.filter((k) => PLACEHOLDER.test(get(k)));

  if (smtpPlaceholder.length > 0) {
    // 占位符已由总检查报出，这里不重复
  } else if (smtpFilled.length === 0) {
    warn(
      "SMTP 未配置：评论 / 回复 / 留言的邮件通知会停用（后台「邮件通知」面板显示 disabled）",
      "要启用就填齐 SMTP_HOST、SMTP_USER、SMTP_PASS 三项后重启后端",
    );
  } else if (smtpFilled.length < 3) {
    const missing = smtpKeys.filter((k) => !filled(k));
    error(
      `SMTP 配置不完整（缺 ${missing.join(" / ")}），判定为「未启用」→ 通知静默不发`,
      "三项必须齐全（只配主机等于没配），改完 docker compose restart myblog-backend",
    );
  } else {
    ok("SMTP 三项齐全");
    if (!/^\d+$/.test(port)) {
      error(`SMTP_PORT 不是合法端口（${port}）`);
    }
    const expected =
      port === "465" ? "ssl" : port === "587" ? "starttls" : "none";
    if (secure && !["ssl", "starttls", "none"].includes(secure)) {
      warn(
        `SMTP_SECURE=${get("SMTP_SECURE")} 无法识别，会回退到按端口推导（${expected}）`,
        "可选值只有 ssl / starttls / none",
      );
    } else if (secure && secure !== expected) {
      warn(
        `SMTP_SECURE=${secure} 与端口 ${port} 的常规组合（${expected}）不同`,
        "填错会连接超时 10 秒后失败；确认服务商文档后再保留",
      );
    } else {
      ok(`SMTP 加密方式与端口匹配（${secure || `按端口推导为 ${expected}`}）`);
    }
  }

  // 收件人：blogger.email 不在 .env 里（在库里），这里只能检查模板里的初始值
  const bloggerEmail = get("BLOGGER_EMAIL");
  if (filled("BLOGGER_EMAIL")) {
    if (mailboxRules) {
      const reason = mailboxRules.undeliverableReason(bloggerEmail);
      if (reason) {
        const level =
          filled("SMTP_HOST") && filled("SMTP_USER") && filled("SMTP_PASS")
            ? "error"
            : "warn";
        add(
          level,
          `BLOGGER_EMAIL 不可送达：${reason}`,
          "空库首启会用它创建博主；填真实邮箱，否则每条评论都产生一封退信（还会连累发信账号被判垃圾邮件）",
        );
      } else {
        ok("BLOGGER_EMAIL 形状可用");
      }
    } else if (
      /@(example\.(com|net|org|test)|test|invalid|localhost)$/i.test(
        bloggerEmail,
      )
    ) {
      warn(
        `BLOGGER_EMAIL 是保留域名（${bloggerEmail}），永远收不到信`,
        "改成真实邮箱",
      );
    }
  } else {
    warn(
      "BLOGGER_EMAIL 未配置：会用兜底的 admin@example.com 创建博主，通知必退信",
      "填真实邮箱",
    );
  }
}

// ─────────────────────────────────────────────
// 7. 备份
// ─────────────────────────────────────────────

{
  const remote = get("RCLONE_REMOTE");
  if (!filled("RCLONE_REMOTE")) {
    if (!PLACEHOLDER.test(remote)) {
      warn(
        "RCLONE_REMOTE 未配置：备份只留在本机备份目录，宿主机磁盘损坏即全部丢失",
        "配置对象存储后填 rclone 远端名，例如 oss:myblog-backup（备份脚本会自动同步）",
      );
    }
  } else {
    ok(`备份会同步到对象存储（${remote}）`);
  }
  const retention = get("BACKUP_RETENTION_DAYS") || "14";
  if (!/^\d+$/.test(retention) || Number(retention) < 3) {
    warn(
      `BACKUP_RETENTION_DAYS=${retention} 偏小或非法`,
      "至少保留 3 天，默认 14",
    );
  } else {
    ok(`备份保留 ${retention} 天`);
  }
}

// ─────────────────────────────────────────────
// 输出
// ─────────────────────────────────────────────

function report() {
  const label = {
    error: "[error]",
    warn: "[warn ]",
    info: "[info ]",
    ok: "[ok   ]",
  };
  const errors = findings.filter((f) => f.level === "error");
  const warns = findings.filter((f) => f.level === "warn");

  console.log("=".repeat(70));
  console.log("上线前配置自检 preflight");
  console.log(`配置文件：${ENV_FILE}`);
  console.log("=".repeat(70));

  for (const level of ["error", "warn", "ok", "info"]) {
    const group = findings.filter((f) => f.level === level);
    if (group.length === 0) continue;
    if (level === "error") console.log("");
    for (const f of group) {
      console.log(`${label[f.level]} ${f.message}`);
      if (f.fix) console.log(`        → ${f.fix}`);
    }
  }
  if (findings.length === 0) {
    console.log("[warn ] 没有任何检查项被执行，请确认配置文件内容");
  }

  console.log("");
  console.log("-".repeat(70));
  console.log(
    `合计：阻断 ${errors.length} 项 / 警告 ${warns.length} 项 / 通过 ${findings.filter((f) => f.level === "ok").length} 项`,
  );
  if (errors.length > 0) {
    console.log(
      "结论：存在阻断问题，不建议上线。逐条处理上面的 [error] 后重跑本脚本。",
    );
  } else if (warns.length > 0) {
    console.log("结论：无阻断问题；请确认每条 [warn] 都是有意接受的。");
  } else {
    console.log("结论：全部通过。");
  }
  console.log("-".repeat(70));

  if (errors.length > 0 && STRICT) process.exit(1);
  process.exit(0);
}

report();
