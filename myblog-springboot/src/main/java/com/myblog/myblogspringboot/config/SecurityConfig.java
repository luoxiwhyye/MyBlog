package com.myblog.myblogspringboot.config;

import com.myblog.myblogspringboot.security.JwtAuthenticationFilter;
import com.myblog.myblogspringboot.security.JwtTokenProvider;
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
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // CORS 预检请求放行
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // 公开接口
                .requestMatchers(HttpMethod.GET, "/health").permitAll()
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
            .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                    UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
