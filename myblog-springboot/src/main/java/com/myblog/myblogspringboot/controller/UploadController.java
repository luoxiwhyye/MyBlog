package com.myblog.myblogspringboot.controller;

import com.myblog.myblogspringboot.dto.ApiResponse;
import com.myblog.myblogspringboot.service.UploadService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/upload")
public class UploadController {

    private final UploadService uploadService;

    public UploadController(UploadService uploadService) {
        this.uploadService = uploadService;
    }

    @PostMapping("/image")
    public ResponseEntity<ApiResponse<Map<String, Object>>> uploadImage(
            @RequestParam("image") MultipartFile file,
            @RequestParam(value = "scene", required = false) String scene) throws IOException {

        String url = uploadService.uploadImage(file, scene);
        return ResponseEntity.ok(ApiResponse.success(Map.of("url", url), "图片上传成功"));
    }
}
