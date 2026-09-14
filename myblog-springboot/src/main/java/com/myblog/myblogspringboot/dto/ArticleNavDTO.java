package com.myblog.myblogspringboot.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 文章导航 / 相关推荐轻量结构，对齐 Express 的 formatNav 与 getRelatedArticles 输出。
 *
 * <p>两套结构共用一个类，靠「无值字段整条省略」来区分：
 * <ul>
 *   <li>「上一篇 / 下一篇」只填 基础字段 → viewCount / relevanceScore / sharedLabels
 *       为 null 时省略，与 Express 的 adjacent 结构一致；</li>
 *   <li>「相关推荐」填全部字段，与 Express 的 related 结构一致。</li>
 * </ul>
 *
 * <p>⚠️ 这三个字段必须用**字段级** {@code @JsonInclude(NON_NULL)}：全局
 * spring.jackson.default-property-inclusion 已改为 always（为了让 data / email /
 * authorUrl 等 null 字段与 Express 一致），若不在字段上显式声明，
 * 「上一篇 / 下一篇」会多出 {@code "relevanceScore": null} / {@code "sharedLabels": null}
 * 两个 Express 根本没有的键（2026-09-14 实测踩到）。
 */
public class ArticleNavDTO {

    private Integer id;
    private String title;
    private String summary;
    private String coverImage;
    /** 仅相关推荐返回（adjacent 时省略） */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer viewCount;
    private LocalDateTime createdAt;
    private ArticleDTO.TypeInfo type;
    /** 相关性得分（共享标签 ×2 + 同分类 ×1），仅相关推荐返回 */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer relevanceScore;
    /** 与当前文章共享的标签名，仅相关推荐返回（空列表仍保留，与 Express 的 [] 一致） */
    @JsonInclude(JsonInclude.Include.NON_NULL)
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
