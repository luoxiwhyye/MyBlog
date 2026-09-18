package com.myblog.myblogspringboot.tool;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 数据层体检工具（**只读**）—— `myblog-express/scripts/auditData.js` 的等价实现。
 *
 * <p>与 verify-uploads 互补：本工具只看数据库内部的一致性与完整性，不碰任何文件。
 *
 * <p><b>检查项的取舍原则（务必保持）</b>：只查 DB 约束管不到的东西。
 * <ul>
 *   <li>引用存在性（`article_label`→`label`、`comment.parent_id`→`comment` 等）
 *       **已由外键保证**，再查一遍只会永远输出「正常」；改为**校验这些约束本身还在**
 *       （结构漂移才是真风险，例如库是旧版 schema、外键被人手工删掉）。</li>
 *   <li>真正查的是：FK 不覆盖的**语义**约束（跨文章父评论、三级嵌套、自环）、
 *       **取值**越界（varchar 列不受枚举保护）、**计数漂移**、以及会静默影响前台展示的
 *       **异常值**。</li>
 * </ul>
 *
 * <p>运行：`java -jar target/*.jar --spring.profiles.active=tool --tool=audit [--strict]`
 */
@Component
@Profile("tool")
public class AuditTool implements OpsTool {

    private final JdbcTemplate jdbc;

