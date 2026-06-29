package com.myblog.myblogspringboot.controller;

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

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.dto.CommentRequest;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.Comment;
import com.myblog.myblogspringboot.security.UserPrincipal;
import com.myblog.myblogspringboot.service.CommentService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/comments")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<Map<String, Object>>>> getComments(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) Integer articleId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String sortBy,
            @RequestParam(defaultValue = "false") boolean topLevelOnly) {

        boolean isAdmin = isAdminUser();
        PageResponse<Map<String, Object>> result = commentService.getComments(
                page, pageSize, articleId, status, sortBy, topLevelOnly, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createComment(
            @Valid @RequestBody CommentRequest request,
            HttpServletRequest httpRequest) {

        String authorIp = httpRequest.getRemoteAddr();
        Comment comment = commentService.createComment(request, authorIp);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(Map.of("id", comment.getId()), "评论发布成功", 201));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(@PathVariable Integer id) {
        UserPrincipal user = getCurrentUserOrNull();
        boolean isAdmin = isAdminUser();
        String userEmail = user != null ? null : null; // email not in JWT for non-admin

        commentService.deleteComment(id, user != null ? user.getId() : null, userEmail, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(null, "评论已移入回收站"));
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreComment(@PathVariable Integer id) {
        commentService.restoreComment(id);
        return ResponseEntity.ok(ApiResponse.success(null, "评论已恢复为待审核"));
    }

    @DeleteMapping("/{id}/hard")
    public ResponseEntity<ApiResponse<Void>> hardDeleteComment(@PathVariable Integer id) {
        commentService.hardDeleteComment(id);
        return ResponseEntity.ok(ApiResponse.success(null, "评论已彻底删除"));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateCommentStatus(@PathVariable Integer id,
                                                                  @RequestBody Map<String, String> body) {
        String status = body.get("status");
        commentService.updateCommentStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(null, "评论状态已更新"));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<ApiResponse<Map<String, Object>>> likeComment(@PathVariable Integer id) {
        int likeCount = commentService.likeComment(id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("likeCount", likeCount), "点赞成功"));
    }

    private boolean isAdminUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return "admin".equals(principal.getRole());
        }
        return false;
    }

    private UserPrincipal getCurrentUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal;
        }
        return null;
    }
}
