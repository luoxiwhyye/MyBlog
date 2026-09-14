package com.myblog.myblogspringboot.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

/**
 * 前端错误监控上报 — 客户端错误日志（对标 Express models/ClientErrorLog.js）。
 *
 * 表 client_error_log 早已存在（Express 端在用），Spring 侧此前整套缺失。
 */
@Entity
@Table(name = "client_error_log")
public class ClientErrorLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 错误类型（VueError / window:error / window:unhandledrejection 等） */
    @Column(nullable = false, length = 120)
    private String title = "";

    @Column(columnDefinition = "TEXT")
    private String message;

    /** 出错文件 / URL */
    @Column(length = 500)
    private String source = "";

    @Column
    private Integer line;

    @Column(name = "col")
    private Integer col;

    /** 出错页面 URL */
    @Column(length = 500)
    private String url = "";

    /** 触发组件 / 来源 */
    @Column(length = 200)
    private String component = "";

    /** 浏览器 UA */
    @Column(length = 500)
    private String ua = "";

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @PrePersist
    protected void onCreate() {
        occurredAt = LocalDateTime.now();
    }

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
