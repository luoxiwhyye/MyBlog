package com.myblog.myblogspringboot.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.myblog.myblogspringboot.entity.Blogger;
import com.myblog.myblogspringboot.entity.MessageBoard;
import com.myblog.myblogspringboot.repository.BloggerRepository;

/**
 * 留言板通知服务（对标 Express services/messageNotifier.js）。
 *
 * 新留言 → 通知博主（blogger 表中 admin 用户邮箱）。
 * 设计为 fire-and-forget：任何失败仅记录日志，不影响留言主流程。
 */
@Service
public class MessageNotifierService {

    private final MailService mailService;
    private final BloggerRepository bloggerRepository;

    @Value("${app.site-url:http://localhost:3001}")
    private String siteUrl;

    @Value("${app.site-name:MyBlog}")
    private String siteName;

    public MessageNotifierService(MailService mailService, BloggerRepository bloggerRepository) {
        this.mailService = mailService;
        this.bloggerRepository = bloggerRepository;
    }

    private String escapeHtml(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    /**
     * 留言内容是「标记文本」（图片 → [img:url]），邮件里把标记可读化为 [图片]。
     *
     * 先替换标记再转义，与 Express services/messageNotifier.js 的 formatCommentContent 一致。
     */
    private static final java.util.regex.Pattern IMG_MARKER =
            java.util.regex.Pattern.compile("\\\\[img:https?://[^\\\\s\\\\]]+\\\\]",
                    java.util.regex.Pattern.CASE_INSENSITIVE);

    private String formatCommentContent(String value) {
        if (value == null) return "";
        return escapeHtml(IMG_MARKER.matcher(value).replaceAll("[图片]"));
    }

    private String wrapTemplate(String title, String bodyHtml) {
        return """
                <div style="max-width:600px;margin:0 auto;font-family:'PingFang SC','Microsoft YaHei',sans-serif;background:#f7f8fa;padding:24px;">
                  <div style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6ebf2;">
                    <div style="background:linear-gradient(135deg,#475569,#1e293b);padding:20px 28px;">
                      <h2 style="margin:0;color:#ffffff;font-size:18px;">%s</h2>
                    </div>
                    <div style="padding:24px 28px;color:#334155;line-height:1.8;font-size:14px;">
                      %s
                    </div>
                    <div style="padding:14px 28px;background:#f8fafc;color:#94a3b8;font-size:12px;text-align:center;">
                      本邮件由 %s 自动发送，请勿直接回复。
                    </div>
                  </div>
                </div>""".formatted(title, bodyHtml, escapeHtml(siteName));
    }

    /**
     * 通知博主有新留言
     */
    public void notifyBlogger(MessageBoard message) {
        Blogger blogger = bloggerRepository.findFirstByOrderByIdAsc().orElse(null);
        if (blogger == null || blogger.getEmail() == null || blogger.getEmail().isBlank()) {
            return;
        }

        String body = """
                <p>你好，博主：</p>
                <p><strong>%s</strong> 在留言板写下了一条新留言：</p>
                <blockquote style="margin:16px 0;padding:12px 16px;background:#f1f5f9;border-left:4px solid #475569;border-radius:0 8px 8px 0;color:#475569;">
                  %s
                </blockquote>
                <p style="color:#94a3b8;font-size:13px;">留言默认为待审核状态，请前往后台进行审核。</p>
                <p style="margin-top:12px;">
                  <a href="%s/message-board" style="color:#475569;">点击查看留言板 →</a>
                </p>""".formatted(
                        escapeHtml(message.getAuthorName()),
                        formatCommentContent(message.getContent()),
                        siteUrl);

        mailService.sendMail(
                blogger.getEmail(),
                "【" + siteName + "】收到来自 " + message.getAuthorName() + " 的新留言",
                wrapTemplate("收到一条新留言", body));
    }

    /**
     * 通知留言者本人「您的留言已通过审核」（收件人 = 留言者）。
     *
     * 与 notifyBlogger 是**两封不同的信**：留言板有两个收件人 —— 新留言创建时通知
     * 博主（notifyBlogger），审核通过时通知留言者（本方法）。留言之间没有回复链路，
     * 这里就是留言板那个勾选框唯一的触发点。
     *
     * 幂等：由调用方（MessageBoardService.updateStatus）保证只在
     * 「非 approved → approved」且留言者勾选过订阅时调用一次。
     */
    public void notifyApproved(MessageBoard message) {
        if (message == null) {
            return;
        }
        String authorEmail = message.getAuthorEmail();
        if (authorEmail == null || authorEmail.isBlank()) {
            return;
        }

        String body = """
                <p>您好，%s：</p>
                <p>您在留言板写下的留言已通过审核，现在已公开展示：</p>
                <blockquote style="margin:16px 0;padding:12px 16px;background:#f1f5f9;border-left:4px solid #475569;border-radius:0 8px 8px 0;color:#475569;">
                  %s
                </blockquote>
                <p style="color:#94a3b8;font-size:13px;">
                  您勾选了「留言通过审核后，邮件通知我」才会收到本邮件；不勾选则不会有任何邮件。
                </p>
                <p style="margin-top:12px;">
                  <a href="%s/message-board" style="color:#475569;">前往留言板查看 →</a>
                </p>""".formatted(
                        escapeHtml(message.getAuthorName()),
                        formatCommentContent(message.getContent()),
                        siteUrl);

        mailService.sendMail(
                authorEmail,
                "【" + siteName + "】您的留言已通过审核",
                wrapTemplate("您的留言已通过审核", body));
    }
}
