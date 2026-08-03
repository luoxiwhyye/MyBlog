// ============================================
// middleware/metrics.js - 性能监控
// 进程内统计：请求数、平均/最大响应时间、错误率、状态码分布
// 通过 GET /api/v1/metrics （管理员）查看
// ============================================

const metrics = {
  totalRequests: 0,
  totalErrors: 0, // 4xx/5xx
  totalResponseTimeMs: 0,
  maxResponseTimeMs: 0,
  statusCodes: {},
  startedAt: new Date(),
  recentSlow: [], // 最近慢请求（>2s）
};

const MAX_SLOW_SAMPLES = 20;

/**
 * 请求级性能监控中间件（在路由之前挂载）
 */
const metricsMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    const status = res.statusCode;

    metrics.totalRequests += 1;
    metrics.totalResponseTimeMs += elapsedMs;
    metrics.maxResponseTimeMs = Math.max(metrics.maxResponseTimeMs, elapsedMs);

    const codeKey = String(status);
    metrics.statusCodes[codeKey] = (metrics.statusCodes[codeKey] || 0) + 1;

    if (status >= 400) {
      metrics.totalErrors += 1;
    }

    if (elapsedMs > 2000) {
      metrics.recentSlow.push({
        method: req.method,
        path: req.originalUrl,
        ms: Math.round(elapsedMs),
        status,
        at: new Date().toISOString(),
      });
      if (metrics.recentSlow.length > MAX_SLOW_SAMPLES) {
        metrics.recentSlow.shift();
      }
    }
  });

  next();
};

/**
 * 汇总监控指标
 */
metrics.getSnapshot = () => {
  const total = metrics.totalRequests;
  return {
    totalRequests: total,
    avgResponseTimeMs:
      total > 0 ? Math.round(metrics.totalResponseTimeMs / total) : 0,
    maxResponseTimeMs: Math.round(metrics.maxResponseTimeMs),
    errorRate:
      total > 0 ? Number(((metrics.totalErrors / total) * 100).toFixed(2)) : 0,
    statusCodes: metrics.statusCodes,
    recentSlow: [...metrics.recentSlow].reverse(),
    startedAt: metrics.startedAt,
  };
};

module.exports = metricsMiddleware;
module.exports.metrics = metrics;
