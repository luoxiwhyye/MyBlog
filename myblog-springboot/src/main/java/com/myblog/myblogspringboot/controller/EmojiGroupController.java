package com.myblog.myblogspringboot.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.service.EmojiGroupService;

/**
 * 表情分组管理（全部需管理员权限，见 SecurityConfig）
 */
@RestController
@RequestMapping("/api/v1/emoji-groups")
public class EmojiGroupController {

    private final EmojiGroupService emojiGroupService;

    public EmojiGroupController(EmojiGroupService emojiGroupService) {
        this.emojiGroupService = emojiGroupService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getGroups() {
        return ResponseEntity.ok(ApiResponse.success(emojiGroupService.getGroups()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createGroup(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> created = emojiGroupService.createGroup(
                (String) body.get("name"),
                (String) body.get("cover"),
                toInteger(body.get("sortOrder")));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(created, "分组创建成功", 201));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateGroup(@PathVariable Integer id,
                                                         @RequestBody Map<String, Object> body) {
        emojiGroupService.updateGroup(id,
                (String) body.get("name"),
                (String) body.get("cover"),
                toInteger(body.get("sortOrder")),
                body.containsKey("cover"));
        return ResponseEntity.ok(ApiResponse.success(null, "分组已更新"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteGroup(@PathVariable Integer id) {
        emojiGroupService.deleteGroup(id);
        return ResponseEntity.ok(ApiResponse.success(null, "分组已删除，组内表情退回未分组"));
    }

    private Integer toInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.intValue();
        return Integer.parseInt(String.valueOf(value));
    }
}
