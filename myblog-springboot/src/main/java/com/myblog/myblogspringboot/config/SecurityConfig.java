package com.myblog.myblogspringboot.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;

import com.myblog.myblogspringboot.security.JwtAuthenticationFilter;
import com.myblog.myblogspringboot.security.JwtTokenProvider;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;

    public SecurityConfig(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // ── 安全头（等价于 Express helmet）──
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; " +
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                        "img-src 'self' data: https: http:; " +
                        "font-src 'self' https://fonts.gstatic.com; " +
                        "connect-src 'self'; " +
                        "media-src 'self'; " +
                        "object-src 'none'; " +
                        "frame-ancestors 'self'; " +
                        "form-action 'self'; " +
                        "upgrade-insecure-requests"
                    )
                )
                .xssProtection(xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK))
                .frameOptions(frame -> frame.sameOrigin())
            )
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // CORS 预检请求放行
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // 公开接口
                .requestMatchers(HttpMethod.GET, "/health").permitAll()
                // Actuator 健康检查与 Prometheus 指标（供探针与监控采集）
                .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/actuator/prometheus").permitAll()
                .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/types/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/labels/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/articles/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/comments/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/settings/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/blogger/public-profile").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/blogger/login").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/comments").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/comments/*/like").permitAll()
                // 需要管理员权限
                .requestMatchers("/api/v1/dashboard/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/cache/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/articles/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/articles/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/articles/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/types/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/types/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/types/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/labels/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/labels/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/labels/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/settings/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/v1/upload/**").hasRole("ADMIN")
                .requestMatchers("/api/v1/blogger/profile").hasRole("ADMIN")
                .requestMatchers("/api/v1/blogger/password").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/comments/*/status").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/v1/comments/*/restore").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/v1/comments/*/hard").hasRole("ADMIN")
                // 评论删除：登录用户可删自己的
                .requestMatchers(HttpMethod.DELETE, "/api/v1/comments/*").authenticated()
                // 其他需要认证
                .anyRequest().authenticated()
            )
            // ── 过滤器链：JWT 认证 → 业务处理 ──
            // 注：速率限制由 config/RateLimitFilter（@Component）以全局 Filter 提供，
            // 避免与 Security 链中的过滤器重复计数。
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                    UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
