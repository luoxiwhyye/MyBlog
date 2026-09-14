package com.myblog.myblogspringboot.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.service.MetricsService;

/**
 * 性能监控接口（管理员，对标 Express routes/metricsRoutes.js）。
 *
 * 响应结构与 Express 的 /api/v1/metrics 一致，供后台「缓存运维」页解析。
 * Spring 侧另有 Actuator（/actuator/prometheus），但结构不同、页面用不了。
 */
@RestController
@RequestMapping("/api/v1/metrics")
public class MetricsController {

    private final MetricsService metricsService;

    public MetricsController(MetricsService metricsService) {
        this.metricsService = metricsService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSnapshot() {
        return ResponseEntity.ok(ApiResponse.success(metricsService.getSnapshot()));
    }
}
