package com.myblog.myblogspringboot.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

/**
 * 缓存配置 — Redis 优先，不可用时降级为内存缓存。
 *
 * 与 Express 端 cache.js 行为一致：
 *   - Redis 可用 → 使用 RedisCacheManager（TTL 300s）
 *   - Redis 不可用 → 使用 ConcurrentMapCacheManager（进程内）
 */
@Configuration
@EnableCaching
public class CacheConfig {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);

    @Bean
    @Primary
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory) {
        try {
            // 探测 Redis 连接是否真的可用
            redisConnectionFactory.getConnection().ping();

            RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofSeconds(300))
                    .disableCachingNullValues()
                    .serializeKeysWith(
                            RedisSerializationContext.SerializationPair
                                    .fromSerializer(new StringRedisSerializer()))
                    .serializeValuesWith(
                            RedisSerializationContext.SerializationPair
                                    .fromSerializer(new GenericJackson2JsonRedisSerializer()));

            log.info("✅ Redis 缓存已启用（TTL 300s）");
            return RedisCacheManager.builder(redisConnectionFactory)
                    .cacheDefaults(config)
                    .build();
        } catch (Exception e) {
            log.warn("⚠️ Redis 不可用，降级为内存缓存: {}", e.getMessage());
            return new ConcurrentMapCacheManager();
        }
    }
}
