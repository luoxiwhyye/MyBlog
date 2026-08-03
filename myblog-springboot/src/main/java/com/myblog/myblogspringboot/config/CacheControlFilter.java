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
            httpResponse.setHeader("Cache-Control",
                    String.format("public, max-age=%d, stale-while-revalidate=%d", MAX_AGE, STALE_REVALIDATE));
        }
    }
}
