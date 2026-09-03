package com.myblog.myblogspringboot.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.myblog.myblogspringboot.dto.AccountRequest;
import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.dto.LoginRequest;
import com.myblog.myblogspringboot.dto.PasswordChangeRequest;
import com.myblog.myblogspringboot.security.UserPrincipal;
import com.myblog.myblogspringboot.service.BloggerService;

import jakarta.validation.Valid;

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

    @GetMapping("/exists")
    public ResponseEntity<ApiResponse<Map<String, Object>>> exists() {
        boolean exists = bloggerService.exists();
        return ResponseEntity.ok(ApiResponse.success(Map.of("exists", exists)));
    }

    @PostMapping("/init")
    public ResponseEntity<ApiResponse<Void>> init(@Valid @RequestBody AccountRequest request) {
        bloggerService.init(request);
        return ResponseEntity.ok(ApiResponse.success(null, "管理员账号初始化成功"));
    }

    @PostMapping("/reset")
    public ResponseEntity<ApiResponse<Void>> reset(@Valid @RequestBody AccountRequest request) {
        bloggerService.reset(request);
        return ResponseEntity.ok(ApiResponse.success(null, "账户已重置，全部数据已清空，请使用新账号登录"));
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
