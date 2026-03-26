const express = require("express");
const router = express.Router();
const settingController = require("../controllers/settingController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const uploadConfig = require("../config/upload");

// 获取所有配置（公开）
router.get("/", settingController.getSettings);

// 获取单个配置（公开）
router.get("/:key", settingController.getSettingByKey);

// 更新配置（需认证 + 管理员权限）
router.put(
  "/",
  auth,
  requireRole("admin"),
  uploadConfig.any(),
  settingController.updateSettings,
);

module.exports = router;
