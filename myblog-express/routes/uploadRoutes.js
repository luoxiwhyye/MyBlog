const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/uploadController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { uploadLimiter } = require("../middleware/rateLimiter");
const uploadConfig = require("../config/upload");

// 上传图片（需认证）— 限流：15 分钟 50 次
router.post(
  "/image",
  uploadLimiter,
  auth,
  requireRole("admin"),
  uploadConfig.single("image"),
  uploadController.uploadImage,
);

module.exports = router;
