package com.myblog.myblogspringboot.config;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * API 速率限制过滤器。
 *
 * 对标 Express middleware/rateLimiter.js 的分层限流策略（数值、窗口、文案逐项对齐）：
 *   全局限流：所有 /api/v1/* 请求（15 分钟 1200 次）
 *   登录限流：POST /api/v1/blogger/login（15 分钟 10 次，成功不计数）
 *   评论限流：POST /api/v1/comments（15 分钟 30 次）
 *   留言限流：POST /api/v1/message-board（15 分钟 20 次）
 *   上传限流：POST /api/v1/upload/*（15 分钟 50 次）
 *   错误上报：POST /api/v1/error-log（10 分钟 20 次）
 *
 * ⚠️ 全局配额是 1200 而非 300：SSR 博客场景下一个页面要发多次请求，Express 侧
 *   早已从 300 提升到 1200，Spring 侧一直没跟上（配额只有 1/4，更容易误触 429）。
 *
 * 每个 IP 独立计数，窗口过期后自动重置。
 */
@Component
@Order(2)
public class RateLimitFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private static final int MINUTE_MS = 60 * 1000;
    private static final int WINDOW_15_MIN = 15 * MINUTE_MS;
    private static final int WINDOW_10_MIN = 10 * MINUTE_MS;

    private final Map<String, WindowCounter> counters = new ConcurrentHashMap<>();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        String path = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();
        String clientIp = getClientIp(httpRequest);

        // 仅对 /api/v1/* 路径进行限流
        if (!path.startsWith("/api/v1/")) {
            chain.doFilter(request, response);
            return;
        }

        // 确定限流规则
        RateLimitRule rule = getRule(path, method);
        if (rule == null) {
            chain.doFilter(request, response);
            return;
        }

        String key = clientIp + ":" + rule.name;
        WindowCounter counter = counters.computeIfAbsent(key, k -> new WindowCounter(rule.windowMs));

        // 清理过期窗口
        counter.cleanIfExpired();

        // 检查是否超限
        if (counter.isExceeded(rule.maxRequests)) {
            log.warn("限流触发: IP={}, path={}, rule={}, count={}", clientIp, path, rule.name, counter.getCount());
            httpResponse.setStatus(429);
            httpResponse.setContentType("application/json;charset=UTF-8");
            httpResponse.getWriter().write(
                    String.format("{\"code\":429,\"message\":\"%s\",\"data\":null}", rule.message));
            return;
        }

        counter.increment();

        // 放行请求；对于登录限流，成功后回退计数
        chain.doFilter(request, response);

        if (rule.skipOnSuccess && httpResponse.getStatus() == 200) {
            counter.decrement();
        }
    }

    private RateLimitRule getRule(String path, String method) {
        boolean isPost = "POST".equalsIgnoreCase(method);

        // 登录限流（优先级最高，成功后回退计数）
        if (isPost && path.equals("/api/v1/blogger/login")) {
            return new RateLimitRule("login", 10, WINDOW_15_MIN, "登录尝试过于频繁，请15分钟后再试", true);
        }
        // 评论限流
        if (isPost && path.equals("/api/v1/comments")) {
            return new RateLimitRule("comment", 30, WINDOW_15_MIN, "评论发送过于频繁，请稍后再试", false);
        }
        // 留言限流（访客免登录，防止刷屏）
        if (isPost && path.equals("/api/v1/message-board")) {
            return new RateLimitRule("message", 20, WINDOW_15_MIN, "留言发送过于频繁，请稍后再试", false);
        }
        // 上传限流
        if (isPost && path.startsWith("/api/v1/upload")) {
            return new RateLimitRule("upload", 50, WINDOW_15_MIN, "请求过于频繁，请稍后再试", false);
        }
        // 前端错误上报限流（访客免登录，10 分钟窗口，防止刷库）
        if (isPost && path.equals("/api/v1/error-log")) {
            return new RateLimitRule("errorReport", 20, WINDOW_10_MIN, "请求过于频繁，请稍后再试", false);
        }
        // 全局限流（所有 /api/v1/* 请求）
        return new RateLimitRule("global", 1200, WINDOW_15_MIN, "请求过于频繁，请稍后再试", false);
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }
        return request.getRemoteAddr();
    }

    // ── 内部类 ──

    private static class RateLimitRule {
        final String name;
        final int maxRequests;
        /** 计数窗口（毫秒）—— 不同档位窗口不同（错误上报是 10 分钟） */
        final int windowMs;
        final String message;
        final boolean skipOnSuccess;

        RateLimitRule(String name, int maxRequests, int windowMs, String message, boolean skipOnSuccess) {
            this.name = name;
            this.maxRequests = maxRequests;
            this.windowMs = windowMs;
            this.message = message;
            this.skipOnSuccess = skipOnSuccess;
        }
    }

    private static class WindowCounter {
        private final long windowMs;
        private volatile long windowStart;
        private volatile int count;

        WindowCounter(long windowMs) {
            this.windowMs = windowMs;
            this.windowStart = System.currentTimeMillis();
            this.count = 0;
        }

        synchronized void cleanIfExpired() {
            long now = System.currentTimeMillis();
            if (now - windowStart > windowMs) {
                windowStart = now;
                count = 0;
            }
        }

        synchronized boolean isExceeded(int max) {
            return count >= max;
        }

        synchronized void increment() {
            count++;
        }

        synchronized void decrement() {
            if (count > 0) count--;
        }

        synchronized int getCount() {
            return count;
        }
    }
}
