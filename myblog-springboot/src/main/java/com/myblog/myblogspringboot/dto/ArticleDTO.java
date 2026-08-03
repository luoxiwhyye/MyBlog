package com.myblog.myblogspringboot.dto;

import java.time.LocalDateTime;
import java.util.List;

public class ArticleDTO {
    private Integer id;
    private String title;
    private String summary;
    private String content;
    private String coverImage;
    private Integer viewCount;
    private String status;
    private Boolean isPinned;
    private Boolean isFeatured;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
    private Integer typeId;
    private TypeInfo type;
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
}
