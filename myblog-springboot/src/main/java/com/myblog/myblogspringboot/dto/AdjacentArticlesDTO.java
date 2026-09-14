package com.myblog.myblogspringboot.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * 「上一篇 / 下一篇」响应体，对齐 Express 的 getAdjacentArticles 输出：{ prev, next }。
 *
 * <p>⚠️ 必须显式 ALWAYS：全局 spring.jackson.default-property-inclusion=non_null 会把
 * prev / next 为 null 的键整条省略，而 Express 返回的是显式的 {@code "prev": null}。
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
