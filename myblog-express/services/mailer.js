// ============================================
// services/mailer.js - 邮件发送服务
// 基于 nodemailer，未配置 SMTP 或依赖缺失时优雅降级（仅日志）
// ============================================

let transporter = null;
let mailerAvailable = false;
let initAttempted = false;
// 停用原因（供 /health 与后台「邮件通知」面板展示，避免「静默降级」）
let disabledReason = "";

// SITE_URL 缺失的告警只打一次（否则每来一条评论 / 留言都会刷一次屏）
let siteUrlWarned = false;

// 生效的发信人：SMTP_FROM → SMTP_USER → 内置默认（两端状态展示共用这一口径）
const resolveFrom = () =>
  process.env.SMTP_FROM ||
  process.env.SMTP_USER ||
  "MyBlog <noreply@myblog.local>";

/** 生效的站点地址（邮件里文章 / 留言板链接的前缀） */
const resolveSiteUrl = () => process.env.SITE_URL || "";

/**
 * SITE_URL 未配置时告警。
 *
 * 邮件模板拼的是 `${SITE_URL}/article/<id>`：SITE_URL 为空会渲染成 `/article/4`
 * 这种无域名的相对路径 —— 通知能收到，但「点击查看」点开是空页，而发信方不报任何错。
 * 所以与「收件人不可送达」同样处理：在**发信出口**把它说出来（每个进程只打一次）。
 */
const warnIfSiteUrlMissing = () => {
  if (siteUrlWarned || resolveSiteUrl()) {
    return;
  }
  siteUrlWarned = true;
  console.warn(
    "[mailer] SITE_URL 未配置：邮件里的链接不会带域名（渲染成 /article/1），收信人点开是空页。请在后端 .env 里设置 SITE_URL=https://你的域名 后重启服务",
  );
};

/**
 * 保留域名（RFC 2606 / RFC 6761）—— 这些域名下**任何地址都收不到信**：
 * 没有 MX 记录，寄过去会被服务商直接退信（“No MX Record Found”）。
 *
 * Blogger 的初始化默认值 admin@example.com 就在其中。若真实通知继续寄给它，
 * 每来一条评论 / 留言都会产生一封退信，还会连累发信账号被判定为发垃圾邮件。
 * 与 Spring 的 MailService.RESERVED_RECIPIENT_DOMAINS 逐项对齐。
 */
const RESERVED_RECIPIENT_DOMAINS = Object.freeze([
  "example.com",
  "example.net",
  "example.org",
  "example.test",
  "invalid",
  "localhost",
  "test",
]);

/**
 * 收件人是否**必然**收不到信（空 / 非邮箱 / 保留域名）。收不到时返回原因，否则返回空串。
 *
 * ⚠️ 只判「必然失败」的情况：不查 DNS、不验 MX，只挡住占位地址造成的退信。
 */
const undeliverableReason = (email) => {
  const address = String(email || "").trim();
  if (!address) {
    return "收件人为空";
  }
  const at = address.lastIndexOf("@");
  if (at === -1) {
    return "不是合法的邮箱地址";
  }
  const domain = address.slice(at + 1).toLowerCase();
  // 精确或子域都算：foo.example.com / bar.test 同样没有 MX 记录
  if (
    RESERVED_RECIPIENT_DOMAINS.some(
      (r) => domain === r || domain.endsWith(`.${r}`),
    )
  ) {
    return `收件人 ${address} 的域名 ${domain} 是保留域名（没有 MX 记录），永远收不到信`;
  }
  return "";
};

/**
 * SMTP 传输加密方式 —— 由 SMTP_SECURE 决定，未配置时按端口推导。
 *
 * 与 Spring 的 config/MailEncryption.java **逐条对齐**（同一份 .env 必须得出同一结论）：
 *   - 显式取值：ssl（直连 SSL，通常 465）/ starttls（明文握手后升级，通常 587）/ none（不加密）
 *   - 宽松别名：true/1 → ssl，tls → starttls，plain/false/0 → none
 *   - 未配置或取值无法识别 → 按端口推导：465 → ssl，587 → starttls，其余 → none
 */
const ENCRYPTION_ALIASES = Object.freeze({
  ssl: "ssl",
  true: "ssl",
  1: "ssl",
  starttls: "starttls",
  tls: "starttls",
  none: "none",
  plain: "none",
  false: "none",
  0: "none",
});

const resolveEncryption = (port) => {
  const raw = String(process.env.SMTP_SECURE || "")
    .trim()
    .toLowerCase();
  // 用 hasOwn 而不是直接取值：后者会把 `constructor` 之类原型链上的键当成合法取值
  if (Object.hasOwn(ENCRYPTION_ALIASES, raw)) {
    return ENCRYPTION_ALIASES[raw];
  }
  if (raw) {
    console.warn(
      `[mailer] SMTP_SECURE 取值无法识别（${raw}），已按端口 ${port} 推导（可选值：ssl / starttls / none）`,
    );
  }
  if (port === 465) return "ssl";
  if (port === 587) return "starttls";
  return "none";
};

