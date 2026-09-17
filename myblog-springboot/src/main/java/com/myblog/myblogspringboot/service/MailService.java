package com.myblog.myblogspringboot.service;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import jakarta.mail.internet.MimeMessage;

/**
 * 邮件发送服务（对标 Express services/mailer.js）。
 *
 * 优雅降级策略：
 *   - 未配置 SMTP（spring.mail.host 为空）→ 跳过并打日志，不影响业务
 *   - JavaMailSender Bean 不存在（starter 自动配置回退）→ 跳过
 *   - 发送异常 → 记录日志，不抛出（fire-and-forget）
 *
 * <p>降级是静默的：因此 {@link #getStatus()} 把「为什么没在发信」显式暴露给
 * /health 与后台「邮件通知」面板（字段与 Express getMailerStatus 逐项对齐）。
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    /** 未配置发信人时的展示值（与 Express resolveFrom() 的默认值一致） */
    private static final String DEFAULT_FROM = "MyBlog <noreply@myblog.local>";

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.port:465}")
    private int smtpPort;

    @Value("${spring.mail.username:}")
    private String smtpUser;

    @Value("${spring.mail.password:}")
    private String smtpPass;

    @Value("${spring.mail.from:}")
    private String from;

    @Value("${spring.mail.properties.mail.smtp.ssl.enable:true}")
    private boolean smtpSsl;

    /**
     * SMTP 是否已配置且 sender 可用。
     *
     * <p>⚠️ 要求与 Express services/mailer.js 完全一致（host + user + pass 三项齐全）：
     * 若只判 host，只配了主机没配账号时本端会自认「可用」，而 Express 报「未配置 SMTP_USER」——
     * 同一份 .env 会得出两种结论，正是后台「邮件通知」面板要消除的困惑。
     */
    public boolean isAvailable() {
        return mailSender != null && missingConfig().isEmpty();
    }

    /** 命中第一个缺失项（顺序与 Express 一致：host → user → pass），都齐全则返回空串 */
    private String missingConfig() {
        if (!StringUtils.hasText(smtpHost)) {
            return "未配置 SMTP_HOST";
        }
        if (!StringUtils.hasText(smtpUser)) {
            return "未配置 SMTP_USER";
        }
        if (!StringUtils.hasText(smtpPass)) {
            return "未配置 SMTP_PASS";
        }
        return "";
    }

    /**
     * 生效的发信人：spring.mail.from → spring.mail.username → 内置默认
     *
     * <p>与 Express resolveFrom() 同口径。内置默认只在「未配置」时用于状态展示，
     * 真发信路径走不到（发信前提是三项配置齐全）。
     */
    public String effectiveFrom() {
        if (StringUtils.hasText(from)) {
            return from;
        }
        return StringUtils.hasText(smtpUser) ? smtpUser : DEFAULT_FROM;
    }

    /**
     * 邮件服务状态（供 /health 与后台「邮件通知」面板展示）。
     *
     * <p>⚠️ 反映的是**进程启动时**读到的配置：改完 .env 必须重启后端才生效。
     */
    public Map<String, Object> getStatus() {
        String missing = missingConfig();
        boolean available = mailSender != null && missing.isEmpty();
        String reason = available ? "" : (missing.isEmpty() ? "JavaMailSender 不可用" : missing);

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("status", available ? "ok" : "disabled");
        status.put("reason", reason);
        status.put("host", smtpHost == null ? "" : smtpHost);
        status.put("port", smtpPort);
        status.put("secure", smtpSsl);
        status.put("user", smtpUser == null ? "" : smtpUser);
        status.put("from", effectiveFrom());
        return status;
    }

    /**
     * 发送 HTML 邮件。失败仅记录日志，不抛出异常。
     *
     * @return true = 已发送；false = 发送失败（调用方可忽略）
     */
    public boolean sendMail(String to, String subject, String html) {
        return sendMailDetailed(to, subject, html).ok();
    }

    /**
     * 同 {@link #sendMail}，但把失败原因一并带出。
     *
     * <p>只有「发送测试邮件」需要原因（要回显给操作者）；
     * 通知路径是 fire-and-forget，用 {@link #sendMail} 的布尔返回值即可。
     */
    public SendResult sendMailDetailed(String to, String subject, String html) {
        if (!isAvailable()) {
            log.warn("[mailer] SMTP 未配置，邮件通知已停用（to={}）", to);
            return new SendResult(false, "SMTP 未配置");
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(effectiveFrom());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
            log.info("[mailer] 邮件已发送至 {}", to);
            return new SendResult(true, "");
        } catch (Exception e) {
            log.error("[mailer] 邮件发送失败（to={}）: {}", to, e.getMessage());
            return new SendResult(false, e.getMessage());
        }
    }

    /** 发送结果（见 {@link #sendMailDetailed}） */
    public record SendResult(boolean ok, String error) {}
}
