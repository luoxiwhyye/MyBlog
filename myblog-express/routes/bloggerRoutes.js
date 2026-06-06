const express = require("express");
const router = express.Router();
const bloggerController = require("../controllers/bloggerController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const uploadConfig = require("../config/upload");

// 登录（公开）
router.post("/login", bloggerController.login);

// 获取博主公开信息（无需认证，供前台页面使用）
router.get("/public-profile", bloggerController.getPublicProfile);

// 获取博主信息（需认证）
router.get(
  "/profile",
  auth,
  requireRole("admin"),
  bloggerController.getProfile,
);

// 更新博主信息（需认证）
router.put(
  "/profile",
  auth,
  requireRole("admin"),
  uploadConfig.single("avatar"),
  bloggerController.updateProfile,
);

// 修改密码（需认证）
router.put(
  "/password",
  auth,
  requireRole("admin"),
  bloggerController.changePassword,
);

module.exports = router;
