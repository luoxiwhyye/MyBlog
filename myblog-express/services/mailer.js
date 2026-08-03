// ============================================
// services/mailer.js - 邮件发送服务
// 基于 nodemailer，未配置 SMTP 或依赖缺失时优雅降级（仅日志）
// ============================================

let transporter = null;
let mailerAvailable = false;
let initAttempted = false;

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
    console.warn(
      "[mailer] SMTP 未配置（SMTP_HOST/SMTP_USER/SMTP_PASS），邮件通知已停用。",
    );
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
  }

  return mailerAvailable;
};

const isMailerAvailable = () => {
  initTransporter();
  return mailerAvailable && !!transporter;
};

/**
 * 发送邮件（异步，失败不影响主流程）
 * @param {{to: string, subject: string, html: string}} mail
 */
const sendMail = async ({ to, subject, html }) => {
  if (!isMailerAvailable()) {
    return { skipped: true };
  }

  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "MyBlog <noreply@myblog.local>";

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log(`[mailer] 邮件已发送至 ${to}:`, info.messageId);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error("[mailer] 邮件发送失败:", err.message);
    return { ok: false, error: err.message };
  }
};

module.exports = { sendMail, isMailerAvailable };
