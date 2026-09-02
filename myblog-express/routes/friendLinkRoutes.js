const express = require("express");
const router = express.Router();
const friendLinkController = require("../controllers/friendLinkController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const cache = require("../middleware/cache");
const {
  validatePagination,
  validateIntId,
  handleValidationErrors,
} = require("../middleware/validator");

// 获取友链列表（公开仅启用；管理端带 token 看全部）
// auth.optionalAuth 放前：让 cache 能按 req.user.role 区分缓存 key，避免公开/管理员共享缓存
router.get(
  "/",
  auth.optionalAuth,
  cache("friend-links", 600, true),
  validatePagination,
  handleValidationErrors,
  friendLinkController.getFriendLinks,
);

// 获取友链详情（公开）
router.get(
  "/:id",
  validateIntId,
  handleValidationErrors,
  friendLinkController.getFriendLinkById,
);

// 记录点击次数（公开，无需登录）
router.post(
  "/:id/click",
  validateIntId,
  handleValidationErrors,
  friendLinkController.incrementClickCount,
);

// 创建友链（需认证 + 管理员权限）
router.post(
  "/",
  auth,
  requireRole("admin"),
  friendLinkController.createFriendLink,
);

// 更新友链（需认证 + 管理员权限）
router.put(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  friendLinkController.updateFriendLink,
);

// 删除友链（需认证 + 管理员权限）
router.delete(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  friendLinkController.deleteFriendLink,
);

module.exports = router;
