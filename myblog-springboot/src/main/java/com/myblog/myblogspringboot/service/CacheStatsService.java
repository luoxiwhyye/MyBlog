package com.myblog.myblogspringboot.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/**
 * 缓存统计与运维（对标 Express middleware/cache.js 的 stats/clearAll/preheat）。
 *
 * 命中率统计通过 {@code CountingCacheInterceptor} 在每次缓存读写时调用
 * recordHit / recordMiss，均为进程内原子计数。
 */
@Service
public class CacheStatsService {

    private static final Logger log = LoggerFactory.getLogger(CacheStatsService.class);

    private final AtomicLong hits = new AtomicLong();
    private final AtomicLong misses = new AtomicLong();
    private final Instant startedAt = Instant.now();

    private final CacheManager cacheManager;
    private final StringRedisTemplate redisTemplate;

    @Value("${server.port:3000}")
    private String serverPort;

    public CacheStatsService(CacheManager cacheManager, StringRedisTemplate redisTemplate) {
        this.cacheManager = cacheManager;
        this.redisTemplate = redisTemplate;
    }

    /** 缓存命中 +1（由 CacheInterceptor 调用） */
    public void recordHit() {
        hits.incrementAndGet();
    }

    /** 缓存未命中 +1（由 CacheInterceptor 调用） */
    public void recordMiss() {
        misses.incrementAndGet();
    }

    /**
     * 缓存统计快照
     */
    public Map<String, Object> getSnapshot() {
        long h = hits.get();
        long m = misses.get();
        long total = h + m;
        double hitRate = total > 0 ? Math.round(h * 10000.0 / total) / 100.0 : 0.0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hits", h);
        result.put("misses", m);
        result.put("hitRate", hitRate);
        result.put("keyCount", countKeys());
        result.put("startedAt", startedAt.toString());
        return result;
    }

    /**
     * 清空全部缓存（Redis + 内存），返回清除的缓存分区数
     */
    public int clearAll() {
        int count = 0;
        Collection<String> names = cacheManager.getCacheNames();
        for (String name : names) {
            Cache cache = cacheManager.getCache(name);
            if (cache != null) {
                cache.clear();
                count++;
            }
        }
        log.info("[cache] 已清空 {} 个缓存分区: {}", count, names);
        return count;
    }

    /**
     * 缓存预热：预取常用接口，缓解首次访问慢（对标 Express cache.preheat）。
     * 在独立线程中执行，不阻塞请求。
     */
    public void preheat(List<String> prefixes) {
        List<String> paths = (prefixes == null || prefixes.isEmpty())
                ? List.of("settings", "types", "labels")
                : prefixes;

        // 守护线程异步预热，不阻塞请求
        Thread thread = new Thread(() -> {
            HttpClient client = HttpClient.newHttpClient();
            for (String prefix : paths) {
                String url = "http://127.0.0.1:" + serverPort + "/api/v1/" + prefix;
                try {
                    HttpRequest request = HttpRequest.newBuilder(URI.create(url)).GET().build();
                    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                    log.info("[cache] 预热{}: GET {}", response.statusCode() == 200 ? "成功" : "跳过(" + response.statusCode() + ")", url);
                } catch (Exception e) {
                    log.warn("[cache] 预热失败: {} - {}", url, e.getMessage());
                }
            }
        });
        thread.setDaemon(true);
        thread.start();
    }

    /**
     * 统计 Redis 中的缓存键数量（按缓存分区精确匹配，Redis 不可用时返回 0）
     */
    private long countKeys() {
        try {
            long total = 0;
            for (String name : cacheManager.getCacheNames()) {
                Collection<String> keys = redisTemplate.keys(name + "::*");
                total += keys == null ? 0 : keys.size();
            }
            return total;
        } catch (Exception e) {
            // Redis 不可用或未配置
            return 0;
        }
    }
}
