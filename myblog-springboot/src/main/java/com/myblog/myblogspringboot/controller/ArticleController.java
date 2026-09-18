package com.myblog.myblogspringboot.controller;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
import com.myblog.myblogspringboot.dto.BatchStatusRequest;
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

    /**
     * 创建文章（JSON 编码）。
     *
     * <p>⚠️ 写接口必须同时接受 **表单编码**（multipart / urlencoded）：后台
     * `ArticleEditor.vue` 用 axios + FormData 提交，原先这里只有 `@RequestBody`，
     * multipart 请求会被 Spring 以 `HttpMediaTypeNotSupportedException` 拒绝，
     * 再被全局兜底成 **500** —— 即后台在本端从未能建成文章。
     * Express 侧同时接受 JSON / urlencoded / multipart（`express.json` +
     * `express.urlencoded` + multer 三件套），本端按同一契约补齐。
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> createArticle(
            @RequestBody Map<String, Object> body) {
        return doCreateArticle(body);
    }

    /**
     * 创建文章（表单编码：multipart / urlencoded）。
     *
     * <p>表单里的值**只有字符串**，所以不能直接强转 {@code (Number)} / {@code (String)}：
     * 解析统一走下面那几个 helper，两个入口共用同一段业务代码。
     *
     * <p>⚠️ multipart 里若带 `coverImage` **文件部分**，本端会解析后丢弃（不写入封面）——
     * Express 的 `uploadConfig.single("coverImage")` 会用它更新封面，两者行为不同。
     * 后台当前流程不走这条路（封面先调 `/upload/image` 得到 URL，再以
     * `coverImageUrl` 字段提交），所以实际影响面为零，差异记在待办里。
     */
    @PostMapping(consumes = { MediaType.MULTIPART_FORM_DATA_VALUE,
            MediaType.APPLICATION_FORM_URLENCODED_VALUE })
    public ResponseEntity<ApiResponse<Map<String, Object>>> createArticleForm(
            @RequestParam Map<String, String> form) {
        return doCreateArticle(new LinkedHashMap<>(form));
    }

    /**
     * 批量更新文章状态（发布 / 下架，需管理员）。
     * 路径置于 /{id} 之前，与 Express 路由顺序保持一致。
     */
    @PutMapping("/batch/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> batchUpdateStatus(
            @RequestBody BatchStatusRequest body) {
        int affected = articleService.batchUpdateStatus(body.getIds(), body.getStatus());
        return ResponseEntity.ok(
                ApiResponse.success(Map.of("affected", affected), "已更新 " + affected + " 篇文章"));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ApiResponse<Void>> updateArticle(@PathVariable Integer id,
                                                            @RequestBody Map<String, Object> body) {
        return doUpdateArticle(id, body);
    }

    /** 更新文章（表单编码：multipart / urlencoded）；字段解析与 JSON 通道共用 doUpdateArticle */
    @PutMapping(value = "/{id}", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE,
            MediaType.APPLICATION_FORM_URLENCODED_VALUE })
    public ResponseEntity<ApiResponse<Void>> updateArticleForm(@PathVariable Integer id,
                                                              @RequestParam Map<String, String> form) {
        return doUpdateArticle(id, new LinkedHashMap<>(form));
    }

    private ResponseEntity<ApiResponse<Map<String, Object>>> doCreateArticle(Map<String, Object> body) {
        String status = textOf(body, "status");
        ArticleDTO article = articleService.createArticle(
                textOf(body, "title"),
                textOf(body, "content"),
                textOf(body, "summary"),
                intOf(body.get("typeId")),
                optionalText(body, "coverImageUrl"),
                // 空串按未传处理，与 Express 的 `status || "draft"` 同口径
                status == null || status.isEmpty() ? "draft" : status,
                textOf(body, "contentFormat"),
                labelIdsOf(body.get("labelIds")),
                parseSwitch(body.get("commentEnabled")));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(Map.of("id", article.getId()), "文章创建成功", 201));
    }

    private ResponseEntity<ApiResponse<Void>> doUpdateArticle(Integer id, Map<String, Object> body) {
        articleService.updateArticle(
                id,
                textOf(body, "title"),
                textOf(body, "content"),
                textOf(body, "summary"),
                intOf(body.get("typeId")),
                optionalText(body, "coverImageUrl"),
                textOf(body, "status"),
                textOf(body, "contentFormat"),
                labelIdsOf(body.get("labelIds")),
                parseSwitch(body.get("commentEnabled")));
        return ResponseEntity.ok(ApiResponse.success(null, "文章更新成功"));
    }

    /**
     * 取字符串字段：{@code null} = 未传，{@code ""} = 传了但为空 —— 两者语义不同，不能合并。
     *
     * <p>不做 trim：正文 / 摘要的首尾空白要原样入库（Express 也不 trim）。
     */
    private static String textOf(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value == null ? null : String.valueOf(value);
    }

    /**
     * 取「可选地址」字段：空串按未传处理。
     *
     * <p>对齐 Express 的 `if (req.body.coverImageUrl)` 真值判断 —— 因此**两端都无法
     * 通过该字段清空封面**（要清空得由前端不带封面提交，或直改库）。
     */
    private static String optionalText(Map<String, Object> body, String key) {
        String value = textOf(body, key);
        return value == null || value.isEmpty() ? null : value;
    }

    /**
     * 解析整数字段：表单里是字符串、JSON 里可能是数字；解析不出来按「未传」处理。
     *
     * <p>与 Express 的差异：Express 把原串直接交给 mysql（`"7"` 由数据库隐式转换）；
     * 这里显式解析，非法值（如 `"abc"`）会落成 null 而 Express 会报数据库错误，
     * 非法入参下两端的错误码不同。
     */
    private static Integer intOf(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.intValue();
        String s = String.valueOf(value).trim();
        if (s.isEmpty()) return null;
        try {
            return Integer.valueOf(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * 解析标签 id 列表：表单里是逗号分隔串（清空标签时是 `""`），JSON 里是数组。
     *
     * <p>⚠️ 「未传」（null）与「传了空值」（空列表）语义不同：前者不动标签关联，
     * 后者清空全部标签 —— 与 Express 的 `if (labelIds !== undefined) { 清空; if (labelIds) 重建 }`
     * 同口径，不能把两者合并成 null。
     */
    private static List<Integer> labelIdsOf(Object value) {
        if (value == null) return null;
        if (value instanceof List<?> list) {
            return list.stream().map(ArticleController::intOf).filter(Objects::nonNull).toList();
        }
        return Arrays.stream(String.valueOf(value).split(","))
                .map(ArticleController::intOf)
                .filter(Objects::nonNull)
                .toList();
    }

    /**
     * 解析「开关」类字段：multipart / urlencoded 表单里拿到的是字符串，JSON 客户端传的是布尔。
     *
     * <p>⚠️ 不能直接用 {@code Boolean.valueOf(String)} —— 它只认 "true"，
     * 而 admin 表单送的是 "1" / "0"，会把「开启」静默解析成 false。
     * 返回 null 表示「未传」，由调用方决定是否跳过该字段（对齐 Express 的 parseSwitch）。
     */
    private static Boolean parseSwitch(Object value) {
        if (value == null) return null;
        if (value instanceof Boolean b) return b;
        if (value instanceof Number n) return n.intValue() != 0;
        String s = String.valueOf(value).trim();
        if (s.isEmpty()) return null;
        return switch (s.toLowerCase()) {
            case "1", "true", "yes", "on" -> Boolean.TRUE;
            default -> Boolean.FALSE;
        };
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
