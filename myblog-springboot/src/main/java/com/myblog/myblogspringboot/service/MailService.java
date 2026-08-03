package com.myblog.myblogspringboot.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * 邮件发送服务（对标 Express services/mailer.js）。
 *
 * 优雅降级策略：
 *   - 未配置 SMTP（spring.mail.host 为空）→ 跳过并打日志，不影响业务
 *   - JavaMailSender Bean 不存在（starter 自动配置回退）→ 跳过
 *   - 发送异常 → 记录日志，不抛出（fire-and-forget）
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.username:}")
    private String smtpUser;

    @Value("${spring.mail.from:}")
    private String from;

    /**
     * SMTP 是否已配置且 sender 可用
     */
    public boolean isAvailable() {
        return mailSender != null && StringUtils.hasText(smtpHost);
    }

    /**
     * 发送 HTML 邮件。失败仅记录日志，不抛出异常。
     *
     * @return true = 已发送；false = 发送失败（调用方可忽略）
     */
    public boolean sendMail(String to, String subject, String html) {
        if (!isAvailable()) {
            log.warn("[mailer] SMTP 未配置，邮件通知已停用（to={}）", to);
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(StringUtils.hasText(from) ? from : smtpUser);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("[mailer] 邮件已发送至 {}", to);
            return true;
        } catch (Exception e) {
            log.error("[mailer] 邮件发送失败（to={}）: {}", to, e.getMessage());
            return false;
        }
    }
}
