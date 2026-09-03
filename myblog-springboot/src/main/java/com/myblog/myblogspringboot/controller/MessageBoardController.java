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
import com.myblog.myblogspringboot.dto.MessageBoardRequest;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.entity.MessageBoard;
import com.myblog.myblogspringboot.security.UserPrincipal;
import com.myblog.myblogspringboot.service.MessageBoardService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/message-board")
public class MessageBoardController {

    private final MessageBoardService messageBoardService;

    public MessageBoardController(MessageBoardService messageBoardService) {
        this.messageBoardService = messageBoardService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<Map<String, Object>>>> getMessages(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String status) {

        boolean isAdmin = isAdminUser();
        PageResponse<Map<String, Object>> result =
                messageBoardService.getMessages(page, pageSize, status, isAdmin);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createMessage(
            @Valid @RequestBody MessageBoardRequest request,
            HttpServletRequest httpRequest) {

        String authorIp = httpRequest.getRemoteAddr();
        MessageBoard message = messageBoardService.createMessage(request, authorIp);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(Map.of("id", message.getId()), "留言发布成功，审核通过后展示", 201));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateMessageStatus(@PathVariable Integer id,
                                                                 @RequestBody Map<String, String> body) {
        String status = body.get("status");
        messageBoardService.updateStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success(null, "留言状态已更新"));
    }

    @PutMapping("/{id}/restore")
    public ResponseEntity<ApiResponse<Void>> restoreMessage(@PathVariable Integer id) {
        messageBoardService.restore(id);
        return ResponseEntity.ok(ApiResponse.success(null, "留言已恢复为待审核"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMessage(@PathVariable Integer id) {
        messageBoardService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "留言已移入回收站"));
    }

    @DeleteMapping("/{id}/hard")
    public ResponseEntity<ApiResponse<Void>> hardDeleteMessage(@PathVariable Integer id) {
        messageBoardService.hardDelete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "留言已彻底删除"));
    }

    private boolean isAdminUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return "admin".equals(principal.getRole());
        }
        return false;
    }
}
