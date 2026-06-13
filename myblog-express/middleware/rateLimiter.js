/**
 * API 速率限制中间件
 *
 * 提供多层限流策略，防止暴力破解、爬虫滥用和 DDoS 攻击。
 *
 *   层 1 — 全局限流：所有 /api 请求共享一个计数器（默认 15 分钟 300 次）
 *   层 2 — 登录限流：/api/v1/blogger/login 严格限流（15 分钟 10 次，成功不计数）
 *   层 3 — 评论限流：/api/v1/comments POST 请求单独限流（15 分钟 30 次）
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
  max: 300,
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

/** 上传限流 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: RATE_LIMIT_MESSAGE,
});

module.exports = { apiLimiter, loginLimiter, commentLimiter, uploadLimiter };
