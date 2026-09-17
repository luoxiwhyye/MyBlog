package com.myblog.myblogspringboot.config;

import java.util.Locale;
import java.util.Optional;

/**
 * SMTP 传输加密方式 —— 由 {@code SMTP_SECURE} 决定，未配置时按端口推导。
 *
 * <p>与 Express {@code services/mailer.js} 的解析规则**逐条对齐**（同一份 .env 必须得出同一结论）：
 * <ul>
 *   <li>显式取值：{@code ssl}（直连 SSL，通常 465）/ {@code starttls}（明文握手后升级，通常 587）/ {@code none}（不加密）</li>
 *   <li>宽松别名：{@code true/1} → ssl，{@code tls} → starttls，{@code plain/false/0} → none</li>
 *   <li>未配置或取值无法识别 → 按端口推导：465 → ssl，587 → starttls，其余 → none</li>
 * </ul>
 *
 * <p>「未配置」与「取值非法」都走端口推导，差别只在后者会打一行 warn
 * （见 {@link MailTransportCustomizer}）—— 静默吃掉拼错的配置比报错更难查。
 */
public enum MailEncryption {

    SSL("ssl"),
    STARTTLS("starttls"),
    NONE("none");

    private final String id;

    MailEncryption(String id) {
        this.id = id;
    }

    /** 对外展示 / 接口返回用的标识（与 Express 返回的字符串一致） */
    public String id() {
        return id;
    }

    /** 只认显式 token；无法识别（含空白）返回空 */
    public static Optional<MailEncryption> parse(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        return switch (raw.trim().toLowerCase(Locale.ROOT)) {
            case "ssl", "true", "1" -> Optional.of(SSL);
            case "starttls", "tls" -> Optional.of(STARTTLS);
            case "none", "plain", "false", "0" -> Optional.of(NONE);
            default -> Optional.empty();
        };
    }

    /** 解析失败时按端口推导（465 / 587 是事实标准，其余视作不加密） */
    public static MailEncryption resolve(int port, String raw) {
        return parse(raw).orElseGet(() -> port == 465 ? SSL : port == 587 ? STARTTLS : NONE);
    }

    /** raw 非空却无法识别（供调用方决定是否告警） */
    public static boolean isUnrecognized(String raw) {
        return raw != null && !raw.isBlank() && parse(raw).isEmpty();
    }

    public boolean isSsl() {
        return this == SSL;
    }
}
