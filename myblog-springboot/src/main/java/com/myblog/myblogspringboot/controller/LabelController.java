package com.myblog.myblogspringboot.controller;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.service.LabelService;

@RestController
@RequestMapping("/api/v1/labels")
public class LabelController {

    private final LabelService labelService;

    public LabelController(LabelService labelService) {
        this.labelService = labelService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<Map<String, Object>>>> getLabels(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String keyword) {
        PageResponse<Map<String, Object>> result = labelService.getLabels(page, pageSize, keyword);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createLabel(@RequestBody Map<String, String> body) {
        String labelName = body.get("labelName");
        var label = labelService.createLabel(labelName);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(Map.of("id", label.getId()), "标签创建成功", 201));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateLabel(@PathVariable Integer id,
                                                          @RequestBody Map<String, String> body) {
        String labelName = body.get("labelName");
        labelService.updateLabel(id, labelName);
        return ResponseEntity.ok(ApiResponse.success(null, "标签更新成功"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteLabel(@PathVariable Integer id) {
        labelService.deleteLabel(id);
        return ResponseEntity.ok(ApiResponse.success(null, "标签删除成功"));
    }
}
