// ============================================
// controllers/mailController.js - 邮件通知配置状态与测试发信（仅管理员）
//
// 背景：邮件通知的 4 类触发点在第十轮批 4 已完成并实测过，但 SMTP 未配置时
// services/mailer.js 只打一行 warn 就静默降级 —— 前台 / 后台都看不出「没生效」。
// 本控制器把「配置状态」与「真实发一封」暴露成两个接口，供后台「邮件通知」面板使用。
//
// 契约与 Spring 的 controller/MailController.java 逐字段对齐。
// ============================================

const bloggerModel = require("../models/Blogger");
const {
  sendMail,
  getMailerStatus,
  undeliverableReason,
} = require("../services/mailer");
const { success, error } = require("../utils/response");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 通知邮件的实际收件人 = 博主邮箱
 *
 * 取值口径与 controllers/commentController.js 的通知路径一致（按 BLOGGER_USERNAME 查），
 * 所以面板上显示的收件人就是「评论 / 留言通知真正会发到哪」。
 */
const resolveRecipient = async () => {
  const blogger = await bloggerModel.getBloggerByUsername(
    process.env.BLOGGER_USERNAME || "admin",
  );
  return blogger?.email || "";
};

/**
 * GET /api/v1/mail/status
 * 返回 SMTP 配置状态（不发信，不探测连通性）
 */
const getStatus = async (req, res, next) => {
  try {
    const recipient = await resolveRecipient();
    const data = {
      ...getMailerStatus(),
      recipient,
      // 收件人仍是占位地址（如初始化默认的 admin@example.com）时的告警文案：
      // SMTP 配好也没用，通知会全部退信（域名无 MX 记录）。空串 = 没问题。
      recipientWarning: undeliverableReason(recipient),
    };
    success(res, data);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/mail/test
 * 用当前 SMTP 配置真实发一封测试邮件
 *
 * body: { to?: string } —— 省略则发给博主邮箱
 */
const sendTestMail = async (req, res, next) => {
  try {
    const to = String(req.body?.to || "").trim() || (await resolveRecipient());

    if (!to) {
      return error(
        res,
        "缺少收件人：请填写邮箱，或先在「个人资料」里设置博主邮箱",
        400,
      );
    }
    if (!EMAIL_PATTERN.test(to)) {
      return error(res, "邮箱格式不正确", 400);
    }
    // 保留域名（example.com 等）永远收不到信，连测试都不必发 —— 发出去只会产生退信
    const undeliverable = undeliverableReason(to);
    if (undeliverable) {
      return error(
        res,
        `${undeliverable}：请换一个真实邮箱，或到「个人资料 → 邮箱」改成能收信的地址`,
        400,
      );
    }

    const status = getMailerStatus();
    if (status.status !== "ok") {
      return error(
        res,
        `邮件服务未启用（${status.reason}）：请在后端 .env 配置 SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS 后重启服务`,
        400,
      );
    }

    const siteName = process.env.SITE_NAME || "MyBlog";
    const siteUrl = process.env.SITE_URL || "";
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#f7f8fa;padding:24px;">
        <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6ebf2;">
          <div style="background:linear-gradient(135deg,#475569,#1e293b);padding:20px 28px;">
            <h2 style="margin:0;color:#ffffff;font-size:18px;">测试邮件</h2>
          </div>
          <div style="padding:24px 28px;color:#334155;line-height:1.8;font-size:14px;">
            <p>这是一封来自后台「系统设置 · 邮件通知」的测试邮件。</p>
            <p>收到它说明 SMTP 配置可用，评论 / 回复 / 留言的邮件通知已能正常发出。</p>
            ${siteUrl ? `<p><a href="${siteUrl}" style="color:#475569;font-weight:600;">${siteUrl}</a></p>` : ""}
          </div>
          <div style="padding:14px 28px;background:#f8fafc;color:#94a3b8;font-size:12px;text-align:center;">
            本邮件由 ${siteName} 自动发送，请勿直接回复。
          </div>
        </div>
      </div>
    `;

    const result = await sendMail({
      to,
      subject: `【测试】${siteName} 邮件通知`,
      html,
    });

    if (result.ok) {
      return success(res, { to }, `测试邮件已发送至 ${to}`);
    }
    return error(res, `发送失败：${result.error || "未知错误"}`, 400);
  } catch (err) {
    next(err);
  }
};

module.exports = { getStatus, sendTestMail };
