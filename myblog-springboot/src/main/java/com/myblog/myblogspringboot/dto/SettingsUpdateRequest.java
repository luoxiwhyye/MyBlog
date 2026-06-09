package com.myblog.myblogspringboot.dto;

import java.util.Map;

public class SettingsUpdateRequest {
    private Map<String, String> settings;

    public Map<String, String> getSettings() { return settings; }
    public void setSettings(Map<String, String> settings) { this.settings = settings; }
}
