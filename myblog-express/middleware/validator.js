/**
 * 请求参数校验中间件
 *
 * 使用 express-validator v7.3.x 链式 API：
 *   - query() / param() / body() 选择数据来源
 *   - isInt / isLength / isEmail / matches 等校验链
 *   - optional({ values: "falsy" }) 表示字段可选（空字符串、null、undefined 均跳过校验）
 *   - validationResult(req) 收集所有错误
 *
 * 已审计确认与 v7 API 完全兼容（2026-06-07）。
 */

const { query, param, body, validationResult } = require("express-validator");
const { error } = require("../utils/response");

// 验证分页参数
const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page 必须是大于0的整数"),
  query("pageSize")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("pageSize 必须是1-100之间的整数"),
];

// 验证ID参数
const validateIntId = [
  param("id").isInt({ min: 1 }).withMessage("id 必须是正整数"),
];

// URL 格式校验正则
const urlPattern =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

// 验证评论提交
const validateComment = [
  body("articleId").isInt({ min: 1 }).withMessage("articleId 必须是正整数"),
  body("authorName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("昵称长度应在2-50字符之间"),
  body("authorEmail").trim().isEmail().withMessage("邮箱格式不正确"),
  body("authorUrl")
    .optional({ values: "falsy" })
    .trim()
    .matches(urlPattern)
    .withMessage("网址格式不正确"),
  body("content")
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage("评论内容长度应在1-1000字符之间"),
  body("parentId")
    .optional({ values: "falsy" })
    .isInt({ min: 1 })
    .withMessage("parentId 必须是正整数"),
];

// 验证结果中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, errors.array()[0].msg, 400);
  }
  next();
};

module.exports = {
  validatePagination,
  validateIntId,
  validateComment,
  handleValidationErrors,
};
