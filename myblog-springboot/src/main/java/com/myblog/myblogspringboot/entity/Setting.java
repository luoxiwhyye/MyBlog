package com.myblog.myblogspringboot.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "setting")
public class Setting {

    @Id
    @Column(name = "setting_key", length = 100)
    private String settingKey;

    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String settingValue;

    @Column(name = "setting_type", length = 50, columnDefinition = "VARCHAR(50) DEFAULT 'text'")
    private String settingType = "text";

    @Column(length = 255)
    private String description;

    public String getSettingKey() { return settingKey; }
    public void setSettingKey(String settingKey) { this.settingKey = settingKey; }

    public String getSettingValue() { return settingValue; }
    public void setSettingValue(String settingValue) { this.settingValue = settingValue; }

    public String getSettingType() { return settingType; }
    public void setSettingType(String settingType) { this.settingType = settingType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
