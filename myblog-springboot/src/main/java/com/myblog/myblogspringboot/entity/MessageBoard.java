package com.myblog.myblogspringboot.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "message_board")
public class MessageBoard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "author_name", nullable = false, length = 50)
    private String authorName;

    @Column(name = "author_email", nullable = false, length = 100)
    private String authorEmail;

    @Column(name = "author_url", length = 500)
    private String authorUrl;

    @Column(name = "author_ip", length = 50)
    private String authorIp;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 20)
    private String status = "pending";

    /** 是否同意「留言通过审核后邮件通知我」（0=不接收，默认） */
    @Column(name = "notify_email", nullable = false)
    private Boolean notifyEmail = false;

    @Column(name = "create_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public String getAuthorEmail() { return authorEmail; }
    public void setAuthorEmail(String authorEmail) { this.authorEmail = authorEmail; }

    public String getAuthorUrl() { return authorUrl; }
    public void setAuthorUrl(String authorUrl) { this.authorUrl = authorUrl; }

    public String getAuthorIp() { return authorIp; }
    public void setAuthorIp(String authorIp) { this.authorIp = authorIp; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Boolean getNotifyEmail() { return notifyEmail; }
    public void setNotifyEmail(Boolean notifyEmail) { this.notifyEmail = notifyEmail; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
