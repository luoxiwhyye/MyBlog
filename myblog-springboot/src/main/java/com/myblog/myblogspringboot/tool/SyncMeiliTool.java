package com.myblog.myblogspringboot.tool;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.myblog.myblogspringboot.service.MeilisearchService;

/**
 * Meilisearch 索引全量回填工具 —— `myblog-express/scripts/syncMeili.js` 的等价实现。
 *
 * <p>背景：`syncArticle()` 只在文章创建 / 更新 / 发布时被调用，历史文章不会自动进索引。
 * Spring 侧此前**只有增量**（`ArticleService.syncToMeilisearch`），没有全量回填入口
 * —— 换索引 / 重建容器 / 首次部署之后，搜索会静默只剩 LIKE 降级。
 *
 * <p>运行：
 * <pre>
 *   java -jar target/*.jar --spring.profiles.active=tool --tool=sync-meili
 *   java -jar target/*.jar --spring.profiles.active=tool --tool=sync-meili --rebuild
 * </pre>
 *
 * <p>幂等：同一 id 覆盖写入，重复执行安全。
 */
@Component
@Profile("tool")
public class SyncMeiliTool implements OpsTool {

    private static final String INDEX_NAME = "articles";
    private static final int BATCH_SIZE = 50;
    private static final long TASK_TIMEOUT_MILLIS = 60_000L;

    /** 与编写时相同的格式，便于用 app.time-zone 显式换算出 epoch 毫秒 */
    private static final DateTimeFormatter DB_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final JdbcTemplate jdbc;
    private final MeilisearchService meilisearch;

    /**
     * 无时区墙钟字面量的源时区。
     *
     * <p>⚠️ 必须与数据库写入端一致（批 3 定下的 `app.time-zone`）。
     * 索引里的 `createdAt` 是**用于排序的 epoch 毫秒**，源时区写错会让所有历史文章的
     * 排序整体偏移 8 小时 —— 而且不报错。
     */
    @Value("${app.time-zone:Asia/Shanghai}")
    private String timeZone;

    public SyncMeiliTool(JdbcTemplate jdbc, MeilisearchService meilisearch) {
        this.jdbc = jdbc;
        this.meilisearch = meilisearch;
    }

    @Override
    public String id() {
        return "sync-meili";
    }

    @Override
    public String title() {
        return "Meilisearch 索引全量回填";
    }

    /**
     * 取已发布且未软删除的文章。
     *
     * <p>用 `DATE_FORMAT` 把 datetime 取成字符串再自行换算（而不是让 JDBC 驱动决定），
     * 这样「源时区」只有一个来源（`app.time-zone`），不会出现「驱动按 serverTimezone 转、
     * 工具按 app.time-zone 转」两套口径。
     */
    private List<Map<String, Object>> fetchPublishedArticles() {
        return jdbc.queryForList(
                "SELECT a.id, a.title, a.summary, a.content, a.status, "
                        + "a.type_id AS typeId, a.cover_image AS coverImage, a.view_count AS viewCount, "
                        + "DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt "
                        + "FROM article a WHERE a.status = 'published' AND a.deleted_at IS NULL ORDER BY a.id ASC");
    }

    private long toEpochMillis(String wallClock) {
        if (wallClock == null || wallClock.isBlank()) {
            return System.currentTimeMillis();
        }
        try {
            return LocalDateTime.parse(wallClock, DB_TIME)
                    .atZone(ZoneId.of(timeZone))
                    .toInstant()
                    .toEpochMilli();
        } catch (Exception e) {
            return System.currentTimeMillis();
        }
    }

    @Override
    public int run(ToolOptions options) throws Exception {
        boolean rebuild = options.flag("rebuild");

        System.out.println(ToolReport.repeat("=", 64));
        System.out.println(" Meilisearch 索引回填（" + INDEX_NAME + "）");
        System.out.println(ToolReport.repeat("=", 64));
        System.out.println("[执行时间] " + ToolRunner.nowText());
        System.out.println("[模式    ] " + (rebuild ? "REBUILD（先删除索引再重建）" : "增量回填（只提交，不重建）"));
        System.out.println("[源时区  ] " + timeZone);
        System.out.println();

        if (!meilisearch.isAvailable()) {
            System.err.println("✗ 连不上 Meilisearch，请确认容器已启动并检查 MEILI_* 配置");
            return 1;
        }

        if (rebuild) {
            System.out.println("重新构建：删除索引 " + INDEX_NAME);
            if (!meilisearch.deleteIndex()) {
                System.err.println("✗ 删除索引失败（非 404），请检查 Meilisearch 日志");
                return 1;
            }
        }

        // 必须由 ensureIndexReady 建索引（含 filterable / searchable / sortable 设置）：
        // 直接 POST documents 会隐式建出「没有设置」的索引 → filter 报 400 → 搜索永远降级
        if (!meilisearch.ensureIndexReady()) {
            System.err.println("✗ 索引初始化失败（设置未生效），请检查容器日志");
            return 1;
        }

        List<Map<String, Object>> rows = fetchPublishedArticles();
        System.out.println("查询到 " + rows.size() + " 篇已发布文章");
        if (rows.isEmpty()) {
            System.out.println("没有需要同步的文章");
            return 0;
        }

        List<Map<String, Object>> docs = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            Map<String, Object> doc = new LinkedHashMap<>();
            doc.put("id", row.get("id"));
            doc.put("title", row.get("title"));
            doc.put("summary", row.get("summary") == null ? "" : row.get("summary"));
            doc.put("content", row.get("content") == null ? "" : row.get("content"));
            doc.put("status", row.get("status"));
            doc.put("typeId", row.get("typeId"));
            doc.put("coverImage", row.get("coverImage") == null ? "" : row.get("coverImage"));
            doc.put("viewCount", row.get("viewCount") == null ? 0 : row.get("viewCount"));
            doc.put("createdAt", toEpochMillis((String) row.get("createdAt")));
            // 查询已过滤 deleted_at IS NULL，故恒为 null；保留键是为了与 Express 侧文档同形
            doc.put("deletedAt", null);
            docs.add(doc);
        }

        for (int i = 0; i < docs.size(); i += BATCH_SIZE) {
            List<Map<String, Object>> batch = docs.subList(i, Math.min(i + BATCH_SIZE, docs.size()));
            Long taskUid = meilisearch.addDocuments(batch);
            if (taskUid == null) {
                System.err.println("✗ 第 " + (i / BATCH_SIZE + 1) + " 批提交失败");
                return 1;
            }
            String status = meilisearch.waitForTask(taskUid, TASK_TIMEOUT_MILLIS);
            if (!"succeeded".equals(status)) {
                System.err.println("✗ 第 " + (i / BATCH_SIZE + 1) + " 批同步失败：task " + taskUid + " → " + status);
                return 1;
            }
            System.out.println("✓ 已同步 " + Math.min(i + BATCH_SIZE, docs.size()) + "/" + docs.size());
        }

        long count = meilisearch.documentCount();
        System.out.println();
        System.out.println("完成：索引 " + INDEX_NAME + " 文档数 = " + (count < 0 ? "查询失败" : count));
        return 0;
    }
}