    public AuditTool(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public String id() {
        return "audit";
    }

    @Override
    public String title() {
        return "数据层体检";
    }

    /* ---------------------------------------------------------------- */
    /* 一、结构安全网（schema drift）                                     */
    /* ---------------------------------------------------------------- */

    /** 预期存在的表（与 myblog-1.1.sql 一致） */
    private static final List<String> EXPECTED_TABLES = List.of(
            "article", "article_label", "blogger", "client_error_log", "comment", "emoji",
            "emoji_group", "friend_link", "label", "message_board", "setting", "type");

    /** 预期存在的列（重点是迁移脚本加的那些，最易漂移） */
    private static final List<String[]> EXPECTED_COLUMNS = List.of(
            new String[]{"article", "content_format"},
            new String[]{"article", "deleted_at"},
            new String[]{"article", "is_pinned"},
            new String[]{"article", "is_featured"},
            // 文章评论区开关（迁移脚本加的列，同样要进安全网）
            new String[]{"article", "comment_enabled"},
            new String[]{"article", "cover_image"},
            new String[]{"emoji", "group_id"},
            new String[]{"emoji", "type"},
            new String[]{"comment", "parent_id"},
            // 2026-09-16 批 4：订阅开关 + 「回复谁」（迁移脚本加的列，同样要进安全网）
            new String[]{"comment", "reply_to_id"},
            new String[]{"comment", "notify_email"},
            new String[]{"message_board", "notify_email"},
            new String[]{"friend_link", "is_sticky"});

    /** 预期存在的外键（引用存在性靠它们兜底，缺了就意味着孤儿数据可能出现） */
    private static final List<String[]> EXPECTED_FOREIGN_KEYS = List.of(
            new String[]{"article", "fk_article_type"},
            new String[]{"article_label", "fk_article_label_article"},
            new String[]{"article_label", "fk_article_label_label"},
            new String[]{"comment", "fk_comment_article"},
            new String[]{"comment", "fk_comment_parent"},
            new String[]{"comment", "fk_comment_reply_to"},
            new String[]{"emoji", "fk_emoji_group"});

    /** 预期存在的唯一索引（重名 / 重复关联靠它们兜底） */
    private static final List<String[]> EXPECTED_UNIQUE_INDEXES = List.of(
            new String[]{"article_label", "uk_article_label"},
            new String[]{"blogger", "uk_email"},
            new String[]{"blogger", "uk_username"},
            new String[]{"friend_link", "uk_url"},
            new String[]{"label", "uk_label_name"},
            new String[]{"type", "uk_type_name"});

    private void checkSchema(ToolReport report) {
        Set<String> tables = new LinkedHashSet<>(jdbc.queryForList(
                "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
                String.class));
        List<String> missingTables = EXPECTED_TABLES.stream().filter(t -> !tables.contains(t)).toList();
        if (!missingTables.isEmpty()) {
            report.error("缺少 " + missingTables.size() + " 张预期表",
                    missingTables.stream().map(t -> "表 " + t).toList());
        }

        Set<String> columns = new LinkedHashSet<>(jdbc.queryForList(
                "SELECT CONCAT(TABLE_NAME, '.', COLUMN_NAME) AS col FROM information_schema.COLUMNS "
                        + "WHERE TABLE_SCHEMA = DATABASE()",
                String.class));
        List<String> missingColumns = EXPECTED_COLUMNS.stream()
                .map(pair -> pair[0] + "." + pair[1])
                .filter(key -> !columns.contains(key))
                .toList();
        if (!missingColumns.isEmpty()) {
            report.error("缺少 " + missingColumns.size() + " 个预期列", missingColumns);
        }

        Set<String> fks = new LinkedHashSet<>(jdbc.queryForList(
                "SELECT CONCAT(TABLE_NAME, '.', CONSTRAINT_NAME) AS fk FROM information_schema.TABLE_CONSTRAINTS "
                        + "WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
                String.class));
        List<String> missingFks = EXPECTED_FOREIGN_KEYS.stream()
                .map(pair -> pair[0] + "." + pair[1])
                .filter(key -> !fks.contains(key))
                .toList();
        if (!missingFks.isEmpty()) {
            report.error("缺少 " + missingFks.size() + " 个预期外键（引用完整性失去兜底）", missingFks);
        }

        Set<String> uniqueIndexes = new LinkedHashSet<>(jdbc.queryForList(
                "SELECT CONCAT(TABLE_NAME, '.', INDEX_NAME) AS idx FROM information_schema.STATISTICS "
                        + "WHERE TABLE_SCHEMA = DATABASE() AND NON_UNIQUE = 0",
                String.class));
        List<String> missingIndexes = EXPECTED_UNIQUE_INDEXES.stream()
                .map(pair -> pair[0] + "." + pair[1])
                .filter(key -> !uniqueIndexes.contains(key))
                .toList();
        if (!missingIndexes.isEmpty()) {
            report.warn("缺少 " + missingIndexes.size() + " 个预期唯一索引（重名/重复关联失去兜底）",
                    missingIndexes);
        }
    }

    /* ---------------------------------------------------------------- */
    /* 二、取值越界（varchar 列不受枚举保护）                             */
    /* ---------------------------------------------------------------- */

    /** 布尔型设置项：前台按 `=== "true"` / `!== "false"` 判断，故只认这三种取值 */
    private static final List<String> VALID_BOOLEAN_SETTINGS = List.of("", "true", "false");
    private static final List<String> BOOLEAN_SETTING_KEYS =
            List.of("enable_tools", "enable_message_board", "site_maintenance");

    private void checkValueRanges(ToolReport report) {
        List<Map<String, Object>> formatRows = jdbc.queryForList(
                "SELECT id, title, content_format AS contentFormat FROM article "
                        + "WHERE content_format IS NOT NULL AND content_format NOT IN ('html', 'markdown')");
        if (!formatRows.isEmpty()) {
            report.error(formatRows.size()
                            + " 篇文章的 content_format 非 html/markdown（前台会按 html 分支渲染）",
                    formatRows.stream()
                            .map(r -> "#" + r.get("id") + " " + r.get("title") + " → \""
                                    + r.get("contentFormat") + "\"")
                            .toList());
        }

        Long negativeViews = jdbc.queryForObject(
                "SELECT COUNT(*) FROM article WHERE view_count < 0", Long.class);
        if (negativeViews != null && negativeViews > 0) {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT id, title, view_count AS v FROM article WHERE view_count < 0");
            report.error(negativeViews + " 篇文章的 view_count 为负数",
                    rows.stream().map(r -> "#" + r.get("id") + " " + r.get("title") + " → " + r.get("v")).toList());
        }

        String placeholders = BOOLEAN_SETTING_KEYS.stream().map(k -> "?").collect(Collectors.joining(", "));
        List<Map<String, Object>> boolRows = jdbc.queryForList(
                "SELECT setting_key AS k, setting_value AS v FROM setting WHERE setting_key IN ("
                        + placeholders + ")",
                BOOLEAN_SETTING_KEYS.toArray());
        List<String> badBoolean = new ArrayList<>();
        for (Map<String, Object> row : boolRows) {
            Object value = row.get("v");
            String text = value == null ? "" : String.valueOf(value);
            if (!VALID_BOOLEAN_SETTINGS.contains(text)) {
                badBoolean.add(row.get("k") + " = \"" + text + "\"（约定：\"\" / \"true\" / \"false\"）");
            }
        }
        if (!badBoolean.isEmpty()) {
            report.warn(badBoolean.size() + " 个开关型设置取值不在约定集合（前台只认 \"false\" 为关闭）",
                    badBoolean);
        }
    }

    /* ---------------------------------------------------------------- */
    /* 三、语义完整性（外键管不到的约束）                                 */
    /* ---------------------------------------------------------------- */

    private void checkSemantics(ToolReport report) {
        // 1) 跨文章父评论：回复挂到了别的文章的评论上
        List<Map<String, Object>> crossArticle = jdbc.queryForList(
                "SELECT c.id, c.article_id AS articleId, c.parent_id AS parentId, p.article_id AS parentArticleId "
                        + "FROM comment c JOIN comment p ON c.parent_id = p.id WHERE c.article_id <> p.article_id");
        if (!crossArticle.isEmpty()) {
            report.error(crossArticle.size() + " 条回复的父评论属于另一篇文章（前台会显示在错误文章下）",
                    crossArticle.stream()
                            .map(r -> "评论#" + r.get("id") + "（文章#" + r.get("articleId") + "）→ 父评论#"
                                    + r.get("parentId") + "（文章#" + r.get("parentArticleId") + "）")
                            .toList());
        }

        // 2) 三级嵌套：父评论自身也是回复（项目约定「评论只两级」）
        List<Map<String, Object>> deepNesting = jdbc.queryForList(
                "SELECT c.id, c.parent_id AS parentId, p.parent_id AS grandParentId "
                        + "FROM comment c JOIN comment p ON c.parent_id = p.id WHERE p.parent_id IS NOT NULL");
        if (!deepNesting.isEmpty()) {
            report.error(deepNesting.size() + " 条评论构成三级及以上嵌套（违反「只两级」约定）",
                    deepNesting.stream()
                            .map(r -> "评论#" + r.get("id") + " → 父#" + r.get("parentId") + " → 祖父#"
                                    + r.get("grandParentId"))
                            .toList());
        }

        // 3) 自环：自己指向自己
        Long selfRefs = jdbc.queryForObject(
                "SELECT COUNT(*) FROM comment WHERE parent_id = id", Long.class);
        if (selfRefs != null && selfRefs > 0) {
            report.error(selfRefs + " 条评论的 parent_id 指向自己");
        }

        // 4) 「回复谁」与「父评论」必须同属一篇文章 —— 由批 4 新增的 reply_to_id 引入，
        //    外键只保证「该评论存在」，管不到「同属一篇文章」。
        List<Map<String, Object>> crossReplyTo = jdbc.queryForList(
                "SELECT c.id, c.article_id AS articleId, c.reply_to_id AS replyToId, t.article_id AS targetArticleId "
                        + "FROM comment c JOIN comment t ON c.reply_to_id = t.id WHERE c.article_id <> t.article_id");
        if (!crossReplyTo.isEmpty()) {
            report.error(crossReplyTo.size() + " 条回复的 reply_to_id 指向另一篇文章的评论（回复通知会发给无关的人）",
                    crossReplyTo.stream()
                            .map(r -> "评论#" + r.get("id") + "（文章#" + r.get("articleId") + "）→ 目标#"
                                    + r.get("replyToId") + "（文章#" + r.get("targetArticleId") + "）")
                            .toList());
        }

        // 5) reply_to_id 指向自己
        Long replySelfRefs = jdbc.queryForObject(
                "SELECT COUNT(*) FROM comment WHERE reply_to_id = id", Long.class);
        if (replySelfRefs != null && replySelfRefs > 0) {
            report.error(replySelfRefs + " 条评论的 reply_to_id 指向自己");
        }
    }

    /* ---------------------------------------------------------------- */
    /* 四、计数漂移（展示用与删除保护用两套口径）                          */
    /* ---------------------------------------------------------------- */

    private void checkCountDrift(ToolReport report) {
        // 展示口径：已发布且未软删除（与 models/Type.js、models/Label.js 的公开计数一致）
        List<Map<String, Object>> typeRows = jdbc.queryForList(
                "SELECT t.id, t.type_name AS name, "
                        + "(SELECT COUNT(*) FROM article a WHERE a.type_id = t.id AND a.status = 'published' "
                        + "AND a.deleted_at IS NULL) AS publishedCount, "
                        + "(SELECT COUNT(*) FROM article a WHERE a.type_id = t.id AND a.deleted_at IS NULL) AS anyCount "
                        + "FROM type t ORDER BY t.id");
        List<String> emptyTypes = typeRows.stream()
                .filter(r -> asLong(r.get("anyCount")) == 0)
                .map(r -> "#" + r.get("id") + " " + r.get("name"))
                .toList();
        if (!emptyTypes.isEmpty()) {
            report.info(emptyTypes.size() + " 个分类下没有任何文章（前台已隐藏，仍可自行清理）", emptyTypes);
        }
        List<String> draftOnlyTypes = typeRows.stream()
                .filter(r -> asLong(r.get("anyCount")) > 0 && asLong(r.get("publishedCount")) == 0)
                .map(r -> "#" + r.get("id") + " " + r.get("name") + "（含草稿 " + r.get("anyCount") + " 篇）")
                .toList();
        if (!draftOnlyTypes.isEmpty()) {
            report.info(draftOnlyTypes.size() + " 个分类只有草稿（前台不展示，但删除保护会拦住）", draftOnlyTypes);
        }

        List<Map<String, Object>> labelRows = jdbc.queryForList(
                "SELECT l.id, l.label_name AS name, "
                        + "(SELECT COUNT(*) FROM article_label al JOIN article a ON a.id = al.article_id "
                        + "WHERE al.label_id = l.id AND a.status = 'published' AND a.deleted_at IS NULL) "
                        + "AS publishedCount, "
                        + "(SELECT COUNT(*) FROM article_label al JOIN article a ON a.id = al.article_id "
                        + "WHERE al.label_id = l.id AND a.deleted_at IS NULL) AS anyCount "
                        + "FROM label l ORDER BY l.id");
        List<String> emptyLabels = labelRows.stream()
                .filter(r -> asLong(r.get("anyCount")) == 0)
                .map(r -> "#" + r.get("id") + " " + r.get("name"))
                .toList();
        if (!emptyLabels.isEmpty()) {
            report.info(emptyLabels.size() + " 个标签未被任何文章使用（前台会展示 0 篇，可自行清理）", emptyLabels);
        }
    }

    /* ---------------------------------------------------------------- */
    /* 五、异常值 / 内容完整性                                            */
    /* ---------------------------------------------------------------- */

    private void checkAnomalies(ToolReport report) {
        List<Map<String, Object>> emptyContent = jdbc.queryForList(
                "SELECT id, title FROM article WHERE status = 'published' AND deleted_at IS NULL "
                        + "AND (content IS NULL OR TRIM(content) = '')");
        if (!emptyContent.isEmpty()) {
            report.error(emptyContent.size() + " 篇已发布文章正文为空（前台会渲染出空页面）",
                    emptyContent.stream().map(r -> "#" + r.get("id") + " " + r.get("title")).toList());
        }

        List<Map<String, Object>> emptyTitle = jdbc.queryForList(
                "SELECT id FROM article WHERE title IS NULL OR TRIM(title) = ''");
        if (!emptyTitle.isEmpty()) {
            report.error(emptyTitle.size() + " 篇文章标题为空",
                    emptyTitle.stream().map(r -> "#" + r.get("id")).toList());
        }

        List<Map<String, Object>> noSummary = jdbc.queryForList(
                "SELECT id, title FROM article WHERE status = 'published' AND deleted_at IS NULL "
                        + "AND (summary IS NULL OR TRIM(summary) = '')");
        if (!noSummary.isEmpty()) {
            report.info(noSummary.size() + " 篇已发布文章没有摘要（列表卡片与分享描述会退化为正文截断）",
                    noSummary.stream().map(r -> "#" + r.get("id") + " " + r.get("title")).toList());
        }

        List<Map<String, Object>> timeAnomaly = jdbc.queryForList(
                "SELECT id, title, created_at AS c, updated_at AS u FROM article WHERE updated_at < created_at");
        if (!timeAnomaly.isEmpty()) {
            report.warn(timeAnomaly.size() + " 篇文章的 updated_at 早于 created_at（时间倒挂）",
                    timeAnomaly.stream().map(r -> "#" + r.get("id") + " " + r.get("title")).toList());
        }

        List<Map<String, Object>> orphanComments = jdbc.queryForList(
                "SELECT c.id, c.article_id AS articleId FROM comment c "
                        + "LEFT JOIN article a ON a.id = c.article_id WHERE a.id IS NULL");
        if (!orphanComments.isEmpty()) {
            report.error(orphanComments.size() + " 条评论指向不存在的文章",
                    orphanComments.stream().map(r -> "评论#" + r.get("id") + " → 文章#" + r.get("articleId")).toList());
        }

        Long bloggerCount = jdbc.queryForObject("SELECT COUNT(*) FROM blogger", Long.class);
        if (bloggerCount != null && bloggerCount == 0) {
            report.warn("blogger 表为空（无人可登录后台，请检查初始化脚本）");
        }

        Long settingCount = jdbc.queryForObject("SELECT COUNT(*) FROM setting", Long.class);
        if (settingCount != null && settingCount == 0) {
            report.warn("setting 表为空（站点将全部走代码内默认值）");
        }
    }

    /* ---------------------------------------------------------------- */
    /* 主流程                                                            */
    /* ---------------------------------------------------------------- */

    @Override
    public int run(ToolOptions options) throws Exception {
        boolean strict = options.flag("strict");

        System.out.println(ToolReport.repeat("=", 64));
        System.out.println(" 数据层体检报告（只读，不修改任何数据）");
        System.out.println(ToolReport.repeat("=", 64));
        System.out.println("[数据库  ] " + jdbc.queryForObject("SELECT DATABASE()", String.class));
        System.out.println("[执行时间] " + ToolRunner.nowText());
        System.out.println("[模式    ] "
                + (strict ? "STRICT（存在 error 时退出码 1）" : "普通（始终退出码 0）"));

        ToolReport report = new ToolReport();
        report.runSection(1, "结构安全网（表 / 列 / 外键 / 唯一索引是否齐备）", () -> checkSchema(report));
        report.runSection(2, "取值越界（varchar 列不受枚举保护）", () -> checkValueRanges(report));
        report.runSection(3, "语义完整性（外键管不到的约束）", () -> checkSemantics(report));
        report.runSection(4, "计数与使用情况", () -> checkCountDrift(report));
        report.runSection(5, "异常值 / 内容完整性", () -> checkAnomalies(report));

        int errors = report.count(ToolReport.Level.ERROR);
        int warns = report.count(ToolReport.Level.WARN);

        System.out.println();
        System.out.println(ToolReport.repeat("=", 64));
        System.out.println("汇总");
        System.out.println(ToolReport.repeat("=", 64));
        System.out.println("  [error] " + errors + " 项");
        System.out.println("  [warn ] " + warns + " 项");
        System.out.println("  [info ] " + report.count(ToolReport.Level.INFO) + " 项");

        if (errors > 0) {
            System.out.println();
            System.out.println("【需要处理的 error 项】");
            for (String title : report.titles(ToolReport.Level.ERROR)) {
                System.out.println("  ✗ " + title);
            }
        }

        System.out.println();
        System.out.println(errors > 0
                ? "体检结束：发现需要处理的问题（见上）。"
                : warns > 0
                        ? "体检结束：无 error，有若干 warn 建议确认。"
                        : "体检结束：数据自洽。");

        return strict && errors > 0 ? 1 : 0;
    }

    private static long asLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
