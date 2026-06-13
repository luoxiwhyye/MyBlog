package com.myblog.myblogspringboot.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final Logger log = LoggerFactory.getLogger(WebConfig.class);

    @Value("${app.frontend-origin:http://localhost:3001}")
    private String frontendOrigin;

    @Value("${app.admin-origin:http://localhost:5173}")
    private String adminOrigin;

    @Value("${app.upload.path:uploads}")
    private String uploadPath;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // ── 生产环境安全提醒 ──
        if (frontendOrigin.contains("localhost") || adminOrigin.contains("localhost")) {
            log.warn("⚠️  CORS 白名单包含 localhost，生产环境请通过 FRONTEND_ORIGIN / ADMIN_ORIGIN 环境变量配置真实域名");
        }

        registry.addMapping("/**")
                .allowedOrigins(frontendOrigin, adminOrigin)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadDir = Paths.get(uploadPath).toAbsolutePath().normalize();
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir.toString().replace("\\", "/") + "/");
    }
}
