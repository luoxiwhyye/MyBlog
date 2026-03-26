const express = require("express");
const router = express.Router();
const typeController = require("../controllers/typeController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const {
  validatePagination,
  validateIntId,
  handleValidationErrors,
} = require("../middleware/validator");

// 获取分类列表（公开）
router.get(
  "/",
  validatePagination,
  handleValidationErrors,
  typeController.getTypes,
);

// 创建分类（需认证 + 管理员权限）
router.post("/", auth, requireRole("admin"), typeController.createType);

// 更新分类（需认证 + 管理员权限）
router.put(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  typeController.updateType,
);

// 删除分类（需认证 + 管理员权限）
router.delete(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  typeController.deleteType,
);

module.exports = router;
