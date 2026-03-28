const express = require("express");
const router = express.Router();
const articleController = require("../controllers/articleController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const uploadConfig = require("../config/upload");
const {
  validatePagination,
  validateIntId,
  handleValidationErrors,
} = require("../middleware/validator");

// 获取文章列表（公开）
router.get(
  "/",
  auth.optionalAuth,
  validatePagination,
  handleValidationErrors,
  articleController.getArticles,
);

// 获取回收站列表（需认证）
router.get(
  "/trash",
  validatePagination,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  articleController.getTrashArticles,
);

// 获取文章详情（公开，但博主可看草稿）
router.get(
  "/:id",
  auth.optionalAuth,
  validateIntId,
  handleValidationErrors,
  articleController.getArticleById,
);

// 创建文章（需认证）
router.post(
  "/",
  auth,
  requireRole("admin"),
  uploadConfig.single("coverImage"),
  articleController.createArticle,
);

// 更新文章（需认证）
router.put(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  uploadConfig.single("coverImage"),
  articleController.updateArticle,
);

// 软删除文章（需认证）
router.delete(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  articleController.deleteArticle,
);

// 恢复文章（需认证）
router.put(
  "/:id/restore",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  articleController.restoreArticle,
);

module.exports = router;
