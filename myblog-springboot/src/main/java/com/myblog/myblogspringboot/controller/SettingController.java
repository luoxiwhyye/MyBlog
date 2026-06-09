package com.myblog.myblogspringboot.controller;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.service.SettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/settings")
public class SettingController {

    private final SettingService settingService;

    public SettingController(SettingService settingService) {
        this.settingService = settingService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSettings() {
        Map<String, Object> settings = settingService.getAllSettings();
        return ResponseEntity.ok(ApiResponse.success(settings));
    }

    @GetMapping("/{key}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSettingByKey(@PathVariable String key) {
        Map<String, Object> setting = settingService.getSettingByKey(key);
        return ResponseEntity.ok(ApiResponse.success(setting));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Void>> updateSettings(@RequestBody Map<String, Object> body) {
        // Support both flat and nested settings format
        @SuppressWarnings("unchecked")
        Map<String, String> settings = (Map<String, String>) body.getOrDefault("settings",
                body.entrySet().stream()
                        .filter(e -> e.getValue() instanceof String)
                        .collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, e -> (String) e.getValue())));

        settingService.updateSettings(settings);
        return ResponseEntity.ok(ApiResponse.success(null, "配置更新成功"));
    }
}
