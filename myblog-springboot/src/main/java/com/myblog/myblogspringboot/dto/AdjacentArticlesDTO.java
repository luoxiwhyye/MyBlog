package com.myblog.myblogspringboot.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 「上一篇 / 下一篇」响应体，对齐 Express 的 getAdjacentArticles 输出：{ prev, next }。
 *
 * <p>⚠️ 保留显式 ALWAYS（与全局 spring.jackson.default-property-inclusion=always 一致）：
 * prev / next 为 null 时必须输出显式的 {@code "prev": null}，与 Express 一致。
 * 显式声明可防「全局配置被改回 non_null」时静默丢键。
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public class AdjacentArticlesDTO {

    private ArticleNavDTO prev;
    private ArticleNavDTO next;

    public AdjacentArticlesDTO() {}

    public AdjacentArticlesDTO(ArticleNavDTO prev, ArticleNavDTO next) {
        this.prev = prev;
        this.next = next;
    }

    public ArticleNavDTO getPrev() { return prev; }
    public void setPrev(ArticleNavDTO prev) { this.prev = prev; }

    public ArticleNavDTO getNext() { return next; }
    public void setNext(ArticleNavDTO next) { this.next = next; }
}
