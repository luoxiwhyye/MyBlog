package com.myblog.myblogspringboot.dto;

/**
 * 前端错误上报请求体，字段与 Express clientErrorLogController.createErrorLog 的
 * {@code req.body} 解构一致。
 */
public class ErrorLogRequest {

    private String title;
    private String message;
    private String source;
    private Integer line;
    private Integer col;
    private String url;
    private String component;
    private String ua;

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
}
