package com.myblog.myblogspringboot.service;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UploadService {

    private static final Logger log = LoggerFactory.getLogger(UploadService.class);

    @Value("${app.upload.path:uploads}")
    private String uploadBasePath;

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

        // 异步生成 WebP 变体（_thumb.webp 缩略图 + .webp 主图），失败不影响原图
        generateWebpVariants(filePath, filename);

        // Return full URL
        String relativePath = subDir + "/" + filename;
        return "/uploads/" + relativePath.replace("\\", "/");
    }

    /**
     * 生成 WebP 变体（对标 Express utils/sharpConverter.js）：
     *   - 主图 .webp：最长边 ≤ 1200px
     *   - 缩略图 _thumb.webp：最长边 ≤ 400px
     * 前端通过 /uploads/xxx_thumb.webp、/uploads/xxx.webp 按需取用，失败自动回退原图。
     * WebP 依赖不可用或转换失败时静默跳过（仅日志）。
     */
    private void generateWebpVariants(Path originalPath, String filename) {
        try {
            String ext = extensionOf(filename).toLowerCase();
            if (".webp".equals(ext) || ".avif".equals(ext)) {
                return; // 已是 WebP/AVIF，不重复转换
            }

            BufferedImage source = ImageIO.read(originalPath.toFile());
            if (source == null) {
                return;
            }

            String baseName = filename.substring(0, filename.length() - ext.length());
            Path dir = originalPath.getParent();

            writeWebP(resize(source, 1200), dir.resolve(baseName + ".webp"), 0.80f);
            writeWebP(resize(source, 400), dir.resolve(baseName + "_thumb.webp"), 0.70f);
        } catch (Exception e) {
            log.warn("[upload] WebP 转换失败（不影响原图上传）: {}", e.getMessage());
        }
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }

    private BufferedImage resize(BufferedImage src, int maxEdge) {
        int w = src.getWidth();
        int h = src.getHeight();
        int longest = Math.max(w, h);
        if (longest <= maxEdge) {
            return src;
        }
        double ratio = (double) maxEdge / longest;
        int nw = Math.max(1, (int) (w * ratio));
        int nh = Math.max(1, (int) (h * ratio));

        BufferedImage out = new BufferedImage(nw, nh, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.drawImage(src, 0, 0, nw, nh, null);
        g.dispose();
        return out;
    }

    private void writeWebP(BufferedImage image, Path target, float quality) throws IOException {
        java.util.Iterator<ImageWriter> writers = ImageIO.getImageWritersByMIMEType("image/webp");
        if (!writers.hasNext()) {
            log.warn("[upload] 当前环境无 WebP 编码器（webp-imageio 未生效）");
            return;
        }
        ImageWriter writer = writers.next();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(target.toFile())) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(quality);
            }
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
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
