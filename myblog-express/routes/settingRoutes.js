const express = require("express");
const router = express.Router();
const settingController = require("../controllers/settingController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const cache = require("../middleware/cache");
const uploadConfig = require("../config/upload");

// 获取所有配置（公开）— 缓存 5 分钟
router.get("/", cache("settings", 300), settingController.getSettings);

// 获取单个配置（公开）— 缓存 5 分钟
router.get("/:key", cache("settings", 300), settingController.getSettingByKey);

// 更新配置（需认证 + 管理员权限）— 写操作自动清除缓存
router.put(
  "/",
  auth,
  requireRole("admin"),
  uploadConfig.any(),
  settingController.updateSettings,
);

// 新增单个自定义配置
router.post(
  "/",
  auth,
  requireRole("admin"),
  settingController.createSetting,
);

// 更新单个自定义配置
router.put(
  "/:key",
  auth,
  requireRole("admin"),
  settingController.updateSettingByKey,
);

// 删除单个自定义配置
router.delete(
  "/:key",
  auth,
  requireRole("admin"),
  settingController.deleteSetting,
);

module.exports = router;
