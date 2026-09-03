package com.myblog.myblogspringboot.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class MessageBoardRequest {

    @NotBlank(message = "昵称不能为空")
    @Size(min = 2, max = 50, message = "昵称长度应在2-50字符之间")
    private String authorName;

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    private String authorEmail;

    private String authorUrl;

    @NotBlank(message = "留言内容不能为空")
    @Size(max = 1000, message = "留言内容长度应在1-1000字符之间")
    private String content;

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public String getAuthorEmail() { return authorEmail; }
    public void setAuthorEmail(String authorEmail) { this.authorEmail = authorEmail; }

    public String getAuthorUrl() { return authorUrl; }
    public void setAuthorUrl(String authorUrl) { this.authorUrl = authorUrl; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
