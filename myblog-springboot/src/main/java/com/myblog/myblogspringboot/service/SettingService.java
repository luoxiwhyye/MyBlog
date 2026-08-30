package com.myblog.myblogspringboot.service;

import com.myblog.myblogspringboot.entity.Setting;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.SettingRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Service
public class SettingService {

    private final SettingRepository settingRepository;

    public SettingService(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    private static final Pattern KEY_PATTERN = Pattern.compile("^[\\p{L}\\p{N}_.-]{1,100}$");
    private static final Set<String> SETTING_TYPES = Set.of("text", "image", "html", "boolean");

    private static String normalizeKey(String key) {
        return key == null ? "" : key.trim();
    }

    private void assertValidKey(String key) {
        if (key == null || key.isEmpty()) {
            throw new BusinessException(400, "配置键不能为空");
        }
        if (key.length() > 100) {
            throw new BusinessException(400, "配置键长度不能超过 100");
        }
        if (!KEY_PATTERN.matcher(key).matches()) {
            throw new BusinessException(400, "配置键只能包含字母、数字、下划线、点、连字符");
        }
    }

    private void assertValidType(String type) {
        if (type != null && !SETTING_TYPES.contains(type)) {
            throw new BusinessException(400, "配置类型非法");
        }
    }

    private void assertValidDescription(String description) {
        if (description != null && description.length() > 255) {
            throw new BusinessException(400, "配置描述长度不能超过 255");
        }
    }

    @Cacheable(value = "settings", key = "'all'", unless = "#result == null || #result.isEmpty()")
    public Map<String, Object> getAllSettings() {
        List<Setting> settings = settingRepository.findAll();
        Map<String, Object> result = new LinkedHashMap<>();

        for (Setting setting : settings) {
            Map<String, String> info = new LinkedHashMap<>();
            info.put("value", setting.getSettingValue());
            info.put("type", setting.getSettingType() != null ? setting.getSettingType() : "text");
            info.put("description", setting.getDescription() != null ? setting.getDescription() : "");
            result.put(setting.getSettingKey(), info);
        }

        return result;
    }

    @Cacheable(value = "settings", key = "#key", unless = "#result == null")
    public Map<String, Object> getSettingByKey(String key) {
        Setting setting = settingRepository.findBySettingKey(key)
                .orElseThrow(() -> new BusinessException(404, "配置不存在"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("key", setting.getSettingKey());
        result.put("value", setting.getSettingValue());
        return result;
    }

    @Transactional
    @CacheEvict(value = "settings", allEntries = true)
    public void upsertSetting(String key, String value, String type, String description) {
        String normalizedKey = normalizeKey(key);
        assertValidKey(normalizedKey);

        String nextType = type != null ? type : "text";
        assertValidType(nextType);
        assertValidDescription(description);

        Optional<Setting> existing = settingRepository.findBySettingKey(normalizedKey);

        Setting setting;
        if (existing.isPresent()) {
            setting = existing.get();
        } else {
            setting = new Setting();
            setting.setSettingKey(normalizedKey);
        }

        setting.setSettingValue(value);
        setting.setSettingType(nextType);
        if (description != null) setting.setDescription(description);

        settingRepository.save(setting);
    }

    @Transactional
    @CacheEvict(value = "settings", allEntries = true)
    public void updateSettings(Map<String, String> settings) {
        for (Map.Entry<String, String> entry : settings.entrySet()) {
            upsertSetting(entry.getKey(), entry.getValue(), "text", null);
        }
    }

    @Transactional
    @CacheEvict(value = "settings", allEntries = true)
    public void updateStructuredSettings(List<Map<String, Object>> configs) {
        for (Map<String, Object> config : configs) {
            String key = normalizeKey(String.valueOf(config.getOrDefault("key", "")));
            String value = config.get("value") != null ? String.valueOf(config.get("value")) : "";
            String type = config.get("type") != null ? String.valueOf(config.get("type")) : "text";
            String description = config.get("description") != null ? String.valueOf(config.get("description")) : "";
            upsertSetting(key, value, type, description);
        }
    }

    @Transactional
    @CacheEvict(value = "settings", allEntries = true)
    public Setting createSetting(String key, String value, String type, String description) {
        String normalizedKey = normalizeKey(key);
        assertValidKey(normalizedKey);

        String nextType = type != null ? type : "text";
        assertValidType(nextType);
        assertValidDescription(description);

        if (settingRepository.existsById(normalizedKey)) {
            throw new BusinessException(409, "配置键 " + normalizedKey + " 已存在");
        }

        Setting setting = new Setting();
        setting.setSettingKey(normalizedKey);
        setting.setSettingValue(value != null ? value : "");
        setting.setSettingType(nextType);
        setting.setDescription(description != null ? description : "");
        return settingRepository.save(setting);
    }

    @Transactional
    @CacheEvict(value = "settings", allEntries = true)
    public Setting updateSettingByKey(String key, String value, String type, String description) {
        String normalizedKey = normalizeKey(key);
        assertValidKey(normalizedKey);

        Setting setting = settingRepository.findBySettingKey(normalizedKey)
                .orElseThrow(() -> new BusinessException(404, "配置不存在"));

        if (value != null) setting.setSettingValue(value);
        if (type != null) {
            assertValidType(type);
            setting.setSettingType(type);
        }
        if (description != null) {
            assertValidDescription(description);
            setting.setDescription(description);
        }

        return settingRepository.save(setting);
    }

    @Transactional
    @CacheEvict(value = "settings", allEntries = true)
    public void deleteSetting(String key) {
        String normalizedKey = normalizeKey(key);
        assertValidKey(normalizedKey);

        if (!settingRepository.existsById(normalizedKey)) {
            throw new BusinessException(404, "配置不存在");
        }

        settingRepository.deleteById(normalizedKey);
    }
}
