package com.myblog.myblogspringboot.service;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.myblog.myblogspringboot.config.MailEncryption;

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

    /**
     * 保留域名（RFC 2606 / RFC 6761）—— 这些域名下**任何地址都收不到信**：
     * 没有 MX 记录，寄过去会被服务商直接退信（“No MX Record Found”）。
     *
     * <p>Blogger 的初始化默认值 {@code admin@example.com} 就在其中。若真实通知继续寄给它，
     * 每来一条评论 / 留言都会产生一封退信，还会连累发信账号被判定为发垃圾邮件。
     * 与 Express services/mailer.js 的 RESERVED_RECIPIENT_DOMAINS 逐项对齐。
     */
    private static final Set<String> RESERVED_RECIPIENT_DOMAINS = Set.of(
            "example.com", "example.net", "example.org", "example.test",
            "invalid", "localhost", "test");

    /** 环回 / 未指定地址（「本机」）—— 与 Express services/mailer.js 的 LOOPBACK_HOSTS 逐项一致 */
    private static final Set<String> LOOPBACK_HOSTS = Set.of("localhost", "::1", "0.0.0.0", "::");

    /** 点分十进制 IPv4 字面量（四段数字）—— 只认字面量，否则 10.example.com 会被误判成内网 */
    private static final Pattern IPV4_LITERAL = Pattern.compile("^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$");

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

    /**
     * 站点地址（邮件里文章 / 留言板链接的前缀）。
     *
     * <p>⚠️ 与 Express 一致：未配置时取空串（不是 localhost 之类内置默认值）——
     * 否则本端会以为「配好了」，把 localhost 链接发出去，而 Express 报「未配置」。
     */
    @Value("${app.site-url:}")
    private String siteUrl;

    /** SITE_URL 不可用的告警只打一次（否则每来一条评论 / 留言都会刷一次屏） */
    private volatile boolean siteUrlWarned = false;

    @Value("${app.mail.secure:}")
    private String secureRaw;

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

    /** 生效的站点地址（邮件里链接的前缀）；未配置返回空串 */
    public String effectiveSiteUrl() {
        return siteUrl == null ? "" : siteUrl;
    }

    /**
     * 内网 / 链路本地 IPv4（{@code 10.*} / {@code 172.16-31.*} / {@code 192.168.*} / {@code 169.254.*}）。
     *
     * <p>IPv6 的 ULA（{@code fc00::/7}）与「域名解析到内网」都不判 —— 本方法不查 DNS。
     */
    private static boolean isPrivateHost(String host) {
        Matcher matcher = IPV4_LITERAL.matcher(host);
        if (!matcher.matches()) {
            return false;
        }
        int first = Integer.parseInt(matcher.group(1));
        int second = Integer.parseInt(matcher.group(2));
        if (first == 10) {
            return true;
        }
        if (first == 192 && second == 168) {
            return true;
        }
        if (first == 172 && second >= 16 && second <= 31) {
            return true;
        }
        return first == 169 && second == 254;
    }

    /**
     * 站点地址是否**必然**打不开（空 / 非 http(s) / 本机 / 内网 / 保留域名）。不可用时返回原因，否则返回空串。
     *
     * <p>邮件模板拼的是 {@code ${SITE_URL}/article/<id>}，而这个链接是给**收信人**点的：
     * {@code http://localhost:3001/article/11} 在发信方看着一切正常，但收信人的「本机」不是部署博客的那台机器
     * —— 点开要么打不开，要么被邮箱的链接安全跳转直接拦下（QQ 邮箱返回 {@code Invalid url}）。
     * 更麻烦的是发信方不报任何错、后台面板也照常显示，所以只能靠这一层把它说出来。
     *
     * <p>⚠️ 与 Express services/mailer.js 的 undeliverableSiteUrlReason **逐项对齐**
     * （判定顺序与文案都要一致）。
     */
    public static String undeliverableSiteUrlReason(String url) {
        String value = url == null ? "" : url.trim();
        if (value.isEmpty()) {
            return "未配置站点地址：邮件里的链接不带域名（渲染成 /article/1），收件人点开是空页";
        }

        // 先按字面量要求 http(s)://，不把这一步交给 URI 解析：
        // `blog.example.com` / `localhost:3001` 在 Java 的 URI 里是 opaque URI（host 为 null），
        // 而 JS 的 new URL() 会把它们解析出「scheme」—— 先在这里统一拦下，两端才能得出逐字相同的一句文案。
        String malformed = "站点地址 " + value
                + " 不是合法的站点地址（需要带协议与主机名，如 https://blog.example.com）";
        String lowerValue = value.toLowerCase(Locale.ROOT);
        if (!lowerValue.startsWith("http://") && !lowerValue.startsWith("https://")) {
            return malformed;
        }

        URI uri;
        try {
            uri = URI.create(value);
        } catch (IllegalArgumentException e) {
            return malformed;
        }

        String rawHost = uri.getHost();
        if (rawHost == null || rawHost.isBlank()) {
            return malformed;
        }
        // ⚠️ Java 的 URI.getHost() 对 IPv6 返回的是带方括号的 [::1]，先剥掉再比对
        String hostValue = rawHost.startsWith("[") && rawHost.endsWith("]")
                ? rawHost.substring(1, rawHost.length() - 1)
                : rawHost;
        // 只赋值一次：下面的 stream 要引用它（lambda 捕获的必须是 final / 事实上 final）
        final String host = hostValue.toLowerCase(Locale.ROOT);

        if (host.endsWith(".localhost") || host.startsWith("127.") || LOOPBACK_HOSTS.contains(host)) {
            return "站点地址 " + value + " 指向本机（" + host
                    + "）：收信人的「本机」不是部署博客的那台机器，点开必然打不开";
        }

        if (isPrivateHost(host)) {
            return "站点地址 " + value + " 是内网地址（" + host
                    + "）：只有同一内网能访问，收信人在公网点开打不开";
        }

        boolean reserved = RESERVED_RECIPIENT_DOMAINS.stream()
                .anyMatch(r -> host.equals(r) || host.endsWith("." + r));
        if (reserved) {
            return "站点地址 " + value + " 用的是保留域名（" + host
                    + "）：公网访问不到，收件人点开打不开";
        }

        return "";
    }

    /**
     * 发信出口的站点地址检查：不可用时打一行 warn（每个进程只打一次）
     *
     * <p>与「收件人不可送达」同样处理 —— 这类问题不报错、不影响发信，但邮件里的链接是坏的，
     * 必须在这里说出来，而不是等收件人点开发现打不开。与 Express warnIfSiteUrlUnusable() 同口径。
     */
    private void warnIfSiteUrlUnusable() {
        if (siteUrlWarned) {
            return;
        }
        String reason = undeliverableSiteUrlReason(effectiveSiteUrl());
        if (reason.isEmpty()) {
            return;
        }
        siteUrlWarned = true;
        log.warn("[mailer] {}。请在后端 .env 里把 SITE_URL 设成收信人能访问到的公网地址"
                + "（如 https://你的域名）后重启服务", reason);
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
        // 加密方式由 SMTP_SECURE / 端口推导，与 Express getMailerStatus() 同口径；
        // 实际写入 JavaMail 属性的地方在 config/MailTransportCustomizer.java
        MailEncryption encryption = MailEncryption.resolve(smtpPort, secureRaw);
        status.put("secure", encryption.isSsl());
        status.put("encryption", encryption.id());
        status.put("user", smtpUser == null ? "" : smtpUser);
        status.put("from", effectiveFrom());
        // 站点地址（邮件里的链接前缀）：空串 = 邮件里的链接不带域名，收件人点开是空页
        status.put("siteUrl", effectiveSiteUrl());
        // 站点地址不可用时的告警文案（空 / 本机 / 内网 / 保留域名 / 非法 URL）；空串 = 没问题
        status.put("siteUrlWarning", undeliverableSiteUrlReason(effectiveSiteUrl()));
        return status;
    }

    /**
     * 收件人是否**必然**收不到信（空 / 非邮箱 / 保留域名）。收不到时返回原因，否则返回空串。
     *
     * <p>⚠️ 只判「必然失败」的情况：不查 DNS、不验 MX，只挡住占位地址造成的退信。
     */
    public static String undeliverableReason(String email) {
        String address = email == null ? "" : email.trim();
        if (address.isEmpty()) {
            return "收件人为空";
        }
        int at = address.lastIndexOf('@');
        if (at < 0) {
            return "不是合法的邮箱地址";
        }
        String domain = address.substring(at + 1).toLowerCase(Locale.ROOT);
        // 精确或子域都算：foo.example.com / bar.test 同样没有 MX 记录
        boolean reserved = RESERVED_RECIPIENT_DOMAINS.stream()
                .anyMatch(r -> domain.equals(r) || domain.endsWith("." + r));
        if (reserved) {
            return "收件人 " + address + " 的域名 " + domain + " 是保留域名（没有 MX 记录），永远收不到信";
        }
        return "";
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

        // 必然收不到信的收件人直接跳过：否则会退信（连带把发信账号拖进垃圾邮件的坑）
        String undeliverable = undeliverableReason(to);
        if (!undeliverable.isEmpty()) {
            log.warn("[mailer] 已跳过发送：{}。请把收件人改成真实邮箱", undeliverable);
            return new SendResult(false, undeliverable);
        }

        // 站点地址不可用 → 邮件里的链接不可点，同样不能让它在出口悄悄过去
        warnIfSiteUrlUnusable();

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
