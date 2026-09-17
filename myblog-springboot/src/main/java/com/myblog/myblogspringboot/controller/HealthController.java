package com.myblog.myblogspringboot.controller;

import java.sql.Connection;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.myblog.myblogspringboot.service.MailService;
import com.myblog.myblogspringboot.service.MeilisearchService;

/**
 * O-04: 增强健康检查 — 返回数据库/Redis/Meilisearch 连接状态和运行时间
 */
@RestController
public class HealthController {

    private final Instant startTime = Instant.now();

    @Autowired(required = false)
    private DataSource dataSource;

    @Autowired(required = false)
    private MeilisearchService meilisearchService;

    @Autowired(required = false)
    private RedisConnectionFactory redisConnectionFactory;

    @Autowired(required = false)
    private MailService mailService;

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "ok");
        data.put("timestamp", Instant.now().toString());
        data.put("uptime", Duration.between(startTime, Instant.now()).toSeconds());

        // 数据库状态
        Map<String, Object> db = new LinkedHashMap<>();
        try {
            if (dataSource != null) {
                try (Connection conn = dataSource.getConnection()) {
                    db.put("status", conn.isValid(2) ? "ok" : "error");
                }
            } else {
                db.put("status", "not_configured");
            }
        } catch (Exception e) {
            db.put("status", "error");
            db.put("message", e.getMessage());
        }
        data.put("database", db);

        // Redis 状态（真实探测，对标 Express /health）
        Map<String, Object> redis = new LinkedHashMap<>();
        if (redisConnectionFactory == null) {
            redis.put("status", "not_configured");
        } else {
            try (RedisConnection connection = redisConnectionFactory.getConnection()) {
                redis.put("status", "PONG".equals(connection.ping()) ? "ok" : "error");
            } catch (Exception e) {
                redis.put("status", "error");
                redis.put("message", e.getMessage());
            }
        }
        data.put("redis", redis);

        // Meilisearch 状态（带原因：密钥错 / 连不上都会显得「正常」但实际降级 LIKE）
        Map<String, Object> meili;
        if (meilisearchService != null) {
            meili = meilisearchService.getStatus();
        } else {
            meili = new LinkedHashMap<>();
            meili.put("status", "not_configured");
            meili.put("reason", "MeilisearchService 未加载");
        }
        data.put("meilisearch", meili);

        // 邮件通知状态（SMTP 未配置时 MailService 会静默降级，故在健康检查里显式暴露）
        Map<String, Object> mail = new LinkedHashMap<>();
        mail.put("status", mailService != null && mailService.isAvailable() ? "ok" : "disabled");
        data.put("mail", mail);

        return ResponseEntity.ok(data);
    }
}
