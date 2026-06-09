package com.myblog.myblogspringboot.controller;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.dto.LoginRequest;
import com.myblog.myblogspringboot.dto.PasswordChangeRequest;
import com.myblog.myblogspringboot.security.UserPrincipal;
import com.myblog.myblogspringboot.service.BloggerService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/blogger")
public class BloggerController {

    private final BloggerService bloggerService;

    public BloggerController(BloggerService bloggerService) {
        this.bloggerService = bloggerService;
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<Map<String, Object>>> login(@Valid @RequestBody LoginRequest request) {
        Map<String, Object> result = bloggerService.login(request);
        return ResponseEntity.ok(ApiResponse.success(result, "登录成功"));
    }

    @GetMapping("/public-profile")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPublicProfile() {
        Map<String, Object> profile = bloggerService.getPublicProfile();
        return ResponseEntity.ok(ApiResponse.success(profile));
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<Object>> getProfile() {
        UserPrincipal principal = getCurrentUser();
        return ResponseEntity.ok(ApiResponse.success(bloggerService.getProfile(principal.getId())));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<Void>> updateProfile(@RequestBody Map<String, Object> body) {
        UserPrincipal principal = getCurrentUser();
        String email = (String) body.get("email");
        String nickname = (String) body.get("nickname");
        String bio = (String) body.get("bio");
        String avatarUrl = (String) body.get("avatarUrl");

        bloggerService.updateProfile(principal.getId(), email, nickname, bio, avatarUrl);
        return ResponseEntity.ok(ApiResponse.success(null, "信息已更新"));
    }

    @PutMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        UserPrincipal principal = getCurrentUser();
        bloggerService.changePassword(principal.getId(), request.getOldPassword(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success(null, "密码修改成功"));
    }

    private UserPrincipal getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (UserPrincipal) auth.getPrincipal();
    }
}
