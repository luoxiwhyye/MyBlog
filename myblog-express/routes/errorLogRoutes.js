const express = require("express");
const router = express.Router();
const clientErrorLogController = require("../controllers/clientErrorLogController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const {
  validatePagination,
  handleValidationErrors,
} = require("../middleware/validator");
const { errorReportLimiter } = require("../middleware/rateLimiter");

// 接收前端错误上报（公开，限流防刷）
router.post("/", errorReportLimiter, clientErrorLogController.createErrorLog);

// 获取错误日志列表（需管理员）
router.get(
  "/",
  auth,
  requireRole("admin"),
  validatePagination,
  handleValidationErrors,
  clientErrorLogController.getErrorLogs,
);

// 清空错误日志（需管理员）
router.delete(
  "/",
  auth,
  requireRole("admin"),
  clientErrorLogController.clearErrorLogs,
);

module.exports = router;
