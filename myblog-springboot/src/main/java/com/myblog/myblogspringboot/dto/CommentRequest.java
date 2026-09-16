package com.myblog.myblogspringboot.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CommentRequest {
    // ⚠️ 必须是 @NotNull：@NotBlank 只能校验 CharSequence，挂在 Integer 上会让
    //    Hibernate Validator 抛 UnexpectedTypeException（HV000030）→ 整个
    //    POST /api/v1/comments 恒返回 500（2026-09-16 批 4 验证时实测发现并修掉）
    @NotNull(message = "articleId 不能为空")
    private Integer articleId;

    private Integer parentId;

    /** 被回复的**具体**评论（回复二级评论时与 parentId 不同）；为空时回退用 parentId */
    private Integer replyToId;

    @NotBlank(message = "昵称不能为空")
    @Size(min = 2, max = 50, message = "昵称长度应在2-50字符之间")
    private String authorName;

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String authorEmail;

    private String authorUrl;

    @NotBlank(message = "评论内容不能为空")
    @Size(min = 1, max = 1000, message = "评论内容长度应在1-1000字符之间")
    private String content;

    /** 邮件订阅开关（可选，缺省 = 不接收） */
    private Boolean notifyEmail;

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

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Boolean getNotifyEmail() { return notifyEmail; }
    public void setNotifyEmail(Boolean notifyEmail) { this.notifyEmail = notifyEmail; }
}
