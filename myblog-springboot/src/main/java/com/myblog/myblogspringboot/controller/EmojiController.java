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

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.security.UserPrincipal;
import com.myblog.myblogspringboot.service.EmojiService;

@RestController
@RequestMapping("/api/v1/emoji")
public class EmojiController {

    private final EmojiService emojiService;

    public EmojiController(EmojiService emojiService) {
        this.emojiService = emojiService;
    }

    /** 公开：所有启用表情（前台动态拉取） */
    @GetMapping("/enabled")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getEnabledEmojis() {
        List<Map<String, Object>> emojis = emojiService.getEnabledEmojis();
        return ResponseEntity.ok(ApiResponse.success(emojis));
    }

    /** 公开只返回启用；管理端可看全部 */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<Map<String, Object>>>> getEmojis(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean enabled) {

        boolean isAdmin = isAdminUser();
        PageResponse<Map<String, Object>> result =
                emojiService.getEmojis(page, pageSize, type, enabled, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createEmoji(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> created = emojiService.createEmoji(
                (String) body.get("content"),
                (String) body.get("type"),
                toBoolean(body.get("isCustom")),
                toBoolean(body.get("enabled")),
                toInteger(body.get("sortOrder")));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "表情添加成功", 201));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateEmoji(@PathVariable Integer id,
                                                         @RequestBody Map<String, Object> body) {
        emojiService.updateEmoji(id,
                (String) body.get("content"),
                (String) body.get("type"),
                toBoolean(body.get("isCustom")),
                toBoolean(body.get("enabled")),
                toInteger(body.get("sortOrder")));
        return ResponseEntity.ok(ApiResponse.success(null, "表情已更新"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteEmoji(@PathVariable Integer id) {
        emojiService.deleteEmoji(id);
        return ResponseEntity.ok(ApiResponse.success(null, "表情已删除"));
    }

    private boolean isAdminUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return "admin".equals(principal.getRole());
        }
        return false;
    }

    private Boolean toBoolean(Object value) {
        if (value == null) return null;
        if (value instanceof Boolean b) return b;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private Integer toInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.intValue();
        return Integer.parseInt(String.valueOf(value));
    }
}
