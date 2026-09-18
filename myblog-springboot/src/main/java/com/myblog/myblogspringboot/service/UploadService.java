package com.myblog.myblogspringboot.service;

import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;
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

    /** 上传文件对外访问的基地址（留空则回退 http://localhost:<server.port>）。 */
    @Value("${app.upload.base-url:}")
    private String uploadBaseUrl;

    @Value("${server.port:3000}")
    private int serverPort;

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
        // ⚠️⚠️ 必须落成**绝对路径**再交给 `transferTo`：Tomcat 的 `Part.write()` 遇到
        //    相对路径会把它拼到自己的 multipart 临时目录下（
        //    `<java.io.tmpdir>/tomcat.<port>.xxx/work/Tomcat/localhost/ROOT/../uploads/...`），
        //    于是必然 `FileNotFoundException` → 上传接口 500。
        //    `UPLOAD_PATH` 在本机是相对路径（`../myblog-express/uploads`），
        //    所以这个坑只在「相对 UPLOAD_PATH + HTTP 上传」组合下出现，
        //    而运维工具（regenerate-thumbs 等）自己拼绝对路径，不会暴露它。
        Path uploadDir = Paths.get(uploadBasePath, subDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);
        Path filePath = uploadDir.resolve(filename);
        file.transferTo(filePath.toFile());

        // 生成 WebP 变体（_thumb.webp 缩略图 + .webp 主图），失败不影响原图
        generateVariantsFor(filePath);

        // Return full URL
        String relativePath = subDir + "/" + filename;
        return resolveBaseUrl() + "/uploads/" + relativePath.replace("\\", "/");
    }

    /**
     * 上传文件对外访问的基地址。
     *
     * <p>⚠️ 必须返回**绝对地址**（同 Express 的 `uploadToCDN()`）：后台把库里的地址直接绑
     * `:src`，而它的 vite 只代理 `/api`（没有 `/uploads`）—— 返回户对路径会让后台
     * 拿浏览器地址去求 `/uploads/...`，得到 404（图片裂）。
     * 留空时回退 `http://localhost:<server.port>`，与 Express 的
     * `process.env.APP_BASE_URL || http://localhost:${PORT || 3000}` 同口径。
     */
    private String resolveBaseUrl() {
        String configured = uploadBaseUrl == null ? "" : uploadBaseUrl.trim();
        String base = configured.isEmpty()
                ? "http://localhost:" + serverPort
                : configured;
        // 去掉末尾斜杠，避免拼出 //uploads
        return base.replaceAll("/+$", "");
    }

    /**
     * 生成 WebP 变体（对标 Express utils/sharpConverter.js）：
     *   - 主图 .webp：**宽 ≤ 1200px**
     *   - 缩略图 _thumb.webp：**宽 ≤ 400px**
     * 前端通过 /uploads/xxx_thumb.webp、/uploads/xxx.webp 按需取用，失败自动回退原图。
     * WebP 依赖不可用或转换失败时静默跳过（仅日志）。
     *
     * <p>⚠️ 尺寸口径是**按宽**而不是「最长边」，必须与 Express 的
     * {@code sharp.resize(1200, null)} / {@code sharp.resize(400, null)} 一致：
     * 前端的 {@code srcset} 声明就是 {@code 400w} / {@code 1200w}（宽度描述符），
     * 按最长边缩放会让**竖图**产出比声明小一半的图；两者都不放大小图
     * （对齐 sharp 的 {@code withoutEnlargement}）。
     *
     * <p>上传路径与 `regenerate-thumbs` 运维工具**共用这一个实现**：变体的尺寸与
     * 质量只有一处定义，否则回填出来的历史图会与新上传的图不一致。
     *
     * @return 两个变体都已落盘返回 true；源图本身是 webp/avif、读不出图像、
     *         或环境没有 WebP 编码器时返回 false
     */
    public boolean generateVariantsFor(Path imagePath) {
        try {
            String filename = imagePath.getFileName().toString();
            String ext = extensionOf(filename).toLowerCase();
            if (".webp".equals(ext) || ".avif".equals(ext)) {
                return false; // 已是 WebP/AVIF，不重复转换
            }

            BufferedImage source = ImageIO.read(imagePath.toFile());
            if (source == null) {
                return false;
            }

            String baseName = filename.substring(0, filename.length() - ext.length());
            Path dir = imagePath.getParent();
            Path webp = dir.resolve(baseName + ".webp");
            Path thumb = dir.resolve(baseName + "_thumb.webp");

            writeWebP(resizeToWidth(source, 1200), webp, 0.80f);
            writeWebP(resizeToWidth(source, 400), thumb, 0.70f);

            return Files.exists(webp) && Files.exists(thumb);
        } catch (Exception e) {
            log.warn("[upload] WebP 变体生成失败: {}", e.getMessage());
            return false;
        }
    }

    /**
     * WebP 变体生成器状态（供 /health 展示）。
     *
     * <p>本端的生成器是 {@code webp-imageio}（Express 侧是 sharp）：不可用时
     * {@link #generateVariantsFor} 会**静默**跳过变体生成（只影响 `.webp` / `_thumb.webp`）
     * —— 后端一切正常、前端却拿着推导出来的变体 URL 图裂。所以把它暴露成状态。
     *
     * <p>⚠️ 字段名与 Express `utils/sharpConverter.js` 的 `getStatus()` 对齐
     * （健康检查里同键 {@code imageVariants}），否则「图裂」会在一端可见、另一端不可见。
     */
    public Map<String, Object> getVariantEncoderStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
        boolean available = ImageIO.getImageWritersByMIMEType("image/webp").hasNext();
        status.put("status", available ? "ok" : "disabled");
        status.put("reason", available
                ? ""
                : "当前环境无 WebP 编码器（webp-imageio 未生效），不会生成 .webp / _thumb.webp（前端会回退原图）");
        return status;
    }

    private String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot) : "";
    }

    /**
     * 按「宽」缩放（高按比例），且**不放大小图** —— 与 Express 的
     * {@code sharp.resize(width, null, { withoutEnlargement: true })} 同口径。
     *
     * <p>高用四舍五入取整（sharp 亦在此处取整），避免长竖图累计一像素偏差。
     */
    private BufferedImage resizeToWidth(BufferedImage src, int width) {
        int w = src.getWidth();
        int h = src.getHeight();
        if (w <= width) {
            return src;
        }
        int nh = Math.max(1, (int) Math.round((double) h * width / w));

        BufferedImage out = new BufferedImage(width, nh, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.drawImage(src, 0, 0, width, nh, null);
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
                // ⚠️ 必须显式指定压缩类型：webp-imageio 在 compressionType 为 null 时直接抛
                //    `No compression type set!`（2026-09-16 实测）。它只认 "Lossy" / "Lossless"。
                //    此前这里只设了 mode 与 quality，于是 Spring 侧的 WebP 变体**从未生成成功过**
                //    —— 异常被 catch 掉、只打一行 warn，所以一直没人发现（表现为前端拿不到
                //    xxx.webp / xxx_thumb.webp、静默回退原图）。
                String type = chooseCompressionType(param.getCompressionTypes());
                if (type != null) {
                    param.setCompressionType(type);
                }
                param.setCompressionQuality(quality);
            }
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
    }

    /** 优先选「有损」类型（与 Express 侧 sharp 的 `webp({ quality })` 一致）；取不到则用第一个 */
    private static String chooseCompressionType(String[] types) {
        if (types == null || types.length == 0) {
            return null;
        }
        for (String type : types) {
            if (type != null && type.toLowerCase().contains("lossy")) {
                return type;
            }
        }
        return types[0];
    }

    private String determineSubDir(String scene) {
        if (scene == null) return "article/content";

        return switch (scene.toLowerCase().trim()) {
            case "avatar", "blogger-avatar" -> "blogger/avatar";
            case "article-cover" -> "article/cover";
            case "article-content" -> "article/content";
            case "setting", "settings", "setting-image" -> "setting/image";
            case "emoji" -> "emoji";
            default -> "article/content";
        };
    }
}
