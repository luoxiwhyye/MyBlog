package com.myblog.myblogspringboot.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.myblog.myblogspringboot.dto.AdjacentArticlesDTO;
import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.dto.ArticleDTO;
import com.myblog.myblogspringboot.dto.ArticleNavDTO;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.security.UserPrincipal;
import com.myblog.myblogspringboot.service.ArticleService;

@RestController
@RequestMapping("/api/v1/articles")
public class ArticleController {

    private final ArticleService articleService;

    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ArticleDTO>>> getArticles(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) Integer typeId,
            @RequestParam(required = false) Integer labelId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortOrder) {

        boolean isAdmin = isAdminUser();
        if (!isAdmin && status != null) {
            status = "published";
        }

        PageResponse<ArticleDTO> result = articleService.getArticles(
                page, pageSize, typeId, labelId, keyword, status, sortBy, sortOrder, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/trash")
    public ResponseEntity<ApiResponse<PageResponse<ArticleDTO>>> getTrashArticles(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {

        PageResponse<ArticleDTO> result = articleService.getTrashArticles(page, pageSize);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ArticleDTO>> getArticleById(@PathVariable Integer id) {
        boolean isAdmin = isAdminUser();
        ArticleDTO article = articleService.getArticleById(id, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(article));
    }

    /**
     * 相关推荐（公开）：共享标签 ×2 + 同分类 ×1，仅返回正分项；响应含 relevanceScore 与 sharedLabels
     */
    @GetMapping("/{id}/related")
    public ResponseEntity<ApiResponse<List<ArticleNavDTO>>> getRelatedArticles(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "4") int limit) {
        return ResponseEntity.ok(ApiResponse.success(articleService.getRelatedArticles(id, limit)));
    }

    /**
     * 上一篇 / 下一篇（公开）
     */
    @GetMapping("/{id}/adjacent")
    public ResponseEntity<ApiResponse<AdjacentArticlesDTO>> getAdjacentArticles(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(articleService.getAdjacentArticles(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createArticle(@RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String content = (String) body.get("content");
        String summary = (String) body.get("summary");
        Integer typeId = body.get("typeId") != null ? ((Number) body.get("typeId")).intValue() : null;
        String coverImage = (String) body.get("coverImageUrl");
        String status = (String) body.get("status");
        String contentFormat = (String) body.get("contentFormat");

        @SuppressWarnings("unchecked")
        List<Integer> labelIds = body.get("labelIds") instanceof List
                ? ((List<Number>) body.get("labelIds")).stream().map(Number::intValue).toList()
                : null;

        ArticleDTO article = articleService.createArticle(title, content, summary, typeId, coverImage, status, contentFormat, labelIds);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(Map.of("id", article.getId()), "文章创建成功", 201));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateArticle(@PathVariable Integer id,
                                                            @RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        String content = (String) body.get("content");
        String summary = (String) body.get("summary");
        Integer typeId = body.get("typeId") != null ? ((Number) body.get("typeId")).intValue() : null;
        String coverImage = (String) body.get("coverImageUrl");
        String status = (String) body.get("status");
        String contentFormat = (String) body.get("contentFormat");

        @SuppressWarnings("unchecked")
        List<Integer> labelIds = body.get("labelIds") instanceof List
                ? ((List<Number>) body.get("labelIds")).stream().map(Number::intValue).toList()
                : null;

        articleService.updateArticle(id, title, content, summary, typeId, coverImage, status, contentFormat, labelIds);
        return ResponseEntity.ok(ApiResponse.success(null, "文章更新成功"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteArticle(@PathVariable Integer id) {
        articleService.softDeleteArticle(id);
        return ResponseEntity.ok(ApiResponse.success(null, "文章已进入回收站"));
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreArticle(@PathVariable Integer id) {
        articleService.restoreArticle(id);
        return ResponseEntity.ok(ApiResponse.success(null, "文章已恢复"));
    }

    @DeleteMapping("/{id}/hard")
    public ResponseEntity<ApiResponse<Void>> hardDeleteArticle(@PathVariable Integer id) {
        articleService.hardDeleteArticle(id);
        return ResponseEntity.ok(ApiResponse.success(null, "文章已彻底删除"));
    }

    private boolean isAdminUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return "admin".equals(principal.getRole());
        }
        return false;
    }
}
