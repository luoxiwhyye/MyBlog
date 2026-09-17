package com.myblog.myblogspringboot.config;

import java.util.Properties;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;

/**
 * 把 {@code SMTP_SECURE} 推导出的加密方式写进 JavaMail 属性。
 *
 * <p>为什么用 {@link BeanPostProcessor} 而不是在 {@code application.yml} 里写死：
 * yml 的占位符只能做「取值 / 回退默认」，做不了「显式取值 → 否，则按端口推导」这种三态判断。
 * Boot 的 {@code MailSenderPropertiesConfiguration} 会先创建 {@code JavaMailSenderImpl}
 * 并套用 yml 里的属性，这里在其之后覆盖 ssl / starttls 三项即可。
 *
 * <p>映射关系（与 Express 传给 nodemailer 的选项语义一致）：
 * <pre>
 *   SSL      → ssl.enable=true,  starttls.enable=false, starttls.required=false
 *   STARTTLS → ssl.enable=false, starttls.enable=true,  starttls.required=true
 *   NONE     → ssl.enable=false, starttls.enable=false, starttls.required=false
 * </pre>
 *
 * <p>⚠️ STARTTLS 用 {@code required=true}（而非仅 {@code enable=true}）：显式声明了 STARTTLS
 * 却连到不支持的服务端时，应当**报错**而不是静默退回明文 —— 否则账号密码会以明文发出。
 * 未声明（NONE）时不设 required，与 Express 的 {@code ignoreTLS} 同义。
 *
 * <p>同时钉死连接级超时：JavaMail 的 {@code connectiontimeout} / {@code timeout} 默认是**无限**，
 * 服务端不配合时（如声明了 STARTTLS 而对方只支持明文）会让「发送测试邮件」长时间无响应。
 * 取值与 Express {@code services/mailer.js} 的 CONNECT_TIMEOUT_MS / SOCKET_TIMEOUT_MS 一致。
 *
 * <p>只依赖 {@link Environment}（不用 {@code @Value}）：{@code BeanPostProcessor} 在容器极早期
 * 初始化，字段注入此时尚未就绪。
 */
@Component
public class MailTransportCustomizer implements BeanPostProcessor, EnvironmentAware {

    private static final Logger log = LoggerFactory.getLogger(MailTransportCustomizer.class);

    /** 连接 / 问候 / 读写超时（毫秒）—— 对齐 Express 的 SMTP_TIMEOUT_MS */
    private static final String SMTP_TIMEOUT_MS = "10000";

    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        if (!(bean instanceof JavaMailSenderImpl sender) || environment == null) {
            return bean;
        }

        int port = environment.getProperty("spring.mail.port", Integer.class, 465);
        String raw = environment.getProperty("app.mail.secure", "");
        MailEncryption encryption = MailEncryption.resolve(port, raw);

        if (MailEncryption.isUnrecognized(raw)) {
            log.warn("[mailer] SMTP_SECURE 取值无法识别（{}），已按端口 {} 推导为 {}（可选值：ssl / starttls / none）",
                    raw, port, encryption.id());
        }

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.ssl.enable", String.valueOf(encryption.isSsl()));
        props.put("mail.smtp.starttls.enable", String.valueOf(encryption == MailEncryption.STARTTLS));
        props.put("mail.smtp.starttls.required", String.valueOf(encryption == MailEncryption.STARTTLS));
        props.put("mail.smtp.connectiontimeout", SMTP_TIMEOUT_MS);
        props.put("mail.smtp.timeout", SMTP_TIMEOUT_MS);
        props.put("mail.smtp.writetimeout", SMTP_TIMEOUT_MS);

        log.info("[mailer] SMTP 加密方式：{}（端口 {}，连接 / 读写超时 {}ms）",
                encryption.id(), port, SMTP_TIMEOUT_MS);
        return bean;
    }
}
