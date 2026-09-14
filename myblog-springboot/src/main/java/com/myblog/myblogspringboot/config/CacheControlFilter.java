package com.myblog.myblogspringboot.config;

import java.io.IOException;
import java.util.List;

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
 * Cache-Control HTTP 响应头过滤器。
 *
 * 对标 Express middleware/cache.js：**只有挂了 cache(prefix, ttl) 的接口才下发
 * Cache-Control**，其余 GET 接口不下发（此前本类对所有 GET /api/v1/* 无差别下发，
 * 与 Express 不一致）。
 *
 * 分档（与 Express 的 cache 调用一一对应）：
 *   - GET /api/v1/settings、/api/v1/settings/:key  → public, max-age=300, stale-while-revalidate=600
 *   - GET /api/v1/types / labels / friend-links    → public, max-age=600, stale-while-revalidate=1200
 *
 * ⚠️ 带鉴权（Authorization）的请求必须禁用浏览器缓存。
 *   这是「后台写入成功后列表仍显示旧数据」的根因：服务端缓存会在写操作时清除，
 *   但浏览器层的 max-age 缓存不会因此失效，同一 URL 会直接命中本地缓存。
 *   带 Authorization 的请求本身就代表「个性化 + 需要实时」，按 HTTP 语义也不应
 *   被缓存。注意：这里只改响应头，服务端缓存行为完全不变。
 *
 * ⚠️ 还需要 SecurityConfig 里 `headers.cacheControl().disable()`：否则 Spring Security
 *   的默认 CacheControlHeadersWriter（order = -100，在本过滤器上游）会在链路返回后
 *   覆写成 `no-cache, no-store, max-age=0, must-revalidate`，让本类形同虚设。
 *
 * ⚠️ 必须在 `chain.doFilter` **之前**写头：响应一旦提交，之后的 setHeader 会被静默忽略
 *   （2026-09-14 实测：原先写在 chain 之后 → 所有接口的 Cache-Control 都是 null）。
 *   Express 的 setCacheHeaders 也是在 handler 之前调用，两端语义一致。
 */
@Component
@Order(1)
public class CacheControlFilter implements Filter {

    /** 每一条对应 Express 里的一个 cache(prefix, ttl[, byUser]) 调用 */
    private record CacheRule(String path, int ttlSeconds, boolean matchSubPath) {}

    private static final List<CacheRule> RULES = List.of(
            // cache("settings", 300)：GET / 与 GET /:key 都缓存
            new CacheRule("/api/v1/settings", 300, true),
            // cache("types", 600) / cache("labels", 600) / cache("friend-links", 600) 只挂 GET /
            new CacheRule("/api/v1/types", 600, false),
            new CacheRule("/api/v1/labels", 600, false),
            new CacheRule("/api/v1/friend-links", 600, false)
    );

    /** 未命中任何缓存规则 */
    private static final int NOT_CACHED = -1;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        applyCacheHeaders(httpRequest, httpResponse);

        chain.doFilter(request, response);
    }

    private void applyCacheHeaders(HttpServletRequest request, HttpServletResponse response) {
        if (!"GET".equalsIgnoreCase(request.getMethod())) {
            return;
        }

        int ttl = resolveTtl(request.getRequestURI());
        if (ttl == NOT_CACHED) {
            // 与 Express 一致：未挂 cache 中间件的接口不下发 Cache-Control
            return;
        }

        if (request.getHeader("Authorization") != null) {
            // 带鉴权：禁止浏览器缓存，保证后台写入后立即可见
            response.setHeader("Cache-Control", "private, no-store");
            return;
        }

        // stale-while-revalidate: max(ttl * 2, 600)，与 Express setCacheHeaders 一致
        int stale = Math.max(ttl * 2, 600);
        response.setHeader("Cache-Control",
                String.format("public, max-age=%d, stale-while-revalidate=%d", ttl, stale));
    }

    private int resolveTtl(String uri) {
        String path = uri.length() > 1 && uri.endsWith("/")
                ? uri.substring(0, uri.length() - 1)
                : uri;
        for (CacheRule rule : RULES) {
            if (path.equals(rule.path())) {
                return rule.ttlSeconds();
            }
            if (rule.matchSubPath() && path.startsWith(rule.path() + "/")) {
                return rule.ttlSeconds();
            }
        }
        return NOT_CACHED;
    }
}
