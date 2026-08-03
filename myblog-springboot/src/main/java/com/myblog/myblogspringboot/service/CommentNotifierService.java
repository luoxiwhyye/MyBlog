package com.myblog.myblogspringboot.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.myblog.myblogspringboot.entity.Article;
import com.myblog.myblogspringboot.entity.Blogger;
import com.myblog.myblogspringboot.entity.Comment;
import com.myblog.myblogspringboot.repository.BloggerRepository;

/**
 * 评论通知服务（对标 Express services/commentNotifier.js）。
 *
 * 1. 新评论 → 通知博主（blogger 表中 admin 用户邮箱）
 * 2. 回复 → 通知被回复者（父评论 authorEmail）
 * 设计为 fire-and-forget：任何失败仅记录日志，不影响评论主流程。
 */
@Service
public class CommentNotifierService {

    private final MailService mailService;
    private final BloggerRepository bloggerRepository;

    @Value("${app.site-url:http://localhost:3001}")
    private String siteUrl;

    @Value("${app.site-name:MyBlog}")
    private String siteName;

    public CommentNotifierService(MailService mailService, BloggerRepository bloggerRepository) {
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
                </div>
                """.formatted(title, bodyHtml, escapeHtml(siteName));
    }

    /**
     * 通知博主有新评论
     */
    public void notifyBlogger(Article article, String authorName, String content) {
        if (article == null) return;

        Optional<Blogger> blogger = bloggerRepository.findFirstByOrderByIdAsc();
        if (blogger.isEmpty() || !mailService.isAvailable()) {
            return;
        }
        String bloggerEmail = blogger.get().getEmail();
        if (bloggerEmail == null || bloggerEmail.isBlank()) {
            return;
        }

        String html = wrapTemplate("收到一条新评论", """
                <p>你好，博主：</p>
                <p><strong>%s</strong> 在文章
                  <a href="%s/article/%d" style="color:#475569;font-weight:600;">《%s》</a>
                  下发表了新评论：</p>
                <blockquote style="margin:16px 0;padding:12px 16px;background:#f1f5f9;border-left:4px solid #475569;border-radius:0 8px 8px 0;color:#475569;">
                  %s
                </blockquote>
                <p style="color:#94a3b8;font-size:13px;">评论默认为待审核状态，请前往后台进行审核。</p>
                """.formatted(
                escapeHtml(authorName),
                escapeHtml(siteUrl),
                article.getId(),
                escapeHtml(article.getTitle()),
                escapeHtml(content)));

        mailService.sendMail(bloggerEmail,
                "【" + siteName + "】收到来自 " + authorName + " 的新评论", html);
    }

    /**
     * 通知被回复的评论者
     */
    public void notifyReplied(Article article, Comment parent, String replierName, String content) {
        if (article == null || parent == null) return;
        String parentEmail = parent.getAuthorEmail();
        if (parentEmail == null || parentEmail.isBlank()) {
            return;
        }

        String html = wrapTemplate("您的评论收到回复", """
                <p>您好，%s：</p>
                <p><strong>%s</strong> 回复了您在文章
                  <a href="%s/article/%d" style="color:#475569;font-weight:600;">《%s》</a>
                  下的评论：</p>
                <blockquote style="margin:16px 0;padding:12px 16px;background:#f1f5f9;border-left:4px solid #475569;border-radius:0 8px 8px 0;color:#475569;">
                  %s
                </blockquote>
                <p style="color:#94a3b8;font-size:13px;">
                  <a href="%s/article/%d" style="color:#475569;">点击查看完整讨论 →</a>
                </p>
                """.formatted(
                escapeHtml(parent.getAuthorName()),
                escapeHtml(replierName),
                escapeHtml(siteUrl),
                article.getId(),
                escapeHtml(article.getTitle()),
                escapeHtml(content),
                escapeHtml(siteUrl),
                article.getId()));

        mailService.sendMail(parentEmail,
                "【" + siteName + "】" + replierName + " 回复了您的评论", html);
    }
}
