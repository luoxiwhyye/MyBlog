package com.myblog.myblogspringboot.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long expirationMs;

    public JwtTokenProvider(@Value("${app.jwt.secret}") String secret,
                            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateToken(UserPrincipal userPrincipal) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(userPrincipal.getId().toString())
                // ⚠️ 同时写 `id` 声明：Express 的 token 把 userId 放在 `id`（没有 sub），
                //    两端共用同一个 JWT_SECRET，写上它才能让本端签发的 token 在 Express 侧也能用。
                .claim("id", userPrincipal.getId())
                .claim("username", userPrincipal.getUsername())
                .claim("nickname", userPrincipal.getNickname())
                .claim("role", userPrincipal.getRole())
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public UserPrincipal parseToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return new UserPrincipal(
                resolveUserId(claims),
                claims.get("username", String.class),
                claims.get("nickname", String.class),
                claims.get("role", String.class)
        );
    }

    /**
     * 取 userId：优先读 `id` 声明、回退 `sub`。
     *
     * <p>⚠️ 两端的 token 形状不同：Express 的 payload 是 `{id, username, nickname, role}`
     * （**没有 `sub`**），本端历史实现是 `sub` + 同名声明。`JWT_SECRET` 两端共用一个，
     * 只认自己那一种会让「另一端签发的 token」在本端变成 403（不是 401，容易看成权限问题）。
     * 本端现在两种都签发（见 generateToken），也两种都认。
     */
    private static Integer resolveUserId(Claims claims) {
        Object rawId = claims.get("id");
        if (rawId instanceof Number n) return n.intValue();
        if (rawId != null) {
            try {
                return Integer.valueOf(String.valueOf(rawId).trim());
            } catch (NumberFormatException ignored) {
                // 落到下面的 sub
            }
        }
        return Integer.parseInt(claims.getSubject());
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
