package com.myblog.myblogspringboot.controller;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.dto.PageResponse;
import com.myblog.myblogspringboot.service.TypeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/types")
public class TypeController {

    private final TypeService typeService;

    public TypeController(TypeService typeService) {
        this.typeService = typeService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<Map<String, Object>>>> getTypes(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int pageSize) {
        PageResponse<Map<String, Object>> result = typeService.getTypes(page, pageSize);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createType(@RequestBody Map<String, String> body) {
        String typeName = body.get("typeName");
        var type = typeService.createType(typeName);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(Map.of("id", type.getId()), "分类创建成功", 201));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> updateType(@PathVariable Integer id,
                                                         @RequestBody Map<String, String> body) {
        String typeName = body.get("typeName");
        typeService.updateType(id, typeName);
        return ResponseEntity.ok(ApiResponse.success(null, "分类更新成功"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteType(@PathVariable Integer id) {
        typeService.deleteType(id);
        return ResponseEntity.ok(ApiResponse.success(null, "分类删除成功"));
    }
}
