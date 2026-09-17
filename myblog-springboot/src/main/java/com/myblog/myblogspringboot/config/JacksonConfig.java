package com.myblog.myblogspringboot.config;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.core.JsonGenerator;
import tools.jackson.databind.SerializationContext;
import tools.jackson.databind.ValueSerializer;
import tools.jackson.databind.module.SimpleModule;

/**
 * 时间字段的 JSON 输出口径：与 Express 逐字节对齐的 UTC 瞬时串。
 *
 * <p>Express 侧 mysql2 把 {@code datetime} 字面量按「读时区」解释成 {@code Date}，
 * 再由 {@code JSON.stringify} 输出 UTC 瞬时串（毫秒固定 3 位），如
 * {@code 2026-09-13T11:10:49.000Z}；Spring 侧实体与 DTO 全是裸
 * {@link LocalDateTime}（无时区信息），Jackson 的 jsr310 序列化器默认给出
 * ISO-8601 无时区字面量（{@code 2026-09-13T19:10:49}）——同一瞬时、写法不同。
 *
 * <p>这里把 {@link LocalDateTime} 按 {@code app.time-zone} 解释成「写入数据库时
 * 使用的时区」，换算为 {@link Instant} 后按 {@code yyyy-MM-dd'T'HH:mm:ss.SSS'Z'}
 * 输出，从而与 Express 逐字节一致。
 *
 * <p>⚠️ 不用 {@code Instant.toString()}：它在毫秒为 0 时会省略 {@code .000}，
 * 得到 {@code 2026-09-13T11:10:49Z}，与 Express 的 {@code ...49.000Z} 不一致。
 *
 * <p>⚠️ {@code app.time-zone} 必须与「数据库写入端时区」相同（MySQL 会话
 * {@code time_zone} / Express 的 {@code DB_TIME_ZONE}）。若把数据库改成 UTC
 * 存储，必须同步改这一项，否则整体偏移 8 小时且不会报错。
 *
 * <p>⚠️ {@code spring.jackson.date-format} 与 {@code spring.jackson.time-zone}
 * 只作用于 {@code java.util.Date} / {@code Calendar}，对 {@code java.time} 类型
 * 无效，不能靠它们对齐口径。
 *
 * <p>⚠️ Spring Boot 4 的 Web 序列化走 Jackson 3（{@code tools.jackson.*}），
 * 定制入口是 {@link JsonMapperBuilderCustomizer}，而非 Jackson 2 的
 * {@code Jackson2ObjectMapperBuilderCustomizer}。
 *
 * <p>本类只注册序列化器、不动反序列化：所有 {@code @RequestBody} 都是
 * {@code Map}、纯字符串 DTO 或请求对象，没有任何 {@code LocalDateTime} 入参，
 * 另配反序列化器属于无谓改动。
 */
@Configuration(proxyBeanMethods = false)
public class JacksonConfig {

    private static final Logger log = LoggerFactory.getLogger(JacksonConfig.class);

    /** Express 的 {@code JSON.stringify(Date)} 形状：UTC、毫秒固定 3 位、字面量 Z。 */
    private static final DateTimeFormatter UTC_INSTANT_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").withZone(ZoneOffset.UTC);

    @Bean
    public JsonMapperBuilderCustomizer myblogTimeJsonMapperBuilderCustomizer(
            @Value("${app.time-zone:Asia/Shanghai}") String timeZone) {
        ZoneId zone = ZoneId.of(timeZone);
        log.info("时间字段输出口径：源时区 {} -> UTC 瞬时串（yyyy-MM-dd'T'HH:mm:ss.SSS'Z'）", zone);
        return builder -> builder.addModule(new SimpleModule("myblog-time")
                .addSerializer(LocalDateTime.class, new UtcInstantSerializer(zone)));
    }

    /** 按源时区解释无时区墙钟值，再输出为带毫秒的 UTC 瞬时串。 */
    private static final class UtcInstantSerializer extends ValueSerializer<LocalDateTime> {

        private final ZoneId sourceZone;

        private UtcInstantSerializer(ZoneId sourceZone) {
            this.sourceZone = sourceZone;
        }

        @Override
        public void serialize(LocalDateTime value, JsonGenerator gen, SerializationContext ctxt) {
            Instant instant = value.atZone(sourceZone).toInstant();
            gen.writeString(UTC_INSTANT_FORMAT.format(instant));
        }
    }
}
