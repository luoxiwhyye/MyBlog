package com.myblog.myblogspringboot.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 文章导航 / 相关推荐轻量结构，对齐 Express 的 formatNav 与 getRelatedArticles 输出。
 *
 * <p>全局 spring.jackson.default-property-inclusion=non_null：
 * <ul>
 *   <li>「上一篇 / 下一篇」只填 基础字段，viewCount / relevanceScore / sharedLabels 为 null
 *       时自动省略 —— 与 Express 的 adjacent 结构一致；</li>
 *   <li>「相关推荐」填全部字段 —— 与 Express 的 related 结构一致。</li>
 * </ul>
 */
public class ArticleNavDTO {

    private Integer id;
    private String title;
    private String summary;
    private String coverImage;
    private Integer viewCount;
    private LocalDateTime createdAt;
    private ArticleDTO.TypeInfo type;
    /** 相关性得分（共享标签 ×2 + 同分类 ×1），仅相关推荐返回 */
    private Integer relevanceScore;
    /** 与当前文章共享的标签名，仅相关推荐返回 */
    private List<String> sharedLabels;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }

    public Integer getViewCount() { return viewCount; }
    public void setViewCount(Integer viewCount) { this.viewCount = viewCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public ArticleDTO.TypeInfo getType() { return type; }
    public void setType(ArticleDTO.TypeInfo type) { this.type = type; }

    public Integer getRelevanceScore() { return relevanceScore; }
    public void setRelevanceScore(Integer relevanceScore) { this.relevanceScore = relevanceScore; }

    public List<String> getSharedLabels() { return sharedLabels; }
    public void setSharedLabels(List<String> sharedLabels) { this.sharedLabels = sharedLabels; }
}
