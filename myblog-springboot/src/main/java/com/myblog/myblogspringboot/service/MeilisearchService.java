package com.myblog.myblogspringboot.service;

import java.net.URI;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import jakarta.annotation.PostConstruct;

/**
 * Meilisearch 全文搜索服务（基于 REST API）
 */
@Service
public class MeilisearchService {

    private static final Logger log = LoggerFactory.getLogger(MeilisearchService.class);
    private static final String INDEX_NAME = "articles";
    private static final String PRIMARY_KEY = "id";

    /** 索引设置任务 / 建索引任务的等待上限 */
    private static final long TASK_TIMEOUT_MILLIS = 30_000L;

    /**
     * 索引设置 —— <b>必须与 Express `services/meilisearch.js` 的 `getIndex()` 完全一致</b>。
     * PATCH settings 是「整体替换该键」，两个后端谁最后启动谁说了算；
     * 值不一致会让对方的 filter / sort 静默失效（例如 Express 会把 `deletedAt` 放进 filterable）。
     */
    private static final List<String> FILTERABLE_ATTRIBUTES = List.of("status", "typeId", "deletedAt");
    private static final List<String> SEARCHABLE_ATTRIBUTES = List.of("title", "summary", "content");
    private static final List<String> SORTABLE_ATTRIBUTES = List.of("createdAt", "viewCount");


    @Value("${app.meilisearch.host:127.0.0.1}")
    private String host;

    @Value("${app.meilisearch.port:7700}")
    private int port;

    @Value("${app.meilisearch.master-key:}")
    private String masterKey;

    /**
     * HTTP 客户端。
     *
     * <p>⚠️ 必须用 {@link JdkClientHttpRequestFactory}（JDK HttpClient），**不能用
     * `new RestTemplate()` 的默认实现**：默认的 `SimpleClientHttpRequestFactory` 基于
     * `HttpURLConnection`，**不支持 PATCH**，请求会直接抛
     * `Invalid HTTP method: PATCH`（2026-09-16 实测）。
     * 而 Meili 的索引设置（filterable / searchable / sortable）与主键修正都只能走 PATCH
     * —— 于是那些调用**从未成功过**，只是失败被 catch 掉只打一行日志。
     * 后果：Spring 单独部署时索引没有任何 filterable 属性 → `filter=status = published`
     * 报 400 → 搜索永远静默降级为 SQL LIKE（第 7 轮修掉 URI 二次编码后仍搜不出结果，
     * 根因就在这里）。
     */
    private final RestTemplate restTemplate = new RestTemplate(new JdkClientHttpRequestFactory());
    private boolean available = false;
    private String baseUrl;

    @PostConstruct
    public void init() {
        baseUrl = "http://" + host + ":" + port;
        try {
            ResponseEntity<Map> resp = restTemplate.getForEntity(baseUrl + "/health", Map.class);
            if (resp.getStatusCode().is2xxSuccessful()) {
                ensureIndex();
                available = true;
                log.info("Meilisearch connected ({}:{})", host, port);
            }
        } catch (Exception e) {
            log.warn("Meilisearch unavailable, search fallback to SQL LIKE: {}", e.getMessage());
            available = false;
        }
    }

    /**
     * 确保索引存在且 filterable / searchable / sortable 设置齐备。
     *
     * <p>供 `sync-meili` 全量回填工具调用（对标 Express `services/meilisearch.js` 的
     * `getIndex()`）：**不能只 POST documents** —— 索引不存在时 Meili 会隐式建一个
     * 没有任何设置的索引，于是 `filter=status = published` 报 400、搜索永远降级 SQL LIKE。
     *
     * @return 索引是否就绪
     */
    public boolean ensureIndexReady() {
        try {
            ensureIndex();
            return true;
        } catch (Exception e) {
            log.warn("Meilisearch 索引初始化失败: {}", e.getMessage());
            return false;
        }
    }

    /**
     * 删除索引（供全量重建；索引本来不存在也视为成功）。
     *
     * @return 是否删除成功
     */
    public boolean deleteIndex() {
        try {
            restTemplate.exchange(baseUrl + "/indexes/" + INDEX_NAME, HttpMethod.DELETE,
                    new HttpEntity<>(authHeaders()), Map.class);
            return true;
        } catch (Exception e) {
            // 404 = 本来就不存在，等价于「已删干净」
            return e.getMessage() != null && e.getMessage().contains("404");
        }
    }

