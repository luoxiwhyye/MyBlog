package com.myblog.myblogspringboot.controller;

import com.myblog.myblogspringboot.service.MeilisearchService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * O-04: 增强健康检查 — 返回数据库/Redis/Meilisearch 连接状态和运行时间
 */
@RestController
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);
    private final Instant startTime = Instant.now();

    @Autowired(required = false)
    private DataSource dataSource;

    @Autowired(required = false)
    private MeilisearchService meilisearchService;

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

        // Redis 状态
        Map<String, Object> redis = new LinkedHashMap<>();
        redis.put("status", "not_checked");
        data.put("redis", redis);

        // Meilisearch 状态
        Map<String, Object> meili = new LinkedHashMap<>();
        if (meilisearchService != null) {
            meili.put("status", meilisearchService.isAvailable() ? "ok" : "unavailable");
        } else {
            meili.put("status", "not_configured");
        }
        data.put("meilisearch", meili);

        return ResponseEntity.ok(data);
    }
}
