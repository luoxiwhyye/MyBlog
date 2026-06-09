package com.myblog.myblogspringboot.controller;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Map<String, Object> stats = dashboardService.getStats();
        return ResponseEntity.ok(ApiResponse.success(stats));
    }

    @GetMapping("/charts")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCharts(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(defaultValue = "published") String scope) {
        Map<String, Object> charts = dashboardService.getCharts(days, scope);
        return ResponseEntity.ok(ApiResponse.success(charts));
    }
}
