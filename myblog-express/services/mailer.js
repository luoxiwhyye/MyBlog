// ============================================
// services/mailer.js - 邮件发送服务
// 基于 nodemailer，未配置 SMTP 或依赖缺失时优雅降级（仅日志）
// ============================================

let transporter = null;
let mailerAvailable = false;
let initAttempted = false;
// 停用原因（供 /health 与后台「邮件通知」面板展示，避免「静默降级」）
let disabledReason = "";

// 生效的发信人：SMTP_FROM → SMTP_USER → 内置默认（两端状态展示共用这一口径）
const resolveFrom = () =>
  process.env.SMTP_FROM ||
  process.env.SMTP_USER ||
  "MyBlog <noreply@myblog.local>";

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

module.exports = { sendMail, isMailerAvailable, getMailerStatus };
