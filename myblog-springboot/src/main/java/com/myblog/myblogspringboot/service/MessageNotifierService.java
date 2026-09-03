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
                        escapeHtml(message.getContent()),
                        siteUrl);

        mailService.sendMail(
                blogger.getEmail(),
                "【" + siteName + "】收到来自 " + message.getAuthorName() + " 的新留言",
                wrapTemplate("收到一条新留言", body));
    }
}