/**
 * 加密方式 → nodemailer 选项（语义与 Spring 的 ssl / starttls 三项属性一致）
 *
 * ⚠️ starttls 用 requireTLS（而非让它机会性升级）：显式声明了 STARTTLS 却连到不支持的服务端时，
 * 应当**报错**而不是静默退回明文 —— 否则账号密码会以明文发出。
 * none 用 ignoreTLS，对齐 Spring 的 starttls.enable=false（两边都不尝试升级）。
 */
const encryptionToTransportOptions = (encryption) => {
  if (encryption === "ssl") {
    return { secure: true };
  }
  if (encryption === "starttls") {
    return { secure: false, requireTLS: true };
  }
  return { secure: false, ignoreTLS: true };
};

/**
 * 连接级超时（毫秒）—— 与 Spring 的 mail.smtp.connectiontimeout / timeout / writetimeout 同值
 *
 * ⚠️ nodemailer 的 connectionTimeout 默认 **120 秒**，且服务端不配合时（如把加密方式设成
 * starttls 而对方只支持明文）不会快速报错 —— 实测会等 socketConnection 超时才放弃，
 * 后台「发送测试邮件」按钮就会一直转圈。这里统一钉到 10 秒：宁可早报「连接失败」。
 */
const SMTP_TIMEOUT_MS = 10000;

const initTransporter = () => {
  if (initAttempted) {
    return mailerAvailable;
  }
  initAttempted = true;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    disabledReason = !host
      ? "未配置 SMTP_HOST"
      : !user
        ? "未配置 SMTP_USER"
        : "未配置 SMTP_PASS";
    console.warn(`[mailer] SMTP 未配置（${disabledReason}），邮件通知已停用。`);
    return false;
  }

  try {
    // 延迟加载依赖，避免未安装时阻塞应用启动
    // eslint-disable-next-line global-require
    const nodemailer = require("nodemailer");
    const encryption = resolveEncryption(port);
    transporter = nodemailer.createTransport({
      host,
      port,
      ...encryptionToTransportOptions(encryption),
      auth: { user, pass },
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
      tls: {
        rejectUnauthorized: false,
      },
    });
    console.log(`[mailer] SMTP 加密方式：${encryption}（端口 ${port}）`);
    mailerAvailable = true;
  } catch (err) {
    console.warn("[mailer] nodemailer 加载失败，邮件通知已停用:", err.message);
    mailerAvailable = false;
    disabledReason = "nodemailer 加载失败";
  }

  return mailerAvailable;
};

const isMailerAvailable = () => {
  initTransporter();
  return mailerAvailable && !!transporter;
};

/**
 * 邮件服务状态（供 /health 与后台「邮件通知」面板展示）
 *
 * ⚠️ 反映的是**进程启动时**读取的 .env：改完 .env 必须重启后端才生效。
 * 与 Spring 的 MailService#getStatus 逐字段对齐。
 */
const getMailerStatus = () => {
  const available = isMailerAvailable();
  const port = Number(process.env.SMTP_PORT || 465);
  const encryption = resolveEncryption(port);
  return {
    status: available ? "ok" : "disabled",
    reason: available ? "" : disabledReason,
    host: process.env.SMTP_HOST || "",
    port,
    secure: encryption === "ssl",
    encryption,
    user: process.env.SMTP_USER || "",
    from: resolveFrom(),
    // 站点地址（邮件里的链接前缀）：空串 = 邮件里的链接不带域名，收件人点开是空页
    siteUrl: resolveSiteUrl(),
  };
};

/**
 * 发送邮件（异步，失败不影响主流程）
 * @param {{to: string, subject: string, html: string}} mail
 */
const sendMail = async ({ to, subject, html }) => {
  if (!isMailerAvailable()) {
    return { skipped: true };
  }

  // 必然收不到信的收件人直接跳过：否则会退信（连带把发信账号拖进垃圾邮件的坑）
  const undeliverable = undeliverableReason(to);
  if (undeliverable) {
    console.warn(
      `[mailer] 已跳过发送：${undeliverable}。请把收件人改成真实邮箱`,
    );
    return { skipped: true, reason: undeliverable };
  }

  // 站点地址没配 → 邮件里的链接不可点，同样不能让它在出口悄悄过去
  warnIfSiteUrlMissing();

  try {
    const info = await transporter.sendMail({
      from: resolveFrom(),
      to,
      subject,
      html,
    });
    console.log(`[mailer] 邮件已发送至 ${to}:`, info.messageId);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("[mailer] 邮件发送失败:", err.message);
    return { ok: false, error: err.message };
  }
};

module.exports = {
  sendMail,
  isMailerAvailable,
  getMailerStatus,
  undeliverableReason,
};
