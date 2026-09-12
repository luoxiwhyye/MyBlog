package com.myblog.myblogspringboot.dto;

import java.time.LocalDateTime;

/**
 * 轻量搜索结果项（命令面板 / 全局搜索入口使用）
 *
 * 刻意不含 content —— 搜索建议列表只需要标题、摘要与分类，
 * 带上正文会让每次输入都传输大量 HTML。
 */
public class SearchItemDTO {
    private Integer id;
    private String title;
    private String summary;
    private String coverImage;
    private LocalDateTime createdAt;
    private String typeName;

    /** JPQL 构造表达式所需的构造函数（参数顺序不可改动） */
    public SearchItemDTO(Integer id, String title, String summary, String coverImage,
                         LocalDateTime createdAt, String typeName) {
        this.id = id;
        this.title = title;
        this.summary = summary;
        this.coverImage = coverImage;
        this.createdAt = createdAt;
        this.typeName = typeName;
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getTypeName() { return typeName; }
    public void setTypeName(String typeName) { this.typeName = typeName; }
}
