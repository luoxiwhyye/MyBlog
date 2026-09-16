package com.myblog.myblogspringboot.tool;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * 上传文件的路径推导 —— {@code myblog-express/utils/upload.js} 的等价实现。
 *
 * <p>只保留体检需要的三个纯函数（{@code getUploadRelativePathFromUrl} /
 * {@code getUploadAssetKey} / {@code collectUploadFiles}）与递归列目录。
 * **必须与 Express 侧逐条同口径**，否则同一个库、同一份磁盘，两个后端的体检
 * 结论会不一样（这正是报告里担心的「两份体检逻辑口径漂移」）。
 *
 * <p>「同一张图」的判定：同一目录下 **基名相同** 的文件算一组 ——
 * 原图 `xxx.jpg`、主图 `xxx.webp`、缩略图 `xxx_thumb.webp` 三者基名都是 `xxx`。
 */
public final class UploadPathSupport {

    /** 只认 `.webp` 结尾的 `_thumb`：命名为 `xxx_thumb.jpg` 的原图会被当作独立原图，不做基名回溯 */
    private static final Pattern THUMB_VARIANT = Pattern.compile("_thumb\\.webp$", Pattern.CASE_INSENSITIVE);
    private static final String THUMB_SUFFIX = "_thumb";
    private static final String MARKER = "/uploads/";

    /** 依赖目录结构的占位文件，不参与孤儿判定 */
    public static final Set<String> IGNORED_FILES = Set.of(".gitkeep");

    private UploadPathSupport() {
    }

    /**
     * 从 URL 里取出「相对 uploads/ 的路径」；非本地上传（外链 / data: / 空值）返回空串。
     *
     * <p>与 Express 一致：优先按 URL 解析 pathname，解析失败则退化为原始字符串查找。
     */
    public static String relativePathFromUrl(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) {
            return "";
        }

        String pathname = null;
        try {
            URI uri = URI.create(fileUrl.trim());
            pathname = uri.getPath();
        } catch (Exception ignored) {
            // 不是合法 URL（例如原始文件名带空格）→ 走下面的字符串兜底
        }

        if (pathname != null) {
            int index = pathname.indexOf(MARKER);
            if (index >= 0) {
                return URLDecoder.decode(pathname.substring(index + MARKER.length()), StandardCharsets.UTF_8);
            }
        }

        String normalized = fileUrl.replace('\\', '/');
        int index = normalized.indexOf(MARKER);
        return index < 0 ? "" : normalized.substring(index + MARKER.length());
    }

    /** 「不含扩展名」的文件名，并把 `xxx_thumb.webp` 回溯成 `xxx` */
    public static String baseNameOf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        String baseName = dot > 0 ? fileName.substring(0, dot) : fileName;
        return THUMB_VARIANT.matcher(fileName).find()
                ? baseName.substring(0, baseName.length() - THUMB_SUFFIX.length())
                : baseName;
    }

    /**
     * 资源键：把同一张图的「原图 + .webp 主图 + _thumb.webp 缩略图」归为一组，
     * 形如 `setting/image/site_bg_light/1789059822140_7912`；非本地上传返回空串。
     */
    public static String assetKeyOf(String fileUrl) {
        String relative = relativePathFromUrl(fileUrl);
        if (relative.isEmpty()) {
            return "";
        }

        String normalized = relative.replace('\\', '/');
        int slash = normalized.lastIndexOf('/');
        String dir = slash < 0 ? "" : normalized.substring(0, slash);
        String fileName = slash < 0 ? normalized : normalized.substring(slash + 1);
        if (fileName.isEmpty()) {
            return "";
        }

        String baseName = baseNameOf(fileName);
        return dir.isEmpty() ? baseName : dir + "/" + baseName;
    }

    /**
     * 收集某个上传资源在磁盘上的**全部**同名文件（原图 + 主图 webp + 缩略图 webp）。
     *
     * <p>采用「按目录扫描」而非「猜扩展名」：sharp / ImageIO 的产物扩展名固定，
     * 但原图可能是 .jpg/.jpeg/.png/.gif/.avif 等，扫描目录才不会漏。
     */
    public static List<Path> collectUploadFiles(Path uploadsRoot, String fileUrl) {
        String relative = relativePathFromUrl(fileUrl);
        if (relative.isEmpty()) {
            return List.of();
        }

        String normalized = relative.replace('\\', '/');
        int slash = normalized.lastIndexOf('/');
        String dirRelative = slash < 0 ? "" : normalized.substring(0, slash);
        String fileName = slash < 0 ? normalized : normalized.substring(slash + 1);
        if (fileName.isEmpty()) {
            return List.of();
        }

        String baseName = baseNameOf(fileName);
        Path dir = dirRelative.isEmpty() ? uploadsRoot : uploadsRoot.resolve(dirRelative);
        Path singleFile = uploadsRoot.resolve(normalized);

        if (!Files.isDirectory(dir)) {
            // 目录不存在（可能已被清理）→ 退化为只针对该文件本身
            return Files.exists(singleFile) ? List.of(singleFile) : List.of();
        }

        try (Stream<Path> entries = Files.list(dir)) {
            return entries
                    .filter(Files::isRegularFile)
                    .filter(p -> baseNameOf(p.getFileName().toString()).equals(baseName))
                    .sorted(Comparator.comparing(Path::toString))
                    .toList();
        } catch (IOException e) {
            return Files.exists(singleFile) ? List.of(singleFile) : List.of();
        }
    }

    /** 递归列出目录下全部文件（跳过占位文件）；目录不存在时返回空列表 */
    public static List<Path> listFilesRecursively(Path dir) {
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        List<Path> result = new ArrayList<>();
        try (Stream<Path> walk = Files.walk(dir)) {
            walk.filter(Files::isRegularFile)
                    .filter(p -> !IGNORED_FILES.contains(p.getFileName().toString()))
                    .forEach(result::add);
        } catch (IOException ignored) {
            // 与 Express 一致：读不了的子目录直接跳过，不影响其余目录
        }
        return result;
    }

    /** uploads 下的相对路径（正斜杠），用于打印 */
    public static String toUploadRelative(Path uploadsRoot, Path absolute) {
        return uploadsRoot.relativize(absolute).toString().replace('\\', '/');
    }

    /** 去重并保持插入顺序的小工具（Express 用 Set 做同一件事） */
    public static Set<String> newOrderedSet() {
        return new LinkedHashSet<>();
    }
}
