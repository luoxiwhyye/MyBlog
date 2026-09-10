package com.myblog.myblogspringboot.config;

import java.io.IOException;

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
 * 对标 Express middleware/cache.js 的 stale-while-revalidate 策略：
 *   - 所有 GET /api/v1/* 响应设置 Cache-Control 头
 *   - max-age=300（浏览器缓存 5 分钟）
 *   - stale-while-revalidate=600（过期后仍可返回旧数据，同时后台异步刷新）
 *
 * ⚠️ 带鉴权（Authorization）的请求必须禁用浏览器缓存。
 *   这是「后台写入成功后列表仍显示旧数据」的根因：服务端缓存会在写操作时清除，
 *   但浏览器层的 max-age 缓存不会因此失效，同一 URL 会直接命中本地缓存。
 *   带 Authorization 的请求本身就代表「个性化 + 需要实时」，按 HTTP 语义也不应
 *   被缓存。注意：这里只改响应头，服务端缓存行为完全不变。
 */
@Component
@Order(1)
public class CacheControlFilter implements Filter {

    private static final int MAX_AGE = 300;         // 5 分钟
    private static final int STALE_REVALIDATE = 600; // 10 分钟

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        chain.doFilter(request, response);

        // 仅对 GET 请求的 API 响应添加 Cache-Control 头
        if ("GET".equalsIgnoreCase(httpRequest.getMethod())
                && httpRequest.getRequestURI().startsWith("/api/v1/")
                && httpResponse.getStatus() >= 200
                && httpResponse.getStatus() < 300) {
            if (httpRequest.getHeader("Authorization") != null) {
                // 带鉴权：禁止浏览器缓存，保证后台写入后立即可见
                httpResponse.setHeader("Cache-Control", "private, no-store");
                return;
            }
            httpResponse.setHeader("Cache-Control",
                    String.format("public, max-age=%d, stale-while-revalidate=%d", MAX_AGE, STALE_REVALIDATE));
        }
    }
}
