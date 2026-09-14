package com.myblog.myblogspringboot.config;

import java.time.Duration;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import com.myblog.myblogspringboot.service.CacheStatsService;

/**
 * 缓存配置 — Redis 优先，不可用时降级为内存缓存。
 *
 * 与 Express 端 cache.js 行为一致：
 *   - Redis 可用 → 使用 RedisCacheManager（TTL 300s）
 *   - Redis 不可用 → 使用 ConcurrentMapCacheManager（进程内）
 *
 * 命中/未命中统计由本类的 CountingCacheManager 装饰 Cache 完成，
 * 不再自定义 CacheInterceptor / advisor —— @EnableCaching 引入的
 * ProxyCachingConfiguration 已占用 `cacheInterceptor` 这个 Bean 名，
 * 自定义同名 Bean 会让 Boot（默认禁覆盖）启动即失败。
 */
@Configuration
@EnableCaching
public class CacheConfig {

    private static final Logger log = LoggerFactory.getLogger(CacheConfig.class);

    @Bean
    @Primary
    public CacheManager cacheManager(RedisConnectionFactory redisConnectionFactory,
                                     ObjectProvider<CacheStatsService> statsProvider) {
        CacheManager delegate;
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
                                    .fromSerializer(cacheValueSerializer()));

            log.info("✅ Redis 缓存已启用（TTL 300s）");
            delegate = RedisCacheManager.builder(redisConnectionFactory)
                    .cacheDefaults(config)
                    .build();
        } catch (Exception e) {
            log.warn("⚠️ Redis 不可用，降级为内存缓存: {}", e.getMessage());
            delegate = new ConcurrentMapCacheManager();
        }
        return new CountingCacheManager(delegate, statsProvider);
    }

    /**
     * 缓存值序列化器：Jackson 3（java.time 内置支持 + 默认类型信息用于多态反序列化）。
     *
     * 此前用的 GenericJackson2JsonRedisSerializer 走的是 jjwt 带进来的 Jackson 2，
     * 且没有 jackson-datatype-jsr310 → 写 Redis 时 LocalDateTime 直接序列化失败，
     * 使走缓存的 GET /articles 返回 500。
     */
    private static RedisSerializer<Object> cacheValueSerializer() {
        return GenericJacksonJsonRedisSerializer.create(
                builder -> builder.enableUnsafeDefaultTyping());
    }

    /**
     * 装饰 CacheManager：把每次 Cache.get() 的命中/未命中上报给 CacheStatsService，
     * 其余操作原样转发（不影响外层 RedisCacheManager / ConcurrentMapCacheManager 的语义）。
     */
    static class CountingCacheManager implements CacheManager {

        private final CacheManager delegate;
        private final ObjectProvider<CacheStatsService> statsProvider;
        private final Map<String, Cache> wrappers = new ConcurrentHashMap<>();

        CountingCacheManager(CacheManager delegate, ObjectProvider<CacheStatsService> statsProvider) {
            this.delegate = delegate;
            this.statsProvider = statsProvider;
        }

        @Override
        public Cache getCache(String name) {
            Cache cache = delegate.getCache(name);
            return cache == null ? null : wrappers.computeIfAbsent(name, key -> new CountingCache(cache, statsProvider));
        }

        @Override
        public Collection<String> getCacheNames() {
            return delegate.getCacheNames();
        }
    }

    /**
     * Cache 装饰器（只接管 get()，用于命中统计）
     */
    static class CountingCache implements Cache {

        private final Cache delegate;
        private final ObjectProvider<CacheStatsService> statsProvider;

        CountingCache(Cache delegate, ObjectProvider<CacheStatsService> statsProvider) {
            this.delegate = delegate;
            this.statsProvider = statsProvider;
        }

        @Override
        public String getName() {
            return delegate.getName();
        }

        @Override
        public Object getNativeCache() {
            return delegate.getNativeCache();
        }

        @Override
        public ValueWrapper get(Object key) {
            ValueWrapper wrapper = delegate.get(key);
            CacheStatsService stats = statsProvider.getObject();
            if (wrapper != null) {
                stats.recordHit();
            } else {
                stats.recordMiss();
            }
            return wrapper;
        }

        @Override
        public <T> T get(Object key, Class<T> type) {
            return delegate.get(key, type);
        }

        @Override
        public <T> T get(Object key, Callable<T> valueLoader) {
            return delegate.get(key, valueLoader);
        }

        @Override
        public void put(Object key, Object value) {
            delegate.put(key, value);
        }

        @Override
        public ValueWrapper putIfAbsent(Object key, Object value) {
            return delegate.putIfAbsent(key, value);
        }

        @Override
        public void evict(Object key) {
            delegate.evict(key);
        }

        @Override
        public boolean evictIfPresent(Object key) {
            return delegate.evictIfPresent(key);
        }

        @Override
        public void clear() {
            delegate.clear();
        }

        @Override
        public boolean invalidate() {
            return delegate.invalidate();
        }
    }
}
