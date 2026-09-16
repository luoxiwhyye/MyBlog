package com.myblog.myblogspringboot.tool;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import com.myblog.myblogspringboot.service.UploadService;

/**
 * 缩略图补生成工具 —— `myblog-express/scripts/regenerateThumbs.js` 的等价实现。
 *
 * <p>用途：为 uploads/ 下已存在的图片重新生成 `.webp` 主图与 `_thumb.webp` 缩略图。
 * 典型场景是「WebP 编码器曾不可用」期间上传的历史图片缺变体
 * （Express 侧是 sharp 未安装，Spring 侧是 webp-imageio 未生效）。
 *
 * <p>运行：
 * <pre>
 *   java -jar target/*.jar --spring.profiles.active=tool --tool=regenerate-thumbs
 *   java -jar target/*.jar --spring.profiles.active=tool --tool=regenerate-thumbs --path=/data/uploads
 * </pre>
 *
 * <p>幂等：已有变体的图会被覆盖重写（结果一致），重复执行安全。
 * 变体的尺寸与质量与上传路径**共用同一个实现**（`UploadService.generateVariantsFor`），
 * 避免「回填出来的历史图与新上传的图不一致」。
 */
@Component
@Profile("tool")
public class RegenerateThumbsTool implements OpsTool {

    /** 候选原图：与 Express 一致只处理这四种 */
    private static final Pattern IMAGE_EXT = Pattern.compile("\\.(jpe?g|png|gif)$", Pattern.CASE_INSENSITIVE);
    /** 已是变体格式的跳过（Express 侧同样排除，避免对 webp 再转一遍） */
    private static final Pattern SKIP_EXT = Pattern.compile("\\.(webp|avif)$", Pattern.CASE_INSENSITIVE);

    private final UploadService uploadService;

    @Value("${app.upload.path:uploads}")
    private String uploadBasePath;

    public RegenerateThumbsTool(UploadService uploadService) {
        this.uploadService = uploadService;
    }

    @Override
    public String id() {
        return "regenerate-thumbs";
    }

    @Override
    public String title() {
        return "缩略图补生成";
    }

    @Override
    public int run(ToolOptions options) throws Exception {
        Path root = Paths.get(options.get("path", uploadBasePath)).toAbsolutePath().normalize();

        System.out.println(ToolReport.repeat("=", 64));
        System.out.println(" WebP 变体补生成（主图 .webp + 缩略图 _thumb.webp）");
        System.out.println(ToolReport.repeat("=", 64));
        System.out.println("[uploads ] " + root);
        System.out.println("[执行时间] " + ToolRunner.nowText());
        System.out.println();

        List<Path> files = UploadPathSupport.listFilesRecursively(root).stream()
                .filter(path -> {
                    String name = path.getFileName().toString();
                    return IMAGE_EXT.matcher(name).find() && !SKIP_EXT.matcher(name).find();
                })
                .sorted()
                .toList();

        System.out.println("发现 " + files.size() + " 张待处理图片");
        int ok = 0;
        int fail = 0;
        for (Path file : files) {
            if (uploadService.generateVariantsFor(file)) {
                ok++;
                System.out.println("[OK] " + UploadPathSupport.toUploadRelative(root, file));
            } else {
                fail++;
                System.out.println("[SKIP] " + UploadPathSupport.toUploadRelative(root, file));
            }
        }

        System.out.println();
        System.out.println("完成：成功 " + ok + "，跳过/失败 " + fail);
        if (fail > 0) {
            System.out.println("跳过项多为：源图不是可解码图片、或当前环境没有 WebP 编码器（webp-imageio 未生效）。");
        }
        return fail > 0 ? 1 : 0;
    }
}
