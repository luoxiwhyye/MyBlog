package com.myblog.myblogspringboot.config;

import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheInterceptor;

import com.myblog.myblogspringboot.service.CacheStatsService;

/**
 * 带命中统计的缓存拦截器。
 *
 * 通过覆写 doGet 统计每次缓存访问的命中/未命中，
 * 数据由 {@link CacheStatsService} 进程内原子计数，
 * 经 /api/v1/cache/stats 暴露给管理后台。
 */
public class CountingCacheInterceptor extends CacheInterceptor {

    private final CacheStatsService statsService;

    public CountingCacheInterceptor(CacheStatsService statsService) {
        this.statsService = statsService;
    }

    @Override
    protected Cache.ValueWrapper doGet(Cache cache, Object key) {
        Cache.ValueWrapper wrapper = super.doGet(cache, key);
        if (wrapper != null) {
            statsService.recordHit();
        } else {
            statsService.recordMiss();
        }
        return wrapper;
    }
}
