package com.myblog.myblogspringboot.tool;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 上传文件体检工具（**只读**）—— `myblog-express/scripts/verifyUploads.js` 的等价实现。
 *
 * <p>历史成因：早期「保存设置时比较字符串就删旧文件」只删单个文件、不删变体，
 * 也不检查引用关系 → 出现「DB 里存着 URL、磁盘上文件已经没了」（背景图 404 的成因）。
 * 本工具先拿到现状，不做任何修改。
 *
 * <p><b>体检范围（6 类引用，覆盖 config/upload.js 的全部 scene）</b>：
 * setting.type='image'（含背景图 / Logo / Favicon）、friend_link.avatar、blogger.avatar、
 * emoji.type='image'、article.cover_image、article.content 正文图。
 *
 * <p>运行：`java -jar target/*.jar --spring.profiles.active=tool --tool=verify-uploads [--strict]`
 */
@Component
@Profile("tool")
public class VerifyUploadsTool implements OpsTool {

    private final JdbcTemplate jdbc;

    @Value("${app.upload.path:uploads}")
    private String uploadBasePath;

    public VerifyUploadsTool(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public String id() {
        return "verify-uploads";
    }

    @Override
    public String title() {
        return "上传文件体检";
    }

    /**
     * 参与孤儿扫描的上传目录（相对 uploads/），与 `config/upload.js` 的 SCENE_DIR_MAP 逐一对应：
     * avatar/blogger-avatar → blogger/avatar；article-cover → article/cover；
     * article-content → article/content；setting/settings/setting-image → setting/image（含友链头像子目录）；
     * emoji → emoji。
     */
    private static final List<String> SCAN_DIRS = List.of(
            "setting/image", "article/cover", "article/content", "blogger/avatar", "emoji");

    /** HTML：`<img src="...">`（属性顺序不定）；Markdown：`![alt](url)` */
    private static final Pattern CONTENT_HTML_IMG =
            Pattern.compile("<img\\b[^>]*\\bsrc\\s*=\\s*[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);
    private static final Pattern CONTENT_MD_IMG =
            Pattern.compile("!\\[[^\\]]*\\]\\(\\s*([^)\\s]+)");

    private static final Map<String, String> STATUS_TEXT = Map.of(
            "ok", "✓ 正常",
            "missing-original", "✗ 原图丢失（仅剩派生变体）",
            "missing-all", "✗ 文件全部丢失",
            "external", "· 外部链接（跳过）");

    private static final Set<String> PROBLEM_STATUSES = Set.of("missing-original", "missing-all");

    /** 单条图片引用的体检结果 */
    private record ImageItem(
            String key,
            String value,
            String source,
            String status,
            String relativePath,
            String assetKey,
            boolean originalExists,
            String originalName,
            List<String> variantNames) {}

    /** 从正文里抽出引用的图片 URL（HTML 与 Markdown 两种写法都覆盖），同一张图只保留一次 */
    private static List<String> parseContentImageUrls(String content) {
        if (content == null || content.isEmpty()) {
            return List.of();
        }
        Set<String> urls = UploadPathSupport.newOrderedSet();
        for (Pattern pattern : List.of(CONTENT_HTML_IMG, CONTENT_MD_IMG)) {
            Matcher matcher = pattern.matcher(content);
            while (matcher.find()) {
                if (matcher.group(1) != null && !matcher.group(1).isBlank()) {
                    urls.add(matcher.group(1));
                }
            }
        }
        return new ArrayList<>(urls);
    }

    private ImageItem inspectImage(Path uploadsRoot, String key, String value, String source) {
        String relativePath = UploadPathSupport.relativePathFromUrl(value);
        if (relativePath.isEmpty()) {
            return new ImageItem(key, value, source, "external", "", "", false, "", List.of());
        }

        Path originalPath = uploadsRoot.resolve(relativePath);
        boolean originalExists = Files.exists(originalPath);
        String originalKey = originalPath.toAbsolutePath().normalize().toString();

        List<Path> allFiles = UploadPathSupport.collectUploadFiles(uploadsRoot, value);
        // 用「绝对路径规范化后的字符串」比较，避免 Windows 下 `a/b` 与 `a\b` 这类写法差异
        List<String> variantNames = allFiles.stream()
                .filter(file -> !file.toAbsolutePath().normalize().toString().equals(originalKey))
                .map(file -> file.getFileName().toString())
                .toList();

        String status = "ok";
        if (!originalExists) {
            status = variantNames.isEmpty() ? "missing-all" : "missing-original";
        }

        return new ImageItem(key, value, source, status, relativePath,
                UploadPathSupport.assetKeyOf(value), originalExists,
                originalPath.getFileName().toString(), variantNames);
    }

    @Override
    public int run(ToolOptions options) throws Exception {
        boolean strict = options.flag("strict");
        Path uploadsRoot = Paths.get(options.get("path", uploadBasePath)).toAbsolutePath().normalize();

        System.out.println(ToolReport.repeat("=", 60));
        System.out.println(" 上传文件体检报告（只读，不修改任何文件）");
        System.out.println(ToolReport.repeat("=", 60));
        System.out.println("[体检范围] setting.image + friend_link.avatar + blogger.avatar + "
                + "emoji.image + article.cover_image + article.content 正文图");
        System.out.println("[扫描目录] " + String.join(" / ", SCAN_DIRS));
        System.out.println("[uploads ] " + uploadsRoot);
        System.out.println("[执行时间] " + ToolRunner.nowText());
        System.out.println("[模式    ] "
                + (strict ? "STRICT（发现问题时退出码 1）" : "普通（始终退出码 0）"));
        System.out.println();

        List<Map<String, Object>> settingRows = jdbc.queryForList(
                "SELECT setting_key AS settingKey, setting_value AS settingValue FROM setting "
                        + "WHERE setting_type = 'image' ORDER BY setting_key");
        List<Map<String, Object>> friendLinkRows = jdbc.queryForList(
                "SELECT id, name, avatar FROM friend_link WHERE avatar IS NOT NULL AND avatar <> '' ORDER BY id");
        List<Map<String, Object>> bloggerRows = jdbc.queryForList(
                "SELECT id, nickname, avatar FROM blogger WHERE avatar IS NOT NULL AND avatar <> '' ORDER BY id");
        List<Map<String, Object>> emojiRows = jdbc.queryForList(
                "SELECT id, content FROM emoji WHERE type = 'image' AND content IS NOT NULL AND content <> '' "
                        + "ORDER BY id");
        // 全量文章：草稿与回收站里的图仍会被恢复使用，必须计入引用，否则会误报为孤儿
        List<Map<String, Object>> articleRows = jdbc.queryForList(
                "SELECT id, title, cover_image AS coverImage, content FROM article ORDER BY id");

        List<Map<String, Object>> configuredSettings = settingRows.stream()
                .filter(row -> row.get("settingValue") != null && !String.valueOf(row.get("settingValue")).isEmpty())
                .toList();

        List<ImageItem> settingItems = configuredSettings.stream()
                .map(row -> inspectImage(uploadsRoot, String.valueOf(row.get("settingKey")),
                        String.valueOf(row.get("settingValue")), "setting"))
                .toList();
        // 友链头像也上传到 uploads/setting/image/ 下，但引用存在 friend_link.avatar 字段里
        //（不在 setting 表）——遗漏它会把在用头像误判成孤儿
        List<ImageItem> friendLinkItems = friendLinkRows.stream()
                .map(row -> inspectImage(uploadsRoot,
                        "友链#" + row.get("id") + blankToEmpty(row.get("name"), " ", ""),
                        String.valueOf(row.get("avatar")), "friend_link"))
                .toList();
        List<ImageItem> bloggerItems = bloggerRows.stream()
                .map(row -> inspectImage(uploadsRoot,
                        "博主#" + row.get("id") + blankToEmpty(row.get("nickname"), " ", ""),
                        String.valueOf(row.get("avatar")), "blogger"))
                .toList();
        List<ImageItem> emojiItems = emojiRows.stream()
                .map(row -> inspectImage(uploadsRoot, "表情#" + row.get("id"),
                        String.valueOf(row.get("content")), "emoji"))
                .toList();
        List<ImageItem> coverItems = articleRows.stream()
                .filter(row -> notBlank(row.get("coverImage")))
                .map(row -> inspectImage(uploadsRoot,
                        "文章#" + row.get("id") + " 封面" + blankToEmpty(row.get("title"), "（", "）"),
                        String.valueOf(row.get("coverImage")), "article_cover"))
                .toList();

        // 正文图：一篇文章可能引用多张，逐张一条，key 里带序号便于定位
        List<ImageItem> contentItems = new ArrayList<>();
        for (Map<String, Object> row : articleRows) {
            List<String> urls = parseContentImageUrls(
                    row.get("content") == null ? null : String.valueOf(row.get("content")));
            for (int i = 0; i < urls.size(); i++) {
                contentItems.add(inspectImage(uploadsRoot,
                        "文章#" + row.get("id") + " 正文图" + (i + 1) + blankToEmpty(row.get("title"), "（", "）"),
                        urls.get(i), "article_content"));
            }
        }

        List<ImageItem> inspected = new ArrayList<>();
        inspected.addAll(settingItems);
        inspected.addAll(friendLinkItems);
        inspected.addAll(bloggerItems);
        inspected.addAll(emojiItems);
        inspected.addAll(coverItems);
        inspected.addAll(contentItems);

        /* ---- 一、逐项体检 ---- */
        System.out.println(ToolReport.repeat("─", 60));
        System.out.println("一、逐项体检（DB 存 URL、磁盘存文件 的全部图片引用）");
        System.out.println(ToolReport.repeat("─", 60));

        printGroup("设置类图片（setting.type='image'）", settingItems, Integer.MAX_VALUE);
        printGroup("友链头像（friend_link.avatar）", friendLinkItems, Integer.MAX_VALUE);
        printGroup("博主头像（blogger.avatar）", bloggerItems, Integer.MAX_VALUE);
        printGroup("表情图片（emoji.type='image'）", emojiItems, 10);
        printGroup("文章封面（article.cover_image）", coverItems, 10);
        printGroup("文章正文图（article.content）", contentItems, 10);

        List<ImageItem> problems = inspected.stream().filter(i -> PROBLEM_STATUSES.contains(i.status())).toList();
        List<ImageItem> external = inspected.stream().filter(i -> "external".equals(i.status())).toList();
        List<ImageItem> healthy = inspected.stream().filter(i -> "ok".equals(i.status())).toList();

        /* ---- 二、多键引用同一张图 ---- */
        System.out.println();
        System.out.println(ToolReport.repeat("─", 60));
        System.out.println("二、多键引用同一张图（风险成立于「改设置项会删文件」：只比字符串、不查引用）");
        System.out.println(ToolReport.repeat("─", 60));

        Map<String, List<ImageItem>> byAssetKey = new LinkedHashMap<>();
        for (ImageItem item : inspected) {
            if (item.assetKey() == null || item.assetKey().isEmpty()) {
                continue;
            }
            byAssetKey.computeIfAbsent(item.assetKey(), k -> new ArrayList<>()).add(item);
        }
        // 只有「引用方里至少有一个设置项」才构成误删风险：删文件的入口仅在 settingController
        List<Map.Entry<String, List<ImageItem>>> sharedAssets = byAssetKey.entrySet().stream()
                .filter(e -> e.getValue().size() > 1
                        && e.getValue().stream().anyMatch(i -> "setting".equals(i.source())))
                .toList();

        if (sharedAssets.isEmpty()) {
            System.out.println("✓ 未发现「设置项与其它引用共用同一张图」的情况");
        } else {
            for (Map.Entry<String, List<ImageItem>> entry : sharedAssets) {
                System.out.println("⚠ " + entry.getKey());
                for (ImageItem item : entry.getValue()) {
                    System.out.println("    ← [" + item.source() + "] " + item.key());
                }
                System.out.println("    建议：改这些键中任意一个都可能删掉共用文件，请拆成各自独立的图");
            }
        }

        /* ---- 三、孤儿文件 ---- */
        System.out.println();
        System.out.println(ToolReport.repeat("─", 60));
        System.out.println("三、孤儿文件（上传目录下未被任何记录引用）");
        System.out.println(ToolReport.repeat("─", 60));

        Set<String> referencedFiles = UploadPathSupport.newOrderedSet();
        for (ImageItem item : inspected) {
            for (Path file : UploadPathSupport.collectUploadFiles(uploadsRoot, item.value())) {
                referencedFiles.add(file.toAbsolutePath().normalize().toString());
            }
        }

        List<Path> allOrphans = new ArrayList<>();
        for (String relativeDir : SCAN_DIRS) {
            Path dirPath = uploadsRoot.resolve(relativeDir);
            List<Path> orphans = UploadPathSupport.listFilesRecursively(dirPath).stream()
                    .filter(file -> !referencedFiles.contains(file.toAbsolutePath().normalize().toString()))
                    .sorted()
                    .toList();
            if (orphans.isEmpty()) {
                continue;
            }
            allOrphans.addAll(orphans);
            System.out.println("【" + relativeDir + "】" + orphans.size() + " 个");
            for (Path file : orphans) {
                System.out.println("  " + UploadPathSupport.toUploadRelative(uploadsRoot, file));
            }
            System.out.println();
        }

        if (allOrphans.isEmpty()) {
            System.out.println("✓ 未发现孤儿文件");
        } else {
            System.out.println("共 " + allOrphans.size()
                    + " 个。多为只删原图、未清理派生变体留下的残留，或已解除引用的旧图。");
        }

        /* ---- 四、汇总 ---- */
        System.out.println();
        System.out.println(ToolReport.repeat("=", 60));
        System.out.println("汇总");
        System.out.println(ToolReport.repeat("=", 60));
        System.out.println("引用项：设置 " + configuredSettings.size() + "/" + settingRows.size()
                + "、友链头像 " + friendLinkRows.size() + "、博主头像 " + bloggerRows.size()
                + "、表情图 " + emojiRows.size() + "、");
        System.out.println("        文章封面 " + coverItems.size() + "、文章正文图 " + contentItems.size()
                + "（合计 " + inspected.size() + " 项）");
        System.out.println("  ✓ 正常        " + healthy.size());
        System.out.println("  ✗ 失联        " + problems.size());
        System.out.println("  · 外部链接    " + external.size());
        System.out.println("多键共用同一图：" + sharedAssets.size() + " 组");
        System.out.println("孤儿文件：      " + allOrphans.size() + " 个");

        if (!problems.isEmpty()) {
            System.out.println();
            System.out.println("【需要处理的已失联引用】");
            for (ImageItem item : problems) {
                System.out.println("  [" + item.source() + "] " + item.key() + " → " + item.relativePath()
                        + "（" + ("missing-all".equals(item.status()) ? "文件全部丢失" : "原图丢失、仅剩变体") + "）");
            }
            System.out.println("  处理方式：在后台重新上传该图片，或将其清空（留空则回退默认背景）。");
        }

        boolean hasProblem = !problems.isEmpty() || !allOrphans.isEmpty();
        System.out.println();
        System.out.println(hasProblem ? "体检结束：发现需要处理的问题（见上）。" : "体检结束：一切正常。");

        return strict && hasProblem ? 1 : 0;
    }

    private void printGroup(String title, List<ImageItem> items, int healthyLimit) {
        System.out.println();
        System.out.println("【" + title + "】（" + items.size() + " 项）");
        if (items.isEmpty()) {
            System.out.println("  （无）");
            return;
        }

        int printedHealthy = 0;
        int skippedHealthy = 0;
        for (ImageItem item : items) {
            // 问题项与外部链接全部展开；正常项过长时折叠，避免正文图把输出刷屏
            if ("ok".equals(item.status())) {
                if (printedHealthy >= healthyLimit) {
                    skippedHealthy++;
                    continue;
                }
                printedHealthy++;
            }
            System.out.println();
            System.out.println("  " + STATUS_TEXT.get(item.status()) + "  " + item.key());
            System.out.println("      值        " + item.value());
            if ("external".equals(item.status())) {
                continue;
            }
            System.out.println("      相对路径  " + item.relativePath());
            System.out.println("      原图      " + item.originalName() + " → "
                    + (item.originalExists() ? "存在" : "缺失"));
            System.out.println("      派生变体  "
                    + (item.variantNames().isEmpty() ? "（无）" : String.join("、", item.variantNames())));
        }
        if (skippedHealthy > 0) {
            System.out.println();
            System.out.println("  …另有 " + skippedHealthy + " 项正常（已省略展开）");
        }
    }

    private static boolean notBlank(Object value) {
        return value != null && !String.valueOf(value).isBlank();
    }

    /** 标题为空则返回空串，否则包上前后缀（对应 Express 的 `${row.title ? `（${title}）` : ""}`） */
    private static String blankToEmpty(Object value, String prefix, String suffix) {
        return notBlank(value) ? prefix + value + suffix : "";
    }
}
