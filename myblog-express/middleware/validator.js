const { query, param, validationResult } = require("express-validator");
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
  handleValidationErrors,
};
