package com.myblog.myblogspringboot.controller;

import java.util.HashMap;
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
import com.myblog.myblogspringboot.service.FriendLinkService;

@RestController
@RequestMapping("/api/v1/friend-links")
public class FriendLinkController {

    private final FriendLinkService friendLinkService;

    public FriendLinkController(FriendLinkService friendLinkService) {
        this.friendLinkService = friendLinkService;
    }

    private boolean isAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ADMIN"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<Map<String, Object>>>> getFriendLinks(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        // 公开场景只返回启用的；管理端可看全部
        boolean onlyEnabled = !isAdmin();
        PageResponse<Map<String, Object>> result = friendLinkService.getFriendLinks(page, pageSize, onlyEnabled);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getFriendLinkById(@PathVariable Integer id) {
        Map<String, Object> link = friendLinkService.getFriendLinkById(id);
        return ResponseEntity.ok(ApiResponse.success(link));
    }

    @PostMapping("/{id}/click")
    public ResponseEntity<ApiResponse<Void>> incrementClickCount(@PathVariable Integer id) {
        friendLinkService.incrementClickCount(id);
        return ResponseEntity.ok(ApiResponse.success(null, "点击已记录"));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createFriendLink(@RequestBody Map<String, Object> body) {
        var link = friendLinkService.createFriendLink(body);
        Map<String, Object> data = new HashMap<>();
        data.put("id", link.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(data, "友链创建成功", 201));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateFriendLink(@PathVariable Integer id,
                                                              @RequestBody Map<String, Object> body) {
        friendLinkService.updateFriendLink(id, body);
        return ResponseEntity.ok(ApiResponse.success(null, "友链更新成功"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFriendLink(@PathVariable Integer id) {
        friendLinkService.deleteFriendLink(id);
        return ResponseEntity.ok(ApiResponse.success(null, "友链删除成功"));
    }
}