    /**
     * 批量写入文档（对标 Express `index.addDocuments(batch)`）。
     *
     * @return Meili 的 taskUid；失败返回 null
     */
    @SuppressWarnings("unchecked")
    public Long addDocuments(List<Map<String, Object>> docs) {
        if (docs == null || docs.isEmpty()) {
            return null;
        }
        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(
                    baseUrl + "/indexes/" + INDEX_NAME + "/documents",
                    new HttpEntity<>(docs, authHeaders()), Map.class);
            Object taskUid = resp.getBody() == null ? null : resp.getBody().get("taskUid");
            return taskUid instanceof Number number ? number.longValue() : null;
        } catch (Exception e) {
            log.warn("Meilisearch 批量写入失败: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 等待 task 完成（对标 Express `client.waitForTask(taskUid)`）。
     *
     * @return `succeeded` / task 自身返回的状态 / `timeout`
     */
    @SuppressWarnings("unchecked")
    public String waitForTask(long taskUid, long timeoutMillis) {
        long deadline = System.currentTimeMillis() + timeoutMillis;
        while (System.currentTimeMillis() < deadline) {
            try {
                ResponseEntity<Map> resp = restTemplate.exchange(
                        baseUrl + "/tasks/" + taskUid, HttpMethod.GET,
                        new HttpEntity<>(authHeaders()), Map.class);
                Object status = resp.getBody() == null ? null : resp.getBody().get("status");
                String text = status == null ? "" : status.toString();
                if (!"enqueued".equals(text) && !"processing".equals(text)) {
                    return text;
                }
            } catch (Exception e) {
                log.debug("Meilisearch task 查询失败: {}", e.getMessage());
            }
            try {
                Thread.sleep(200L);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "interrupted";
            }
        }
        return "timeout";
    }

    /**
     * 索引内的文档数（对标 Express `index.getStats().numberOfDocuments`）。
     *
     * @return 文档数；查询失败或索引不存在返回 -1
     */
    @SuppressWarnings("unchecked")
    public long documentCount() {
        try {
            ResponseEntity<Map> resp = restTemplate.exchange(
                    baseUrl + "/indexes/" + INDEX_NAME + "/stats", HttpMethod.GET,
                    new HttpEntity<>(authHeaders()), Map.class);
            Object count = resp.getBody() == null ? null : resp.getBody().get("numberOfDocuments");
            return count instanceof Number number ? number.longValue() : -1L;
        } catch (Exception e) {
            return -1L;
        }
    }

    @SuppressWarnings("unchecked")
    private void ensureIndex() {
        // ── 建索引是**异步任务**，必须等它落地 ──
        // 2026-09-16 实测：不等就写文档会踩两个坑 ——
        //   ① 文档写入会抢先「隐式建索引」并做**主键推断**，而文档里同时有 id 与 typeId
        //      → 推断失败（index_primary_key_multiple_candidates_found）→ 整批 0 条写入；
        //   ② 隐式建出来的索引 primaryKey = null，此后想设主键只能靠 PATCH，很麻烦。
        // 此前只有 syncArticle 在启动数秒后才被调用，靠「时间差」侥幸没暴露；
        // sync-meili 工具是「建索引后立刻写文档」，一跑就现原形。
        Map<String, Object> info = fetchIndexInfo();
        if (info == null) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("uid", INDEX_NAME);
            body.put("primaryKey", PRIMARY_KEY);
            waitForTaskQuietly(postForTaskUid("/indexes", body), TASK_TIMEOUT_MILLIS, "建索引");
        } else if (!PRIMARY_KEY.equals(String.valueOf(info.get("primaryKey")))) {
            // 索引存在但主键不对/为空（隐式建出来的）：修一次，只能对空索引生效
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("primaryKey", PRIMARY_KEY);
            waitForTaskQuietly(patchForTaskUid("/indexes/" + INDEX_NAME, body), TASK_TIMEOUT_MILLIS, "修正主键");
        }

        // 索引设置每次启动都幂等补齐：PATCH 该键是**整体替换**，
        // 因此这三组值必须与 Express services/meilisearch.js 的 getIndex() 完全一致，
        // 否则两个后端谁最后启动，谁就把对方的设置覆盖掉。
        updateSettings("filterableAttributes", FILTERABLE_ATTRIBUTES);
        updateSettings("searchableAttributes", SEARCHABLE_ATTRIBUTES);
        updateSettings("sortableAttributes", SORTABLE_ATTRIBUTES);
    }

    private Map<String, Object> fetchIndexInfo() {
        try {
            ResponseEntity<Map> resp = restTemplate.exchange(baseUrl + "/indexes/" + INDEX_NAME, HttpMethod.GET,
                    new HttpEntity<>(authHeaders()), Map.class);
            return resp.getBody();
        } catch (Exception e) {
            return null;
        }
    }

    private void updateSettings(String key, Object value) {
        Long taskUid = patchForTaskUid("/indexes/" + INDEX_NAME + "/settings",
                Map.of(key, value));
        // 不等设置落地的话，紧接着的 search 可能因属性尚未生效而报 400 → 静默降级 LIKE
        waitForTaskQuietly(taskUid, TASK_TIMEOUT_MILLIS, "设置 " + key);
    }

    /** POST 并取回 taskUid；失败返回 null */
    private Long postForTaskUid(String path, Object body) {
        try {
            ResponseEntity<Map> resp = restTemplate.postForEntity(baseUrl + path,
                    new HttpEntity<>(body, authHeaders()), Map.class);
            return taskUidOf(resp);
        } catch (Exception e) {
            log.warn("Meilisearch POST {} 失败: {}", path, e.getMessage());
            return null;
        }
    }

    /** PATCH 并取回 taskUid；失败返回 null */
    private Long patchForTaskUid(String path, Object body) {
        try {
            ResponseEntity<Map> resp = restTemplate.exchange(baseUrl + path, HttpMethod.PATCH,
                    new HttpEntity<>(body, authHeaders()), Map.class);
            return taskUidOf(resp);
        } catch (Exception e) {
            log.warn("Meilisearch PATCH {} 失败: {}", path, e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Long taskUidOf(ResponseEntity<Map> resp) {
        Object taskUid = resp.getBody() == null ? null : resp.getBody().get("taskUid");
        return taskUid instanceof Number number ? number.longValue() : null;
    }

    private void waitForTaskQuietly(Long taskUid, long timeoutMillis, String what) {
        if (taskUid == null) {
            return;
        }
        String status = waitForTask(taskUid, timeoutMillis);
        if (!"succeeded".equals(status)) {
            log.warn("Meilisearch {} 未成功（task {}）: {}", what, taskUid, status);
        }
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (masterKey != null && !masterKey.isBlank()) {
            headers.set("Authorization", "Bearer " + masterKey);
        }
        return headers;
    }

    public boolean isAvailable() { return available; }

    @SuppressWarnings("unchecked")
    public void syncArticle(Map<String, Object> document) {
        if (!available) return;
        try {
            restTemplate.postForEntity(baseUrl + "/indexes/" + INDEX_NAME + "/documents",
                    new HttpEntity<>(List.of(document), authHeaders()), Map.class);
        } catch (Exception e) {
            log.debug("Meilisearch sync failed: {}", e.getMessage());
        }
    }

    public void deleteArticle(Integer id) {
        if (!available) return;
        try {
            restTemplate.delete(baseUrl + "/indexes/" + INDEX_NAME + "/documents/" + id);
        } catch (Exception e) {
            log.debug("Meilisearch delete failed: {}", e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public SearchHit search(String keyword, int page, int pageSize, Integer typeId) {
        if (!available || keyword == null || keyword.isBlank()) return null;
        try {
            // ⚠️ 必须用 URI 对象而不是字符串：RestTemplate 的默认 uriTemplateHandler
            //    （EncodingMode.TEMPLATE_AND_VALUES）会把手写查询串里的 %20 / %3D
            //    再次编码成 %2520 / %253D → Meili 收到非法 filter 报 400 → 静默降级 SQL LIKE。
            //    （2026-09-14 实测：Spring 的 Meilisearch 检索因此从未真正生效。）
            UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(baseUrl)
                    .path("/indexes/" + INDEX_NAME + "/search")
                    .queryParam("q", keyword)
                    .queryParam("page", page)
                    .queryParam("hitsPerPage", pageSize)
                    .queryParam("attributesToRetrieve", "id")
                    .queryParam("filter", typeId == null
                            ? "status = published"
                            : "status = published AND typeId = " + typeId);
            URI uri = builder.build().encode().toUri();

            ResponseEntity<Map> resp = restTemplate.exchange(uri, HttpMethod.GET,
                    new HttpEntity<>(authHeaders()), Map.class);

            Map<String, Object> body = resp.getBody();
            if (body == null) return null;

            List<Map<String, Object>> hits = (List<Map<String, Object>>) body.get("hits");
            List<Integer> ids = new ArrayList<>();
            if (hits != null) {
                for (Map<String, Object> hit : hits) {
                    Object idVal = hit.get("id");
                    if (idVal instanceof Number n) ids.add(n.intValue());
                    else if (idVal != null) ids.add(Integer.parseInt(String.valueOf(idVal)));
                }
            }

            Object totalObj = body.get("estimatedTotalHits");
            if (totalObj == null) {
                // 用 page/hitsPerPage 查询时返回的是 totalHits，没有 estimatedTotalHits
                totalObj = body.get("totalHits");
            }
            int total = totalObj instanceof Number n ? n.intValue() : ids.size();

            return new SearchHit(ids, Math.max(total, ids.size()));
        } catch (Exception e) {
            log.debug("Meilisearch search failed: {}", e.getMessage());
            return null;
        }
    }

    public static class SearchHit {
        private final List<Integer> ids;
        private final int total;
        public SearchHit(List<Integer> ids, int total) { this.ids = ids; this.total = total; }
        public List<Integer> getIds() { return ids; }
        public int getTotal() { return total; }
    }
}
