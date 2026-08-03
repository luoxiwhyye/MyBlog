// ============================================
// services/commentNotifier.js - 评论通知
// 1. 新评论 → 通知博主
// 2. 回复 → 通知被回复者
// 设计为 fire-and-forget，任何失败都不影响评论主流程
// ============================================

const { sendMail } = require("./mailer");

const getSiteName = () => process.env.SITE_NAME || "MyBlog";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const wrapTemplate = (title, bodyHtml) => `
  <div style="max-width:600px;margin:0 auto;font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#f7f8fa;padding:24px;">
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6ebf2;">
      <div style="background:linear-gradient(135deg,#475569,#1e293b);padding:20px 28px;">
        <h2 style="margin:0;color:#ffffff;font-size:18px;">${title}</h2>
      </div>
      <div style="padding:24px 28px;color:#334155;line-height:1.8;font-size:14px;">
        ${bodyHtml}
      </div>
      <div style="padding:14px 28px;background:#f8fafc;color:#94a3b8;font-size:12px;text-align:center;">
        本邮件由 ${escapeHtml(getSiteName())} 自动发送，请勿直接回复。
      </div>
    </div>
  </div>
`;

/**
 * 通知博主有新评论
 */
const notifyBlogger = async ({
  articleTitle,
  articleId,
  authorName,
  content,
  siteUrl,
  bloggerEmail,
}) => {
  if (!bloggerEmail) {
    return { skipped: true };
  }

  const html = wrapTemplate(
    "收到一条新评论",
    `
      <p>你好，博主：</p>
      <p><strong>${escapeHtml(authorName)}</strong> 在文章
        <a href="${escapeHtml(siteUrl)}/article/${articleId}" style="color:#475569;font-weight:600;">
          《${escapeHtml(articleTitle)}》
        </a>
        下发表了新评论：</p>
      <blockquote style="margin:16px 0;padding:12px 16px;background:#f1f5f9;border-left:4px solid #475569;border-radius:0 8px 8px 0;color:#475569;">
        ${escapeHtml(content)}
      </blockquote>
      <p style="color:#94a3b8;font-size:13px;">评论默认为待审核状态，请前往后台进行审核。</p>
    `,
  );

  return sendMail({
    to: bloggerEmail,
    subject: `【${getSiteName()}】收到来自 ${authorName} 的新评论`,
    html,
  });
};

/**
 * 通知被回复的评论者
 */
const notifyReplied = async ({
  articleTitle,
  articleId,
  parentAuthorName,
  parentEmail,
  replierName,
  content,
  siteUrl,
}) => {
  if (!parentEmail) {
    return { skipped: true };
  }

  const html = wrapTemplate(
    "您的评论收到回复",
    `
      <p>您好，${escapeHtml(parentAuthorName)}：</p>
      <p><strong>${escapeHtml(replierName)}</strong> 回复了您在文章
        <a href="${escapeHtml(siteUrl)}/article/${articleId}" style="color:#475569;font-weight:600;">
          《${escapeHtml(articleTitle)}》
        </a>
        下的评论：</p>
      <blockquote style="margin:16px 0;padding:12px 16px;background:#f1f5f9;border-left:4px solid #475569;border-radius:0 8px 8px 0;color:#475569;">
        ${escapeHtml(content)}
      </blockquote>
      <p style="color:#94a3b8;font-size:13px;">
        <a href="${escapeHtml(siteUrl)}/article/${articleId}" style="color:#475569;">点击查看完整讨论 →</a>
      </p>
    `,
  );

  return sendMail({
    to: parentEmail,
    subject: `【${getSiteName()}】${replierName} 回复了您的评论`,
    html,
  });
};

module.exports = { notifyBlogger, notifyReplied };
