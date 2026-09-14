package com.myblog.myblogspringboot.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 错误日志列表项，字段与 Express models/ClientErrorLog.getList 的 SELECT 别名逐一对齐。
 *
 * <p>⚠️ 保留显式 ALWAYS（与全局 spring.jackson.default-property-inclusion=always 一致）：
 * line / col / message 为 null 时必须输出显式 null，与 Express 一致；
 * 显式声明可防「全局配置被改回 non_null」时静默丢键。
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public class ErrorLogDTO {

    private Long id;
    private String title;
    private String message;
    private String source;
    private Integer line;
    private Integer col;
    private String url;
    private String component;
    private String ua;
    private LocalDateTime occurredAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public Integer getLine() { return line; }
    public void setLine(Integer line) { this.line = line; }

    public Integer getCol() { return col; }
    public void setCol(Integer col) { this.col = col; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getComponent() { return component; }
    public void setComponent(String component) { this.component = component; }

    public String getUa() { return ua; }
    public void setUa(String ua) { this.ua = ua; }

    public LocalDateTime getOccurredAt() { return occurredAt; }
    public void setOccurredAt(LocalDateTime occurredAt) { this.occurredAt = occurredAt; }
}
