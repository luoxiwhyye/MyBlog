package com.myblog.myblogspringboot.controller;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.entity.Setting;
import com.myblog.myblogspringboot.service.SettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    /**
     * 全量更新配置：兼容三种写法
     *   - 扁平字符串：{ settings: { key: "value" } } 或 { key: "value" }
     *   - 结构化：{ settings: { key: { value, type?, description? } } }
     *   - 列表：{ configs: [{ key, value, type?, description? }] }
     */
    @PutMapping
    public ResponseEntity<ApiResponse<Void>> updateSettings(@RequestBody Map<String, Object> body) {
        Object configsRaw = body.get("configs");
        if (configsRaw instanceof List<?> list) {
            settingService.updateStructuredSettings(castConfigList(list));
        } else {
            Object settingsRaw = body.get("settings");
            if (settingsRaw instanceof Map<?, ?> settingsMap && isStructuredMap(settingsMap)) {
                settingService.updateStructuredSettings(convertStructuredMap(settingsMap));
            } else {
                @SuppressWarnings("unchecked")
                Map<String, String> settings = (Map<String, String>) body.getOrDefault(
                        "settings",
                        body.entrySet().stream()
                                .filter(e -> e.getValue() instanceof String)
                                .collect(Collectors.toMap(Map.Entry::getKey, e -> (String) e.getValue())));
                settingService.updateSettings(settings);
            }
        }
        return ResponseEntity.ok(ApiResponse.success(null, "配置更新成功"));
    }

    /**
     * 新增单个自定义配置
     */
    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createSetting(@RequestBody Map<String, Object> body) {
        Setting setting = settingService.createSetting(
                (String) body.get("key"),
                body.get("value") != null ? String.valueOf(body.get("value")) : null,
                (String) body.get("type"),
                (String) body.get("description"));
        return ResponseEntity.status(201).body(ApiResponse.success(toSettingMap(setting), "配置创建成功", 201));
    }

    /**
     * 更新单个自定义配置（只更新传入字段，其余保留）
     */
    @PutMapping("/{key}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSettingByKey(
            @PathVariable String key,
            @RequestBody Map<String, Object> body) {
        Setting setting = settingService.updateSettingByKey(
                key,
                body.get("value") != null ? String.valueOf(body.get("value")) : null,
                (String) body.get("type"),
                (String) body.get("description"));
        return ResponseEntity.ok(ApiResponse.success(toSettingMap(setting), "配置更新成功"));
    }

    /**
     * 删除单个自定义配置
     */
    @DeleteMapping("/{key}")
    public ResponseEntity<ApiResponse<Void>> deleteSetting(@PathVariable String key) {
        settingService.deleteSetting(key);
        return ResponseEntity.ok(ApiResponse.success(null, "配置删除成功"));
    }

    private static List<Map<String, Object>> castConfigList(List<?> list) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                result.add(convertEntry(map));
            }
        }
        return result;
    }

    private static boolean isStructuredMap(Map<?, ?> settingsMap) {
        return settingsMap.values().stream().anyMatch(v -> v instanceof Map);
    }

    private static List<Map<String, Object>> convertStructuredMap(Map<?, ?> settingsMap) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<?, ?> entry : settingsMap.entrySet()) {
            if (entry.getValue() instanceof Map<?, ?> map) {
                Map<String, Object> config = new LinkedHashMap<>();
                config.put("key", String.valueOf(entry.getKey()));
                config.put("value", map.get("value") != null ? String.valueOf(map.get("value")) : "");
                config.put("type", map.get("type") != null ? String.valueOf(map.get("type")) : "text");
                config.put("description", map.get("description") != null ? String.valueOf(map.get("description")) : "");
                result.add(config);
            }
        }
        return result;
    }

    private static Map<String, Object> convertEntry(Map<?, ?> map) {
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("key", String.valueOf(map.get("key")));
        config.put("value", map.get("value") != null ? String.valueOf(map.get("value")) : "");
        config.put("type", map.get("type") != null ? String.valueOf(map.get("type")) : "text");
        config.put("description", map.get("description") != null ? String.valueOf(map.get("description")) : "");
        return config;
    }

    private static Map<String, Object> toSettingMap(Setting setting) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("key", setting.getSettingKey());
        result.put("value", setting.getSettingValue());
        result.put("type", setting.getSettingType() != null ? setting.getSettingType() : "text");
        result.put("description", setting.getDescription() != null ? setting.getDescription() : "");
        return result;
    }
}
