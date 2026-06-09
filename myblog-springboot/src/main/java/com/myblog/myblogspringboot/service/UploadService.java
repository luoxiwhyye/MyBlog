package com.myblog.myblogspringboot.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class UploadService {

    @Value("${app.upload.path:uploads}")
    private String uploadBasePath;

    @Value("${server.port:3000}")
    private String serverPort;

    public String uploadImage(MultipartFile file, String scene) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("请选择要上传的图片");
        }

        // Determine subdirectory based on scene
        String subDir = determineSubDir(scene);

        // Generate unique filename
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String filename = UUID.randomUUID().toString() + extension;

        // Create directory and save
        Path uploadDir = Paths.get(uploadBasePath, subDir);
        Files.createDirectories(uploadDir);
        Path filePath = uploadDir.resolve(filename);
        file.transferTo(filePath.toFile());

        // Return full URL
        String relativePath = subDir + "/" + filename;
        return "/uploads/" + relativePath.replace("\\", "/");
    }

    private String determineSubDir(String scene) {
        if (scene == null) return "article/content";

        return switch (scene.toLowerCase().trim()) {
            case "avatar", "blogger-avatar" -> "blogger/avatar";
            case "article-cover" -> "article/cover";
            case "article-content" -> "article/content";
            case "setting", "settings", "setting-image" -> "setting/image";
            default -> "article/content";
        };
    }
}
