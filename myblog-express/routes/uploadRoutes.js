const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/uploadController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const uploadConfig = require("../config/upload");

// 上传图片（需认证）
router.post(
  "/image",
  auth,
  requireRole("admin"),
  uploadConfig.single("image"),
  uploadController.uploadImage,
);

module.exports = router;
