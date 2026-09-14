package com.myblog.myblogspringboot.controller;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.dto.ErrorLogDTO;
import com.myblog.myblogspringboot.dto.ErrorLogRequest;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.service.ClientErrorLogService;

/**
 * 前端错误监控接口（对标 Express routes/errorLogRoutes.js）
 *
 *   POST   /api/v1/error-log   接收上报（公开，限流）
 *   GET    /api/v1/error-log   列表（管理员）
 *   DELETE /api/v1/error-log   清空（管理员）
 */
@RestController
@RequestMapping("/api/v1/error-log")
public class ClientErrorLogController {

    private final ClientErrorLogService service;

    public ClientErrorLogController(ClientErrorLogService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> create(@RequestBody ErrorLogRequest request) {
        Long id = service.createErrorLog(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(Map.of("id", id), "上报成功", 201));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ErrorLogDTO>>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String type) {
        return ResponseEntity.ok(ApiResponse.success(service.getErrorLogs(page, pageSize, type)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> clear() {
        int affected = service.clearAll();
        return ResponseEntity.ok(
                ApiResponse.success(Map.of("affected", affected), "已清空 " + affected + " 条错误日志"));
    }
}
