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
@Table(name = "comment")
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "article_id", nullable = false)
    private Integer articleId;

    @Column(name = "parent_id")
    private Integer parentId;

    /**
     * 被回复的**具体**那条评论。
     *
     * 评论是两级扁平结构：回复二级评论时 parentId 会被写入其顶层父评论，因此仅凭
     * parentId 无法知道「你回复的是谁」。回复通知是审核通过后才发的，那时拿不到请求里
     * 的目标，只能靠落库 —— 没有这一列，二级回复者永远收不到通知。
     * 为空时（存量数据 / 旧客户端）回退用 parentId。
     */
    @Column(name = "reply_to_id")
    private Integer replyToId;

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

    @Column(name = "like_count", nullable = false)
    private Integer likeCount = 0;

    /** 是否同意「有人回复我时邮件通知我」（0=不接收，默认） */
    @Column(name = "notify_email", nullable = false)
    private Boolean notifyEmail = false;

    @Column(nullable = false, length = 20)
    private String status = "pending";

    @Column(name = "create_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public Integer getArticleId() { return articleId; }
    public void setArticleId(Integer articleId) { this.articleId = articleId; }

    public Integer getParentId() { return parentId; }
    public void setParentId(Integer parentId) { this.parentId = parentId; }

    public Integer getReplyToId() { return replyToId; }
    public void setReplyToId(Integer replyToId) { this.replyToId = replyToId; }

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

    public Integer getLikeCount() { return likeCount; }
    public void setLikeCount(Integer likeCount) { this.likeCount = likeCount; }

    public Boolean getNotifyEmail() { return notifyEmail; }
    public void setNotifyEmail(Boolean notifyEmail) { this.notifyEmail = notifyEmail; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
