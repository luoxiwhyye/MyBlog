package com.myblog.myblogspringboot.config;

import java.io.IOException;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.myblog.myblogspringboot.service.MetricsService;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 请求级性能监控过滤器（对标 Express app.use(metricsMiddleware)）。
 *
 * ⚠️ 顺序取 {@link Ordered#HIGHEST_PRECEDENCE}：Express 的 metrics 中间件挂在最前面，
 * 只有比 Spring Security 过滤器链（默认 order = -100）更靠前，才能把被 Security
 * 拦下的 401 / 403 也计入统计。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MetricsFilter implements Filter {

    private final MetricsService metricsService;

    public MetricsFilter(MetricsService metricsService) {
        this.metricsService = metricsService;
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        long startNanos = System.nanoTime();
        try {
            chain.doFilter(request, response);
        } finally {
            HttpServletRequest httpRequest = (HttpServletRequest) request;
            HttpServletResponse httpResponse = (HttpServletResponse) response;

            String query = httpRequest.getQueryString();
            String path = query == null
                    ? httpRequest.getRequestURI()
                    : httpRequest.getRequestURI() + "?" + query;

            metricsService.record(
                    httpRequest.getMethod(),
                    path,
                    httpResponse.getStatus(),
                    (System.nanoTime() - startNanos) / 1000L);
        }
    }
}
