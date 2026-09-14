package com.myblog.myblogspringboot.service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Service;

/**
 * 进程内性能监控（对标 Express middleware/metrics.js）。
 *
 * 响应结构必须与 Express 的 {@code metrics.getSnapshot()} **逐字段一致**，
 * 否则后台「缓存运维」页的性能卡片与慢请求表解析不到
 * （admin 端读的是同一条 /api/v1/metrics）。
 *
 * 字段：totalRequests / avgResponseTimeMs / maxResponseTimeMs / errorRate /
 *       statusCodes / recentSlow / startedAt
 */
@Service
public class MetricsService {

    /** 慢请求阈值（毫秒），与 Express 一致 */
    private static final long SLOW_THRESHOLD_MS = 2000;
    /** 慢请求最多保留条数 */
    private static final int MAX_SLOW_SAMPLES = 20;

    private final AtomicLong totalRequests = new AtomicLong();
    private final AtomicLong totalErrors = new AtomicLong();
    /** 累计响应时间（微秒），避免浮点累加误差 */
    private final AtomicLong totalResponseTimeMicros = new AtomicLong();
    /** 最大响应时间（微秒） */
    private final AtomicLong maxResponseTimeMicros = new AtomicLong();
    private final Map<String, AtomicLong> statusCodes = new ConcurrentHashMap<>();
    /** 最近慢请求（写入顺序，快照时反转成「最新在前」） */
    private final Deque<Map<String, Object>> recentSlow = new ArrayDeque<>();

    private final Instant startedAt = Instant.now();

    /**
     * 记录一次请求（由 MetricsFilter 在请求完成后调用）。
     *
     * @param elapsedMicros 本次请求耗时（微秒）
     */
    public void record(String method, String path, int status, long elapsedMicros) {
        totalRequests.incrementAndGet();
        totalResponseTimeMicros.addAndGet(elapsedMicros);
        maxResponseTimeMicros.accumulateAndGet(elapsedMicros, Math::max);

        statusCodes.computeIfAbsent(String.valueOf(status), k -> new AtomicLong()).incrementAndGet();

        if (status >= 400) {
            totalErrors.incrementAndGet();
        }

        if (elapsedMicros > SLOW_THRESHOLD_MS * 1000L) {
            Map<String, Object> sample = new LinkedHashMap<>();
            sample.put("method", method);
            sample.put("path", path);
            sample.put("ms", Math.round(elapsedMicros / 1000.0));
            sample.put("status", status);
            sample.put("at", Instant.now().toString());

            synchronized (recentSlow) {
                recentSlow.addLast(sample);
                while (recentSlow.size() > MAX_SLOW_SAMPLES) {
                    recentSlow.removeFirst();
                }
            }
        }
    }

    /**
     * 汇总监控指标快照（结构与 Express 保持一致）。
     */
    public Map<String, Object> getSnapshot() {
        long total = totalRequests.get();
        long errors = totalErrors.get();

        Map<String, Long> codes = new TreeMap<>();
        statusCodes.forEach((code, count) -> codes.put(code, count.get()));

        List<Map<String, Object>> slow;
        synchronized (recentSlow) {
            slow = new ArrayList<>(recentSlow);
        }
        // Express 是 push + 快照时 reverse()，即「最新在前」
        List<Map<String, Object>> newestFirst = new ArrayList<>(slow.size());
        for (int i = slow.size() - 1; i >= 0; i--) {
            newestFirst.add(slow.get(i));
        }

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("totalRequests", total);
        snapshot.put("avgResponseTimeMs",
                total > 0 ? Math.round((double) totalResponseTimeMicros.get() / total / 1000.0) : 0L);
        snapshot.put("maxResponseTimeMs", Math.round(maxResponseTimeMicros.get() / 1000.0));
        snapshot.put("errorRate",
                total > 0 ? Math.round(errors * 10000.0 / total) / 100.0 : 0.0);
        snapshot.put("statusCodes", codes);
        snapshot.put("recentSlow", newestFirst);
        snapshot.put("startedAt", startedAt.toString());
        return snapshot;
    }
}
