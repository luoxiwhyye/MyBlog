const express = require("express");
const router = express.Router();
const emojiController = require("../controllers/emojiController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const {
  validatePagination,
  validateIntId,
  handleValidationErrors,
} = require("../middleware/validator");

// 公开：获取全部启用表情（前台动态拉取）
router.get("/enabled", emojiController.getEnabledEmojis);

// 公开：按分组返回启用表情（前台表情面板）
router.get("/grouped", emojiController.getGroupedEmojis);

// 获取表情列表（公开只返回启用；管理端可看全部）
router.get(
  "/",
  auth.optionalAuth,
  validatePagination,
  handleValidationErrors,
  emojiController.getEmojis,
);

// 新增表情（需认证 + 管理员权限）
router.post("/", auth, requireRole("admin"), emojiController.createEmoji);

// 更新表情（需认证 + 管理员权限）
router.put(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  emojiController.updateEmoji,
);

// 删除表情（需认证 + 管理员权限）
router.delete(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  emojiController.deleteEmoji,
);

module.exports = router;
