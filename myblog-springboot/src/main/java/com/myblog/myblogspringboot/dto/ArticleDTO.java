package com.myblog.myblogspringboot.dto;

import java.time.LocalDateTime;
import java.util.List;

public class ArticleDTO {
    private Integer id;
    private String title;
    private String summary;
    private String content;
    private String contentFormat;
    private String coverImage;
    private Integer viewCount;
    private String status;
    private Boolean isPinned;
    private Boolean isFeatured;
    /**
     * 是否开放评论区。
     *
     * <p>⚠️ 声明位置必须紧随 {@link #isFeatured} —— Express 的 formatArticle 就是把它
     * 接在 isFeatured 后面，两端键序要逐项一致。
     */
    private Boolean commentEnabled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
    private Integer typeId;
    private TypeInfo type;
    /**
     * 标签 id 列表（对齐 Express，admin 文章编辑页直接取该字段回填标签）。
     *
     * <p>⚠️ 与 {@link #labels} 的**声明顺序必须照抄 Express**（labelIds 在前）：
     * 两端的键序要逐项一致，而键序就是这里的声明顺序。
     */
    private List<Integer> labelIds;
    private List<LabelInfo> labels;

    public static class TypeInfo {
        private Integer id;
        private String typeName;
        public TypeInfo() {}
        public TypeInfo(Integer id, String typeName) { this.id = id; this.typeName = typeName; }
        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }
        public String getTypeName() { return typeName; }
        public void setTypeName(String typeName) { this.typeName = typeName; }
    }

    public static class LabelInfo {
        private Integer id;
        private String labelName;
        public LabelInfo() {}
        public LabelInfo(Integer id, String labelName) { this.id = id; this.labelName = labelName; }
        public Integer getId() { return id; }
        public void setId(Integer id) { this.id = id; }
        public String getLabelName() { return labelName; }
        public void setLabelName(String labelName) { this.labelName = labelName; }
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getContentFormat() { return contentFormat; }
    public void setContentFormat(String contentFormat) { this.contentFormat = contentFormat; }
    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
    public Integer getViewCount() { return viewCount; }
    public void setViewCount(Integer viewCount) { this.viewCount = viewCount; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Boolean getIsPinned() { return isPinned; }
    public void setIsPinned(Boolean isPinned) { this.isPinned = isPinned; }
    public Boolean getIsFeatured() { return isFeatured; }
    public void setIsFeatured(Boolean isFeatured) { this.isFeatured = isFeatured; }
    public Boolean getCommentEnabled() { return commentEnabled; }
    public void setCommentEnabled(Boolean commentEnabled) { this.commentEnabled = commentEnabled; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public LocalDateTime getDeletedAt() { return deletedAt; }
    public void setDeletedAt(LocalDateTime deletedAt) { this.deletedAt = deletedAt; }
    public Integer getTypeId() { return typeId; }
    public void setTypeId(Integer typeId) { this.typeId = typeId; }
    public TypeInfo getType() { return type; }
    public void setType(TypeInfo type) { this.type = type; }
    public List<LabelInfo> getLabels() { return labels; }
    public void setLabels(List<LabelInfo> labels) { this.labels = labels; }
    public List<Integer> getLabelIds() { return labelIds; }
    public void setLabelIds(List<Integer> labelIds) { this.labelIds = labelIds; }
}
