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
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
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
  return {
    status: available ? "ok" : "disabled",
    reason: available ? "" : disabledReason,
    host: process.env.SMTP_HOST || "",
    port,
    secure: port === 465,
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
