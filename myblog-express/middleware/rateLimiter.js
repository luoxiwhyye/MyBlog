/**
 * API 速率限制中间件
 *
 * 提供多层限流策略，防止暴力破解、爬虫滥用和 DDoS 攻击。
 *
 *   层 1 — 全局限流：所有 /api 请求共享一个计数器（15 分钟 1200 次）
 *   层 2 — 登录限流：/api/v1/blogger/login 严格限流（15 分钟 10 次，成功不计数）
 *   层 3 — 评论限流：/api/v1/comments POST 请求单独限流（15 分钟 30 次）
 *
 * 说明：
 *   - 全局配额在 SSR 博客场景下需兼顾"SSR 渲染 + 客户端 hydration"的双重请求，
 *     因此从 300 提升到 1200；同时配合 Express trust proxy 按真实访客 IP 计数，
 *     多访客之间互不影响，单访客 1200 次/15 分钟仍足以防御滥用。
 *
 * 返回统一格式：{ code: 429, message: "...", data: null }
 */

const rateLimit = require("express-rate-limit");

const RATE_LIMIT_MESSAGE = {
  code: 429,
  message: "请求过于频繁，请稍后再试",
  data: null,
};

/** 全局 API 限流（所有 /api 路由） */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 1200,
  standardHeaders: true, // 返回 RateLimit-* 头
  legacyHeaders: false, // 禁用 X-RateLimit-* 头
  message: RATE_LIMIT_MESSAGE,
});

/** 登录接口严格限流 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true, // 登录成功后不计数
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    message: "登录尝试过于频繁，请15分钟后再试",
    data: null,
  },
});

/** 评论提交限流 */
const commentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    message: "评论发送过于频繁，请稍后再试",
    data: null,
  },
});

/** 留言板提交限流（访客免登录，防止刷屏） */
const messageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 429,
    message: "留言发送过于频繁，请稍后再试",
    data: null,
  },
});

/** 上传限流 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
});

module.exports = {
  apiLimiter,
  loginLimiter,
  commentLimiter,
  messageLimiter,
  uploadLimiter,
};
