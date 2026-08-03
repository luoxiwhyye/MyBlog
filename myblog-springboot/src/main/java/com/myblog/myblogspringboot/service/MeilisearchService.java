package com.myblog.myblogspringboot.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
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
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import jakarta.annotation.PostConstruct;

/**
 * Meilisearch 全文搜索服务（基于 REST API）
 */
@Service
public class MeilisearchService {

    private static final Logger log = LoggerFactory.getLogger(MeilisearchService.class);
    private static final String INDEX_NAME = "articles";

    @Value("${app.meilisearch.host:127.0.0.1}")
    private String host;

    @Value("${app.meilisearch.port:7700}")
    private int port;

    @Value("${app.meilisearch.master-key:}")
    private String masterKey;

    private final RestTemplate restTemplate = new RestTemplate();
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

    @SuppressWarnings("unchecked")
    private void ensureIndex() {
        try {
            restTemplate.exchange(baseUrl + "/indexes/" + INDEX_NAME, HttpMethod.GET,
                    new HttpEntity<>(authHeaders()), Map.class);
        } catch (Exception e) {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("uid", INDEX_NAME);
            body.put("primaryKey", "id");
            restTemplate.postForEntity(baseUrl + "/indexes",
                    new HttpEntity<>(body, authHeaders()), Map.class);
            updateSettings("filterableAttributes", List.of("status", "typeId"));
            updateSettings("searchableAttributes", List.of("title", "summary", "content"));
            updateSettings("sortableAttributes", List.of("createdAt", "viewCount"));
        }
    }

    @SuppressWarnings("unchecked")
    private void updateSettings(String key, Object value) {
        try {
            restTemplate.patchForObject(baseUrl + "/indexes/" + INDEX_NAME + "/settings",
                    new HttpEntity<>(Map.of(key, value), authHeaders()), Map.class);
        } catch (Exception ignored) {}
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
            List<Map<String, Object>> docs = List.of(document);
            restTemplate.postForEntity(baseUrl + "/indexes/" + INDEX_NAME + "/documents",
                    new HttpEntity<>(docs, authHeaders()), Map.class);
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
            String encodedKw = URLEncoder.encode(keyword, StandardCharsets.UTF_8);
            StringBuilder url = new StringBuilder(baseUrl + "/indexes/" + INDEX_NAME + "/search");
            url.append("?q=").append(encodedKw);
            url.append("&page=").append(page);
            url.append("&hitsPerPage=").append(pageSize);
            url.append("&attributesToRetrieve=id");
            url.append("&filter=status%20%3D%20published");
            if (typeId != null) {
                url.append("%20AND%20typeId%20%3D%20").append(typeId);
            }

            ResponseEntity<Map> resp = restTemplate.exchange(url.toString(), HttpMethod.GET,
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
