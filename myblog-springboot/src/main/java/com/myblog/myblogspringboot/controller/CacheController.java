package com.myblog.myblogspringboot.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.service.CacheStatsService;

/**
 * 缓存管理接口（管理员，对标 Express routes/cacheRoutes.js）
 *
 *   GET  /api/v1/cache/stats   查看缓存统计（命中率/键数量）
 *   POST /api/v1/cache/clear   清空全部缓存
 *   POST /api/v1/cache/preheat 手动触发预热
 */
@RestController
@RequestMapping("/api/v1/cache")
public class CacheController {

    private final CacheStatsService cacheStatsService;

    public CacheController(CacheStatsService cacheStatsService) {
        this.cacheStatsService = cacheStatsService;
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(cacheStatsService.getSnapshot()));
    }

    @PostMapping("/clear")
    public ResponseEntity<ApiResponse<Map<String, Object>>> clear() {
        int cleared = cacheStatsService.clearAll();
        return ResponseEntity.ok(
                ApiResponse.success(Map.of("cleared", cleared), "已清除 " + cleared + " 个缓存分区"));
    }

    @PostMapping("/preheat")
    public ResponseEntity<ApiResponse<Map<String, Object>>> preheat(@RequestBody(required = false) Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> prefixes = body != null
                ? (List<String>) body.getOrDefault("prefixes", List.of())
                : List.of();

        cacheStatsService.preheat(prefixes);
        return ResponseEntity.ok(
                ApiResponse.success(Map.of("prefixes", prefixes.isEmpty() ? List.of("settings", "types", "labels") : prefixes),
                        "预热任务已启动"));
    }
}
