package com.myblog.myblogspringboot.service;

import com.myblog.myblogspringboot.entity.Setting;
import com.myblog.myblogspringboot.exception.BusinessException;
import com.myblog.myblogspringboot.repository.SettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SettingService {

    private final SettingRepository settingRepository;

    public SettingService(SettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

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

    public Map<String, Object> getSettingByKey(String key) {
        Setting setting = settingRepository.findBySettingKey(key)
                .orElseThrow(() -> new BusinessException(404, "配置不存在"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("key", setting.getSettingKey());
        result.put("value", setting.getSettingValue());
        return result;
    }

    @Transactional
    public void upsertSetting(String key, String value, String type, String description) {
        Optional<Setting> existing = settingRepository.findBySettingKey(key);

        Setting setting;
        if (existing.isPresent()) {
            setting = existing.get();
        } else {
            setting = new Setting();
            setting.setSettingKey(key);
        }

        setting.setSettingValue(value);
        if (type != null) setting.setSettingType(type);
        else if (setting.getSettingType() == null) setting.setSettingType("text");
        if (description != null) setting.setDescription(description);

        settingRepository.save(setting);
    }

    @Transactional
    public void updateSettings(Map<String, String> settings) {
        for (Map.Entry<String, String> entry : settings.entrySet()) {
            upsertSetting(entry.getKey(), entry.getValue(), "text", null);
        }
    }
}
