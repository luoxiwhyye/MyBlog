const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const {
  validatePagination,
  validateIntId,
  validateComment,
  handleValidationErrors,
} = require("../middleware/validator");

// 获取评论列表（公开，但博主可见所有状态）
router.get(
  "/",
  auth.optionalAuth,
  validatePagination,
  handleValidationErrors,
  commentController.getComments,
);

// 发布评论（公开，但需要基本信息）
router.post(
  "/",
  validateComment,
  handleValidationErrors,
  commentController.createComment,
);

// 删除评论（需认证）
router.delete(
  "/:id",
  auth,
  validateIntId,
  handleValidationErrors,
  commentController.deleteComment,
);

// 恢复评论（需认证 + 管理员权限）
router.put(
  "/:id/restore",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  commentController.restoreComment,
);

// 彻底删除评论（需认证 + 管理员权限）
router.delete(
  "/:id/hard",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  commentController.hardDeleteComment,
);

// 更新评论状态（需认证 + 管理员权限）
router.put(
  "/:id/status",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  commentController.updateCommentStatus,
);

// 点赞评论（公开）
router.post(
  "/:id/like",
  validateIntId,
  handleValidationErrors,
  commentController.likeComment,
);

module.exports = router;
