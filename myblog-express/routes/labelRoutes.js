const express = require("express");
const router = express.Router();
const labelController = require("../controllers/labelController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const {
  validatePagination,
  validateIntId,
  handleValidationErrors,
} = require("../middleware/validator");

// 获取标签列表（公开）
router.get(
  "/",
  validatePagination,
  handleValidationErrors,
  labelController.getLabels,
);

// 创建标签（需认证 + 管理员权限）
router.post("/", auth, requireRole("admin"), labelController.createLabel);

// 更新标签（需认证 + 管理员权限）
router.put(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  labelController.updateLabel,
);

// 删除标签（需认证 + 管理员权限）
router.delete(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  labelController.deleteLabel,
);

module.exports = router;
