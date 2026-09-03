const express = require("express");
const router = express.Router();
const messageBoardController = require("../controllers/messageBoardController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { messageLimiter } = require("../middleware/rateLimiter");
const {
  validatePagination,
  validateIntId,
  validateMessage,
  handleValidationErrors,
} = require("../middleware/validator");

// 获取留言列表（公开，但博主可见所有状态）
router.get(
  "/",
  auth.optionalAuth,
  validatePagination,
  handleValidationErrors,
  messageBoardController.getMessages,
);

// 发布留言（公开，访客免登录）— 限流：15 分钟 20 次
router.post(
  "/",
  messageLimiter,
  validateMessage,
  handleValidationErrors,
  messageBoardController.createMessage,
);

// 更新留言状态（需认证 + 管理员权限）
router.put(
  "/:id/status",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  messageBoardController.updateMessageStatus,
);

// 恢复留言（需认证 + 管理员权限）
router.put(
  "/:id/restore",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  messageBoardController.restoreMessage,
);

// 软删除留言（需认证 + 管理员权限）
router.delete(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  messageBoardController.deleteMessage,
);

// 彻底删除留言（需认证 + 管理员权限）
router.delete(
  "/:id/hard",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  messageBoardController.hardDeleteMessage,
);

module.exports = router;
