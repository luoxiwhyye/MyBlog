const express = require("express");
const router = express.Router();
const bloggerController = require("../controllers/bloggerController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { loginLimiter } = require("../middleware/rateLimiter");
const uploadConfig = require("../config/upload");

// 登录（公开）— 严格限流：15 分钟 10 次
router.post("/login", loginLimiter, bloggerController.login);

// 获取博主公开信息（无需认证，供前台页面使用）
router.get("/public-profile", bloggerController.getPublicProfile);

// 检测是否已初始化账号（公开，供登录页判断是否显示初始化表单）
router.get("/exists", bloggerController.exists);

// 初始化管理员账号（公开，仅当尚无账号时允许；已有则拒绝）
router.post("/init", bloggerController.init);

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

// 重置账户（需认证，admin）— 清空全部业务数据并重建管理员
router.post("/reset", auth, requireRole("admin"), bloggerController.reset);

module.exports = router;
