const express = require("express");
const router = express.Router();
const emojiGroupController = require("../controllers/emojiGroupController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const {
  validateIntId,
  handleValidationErrors,
} = require("../middleware/validator");

// 分组管理全部需认证 + 管理员权限
router.get("/", auth, requireRole("admin"), emojiGroupController.getGroups);
router.post("/", auth, requireRole("admin"), emojiGroupController.createGroup);
router.put(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  emojiGroupController.updateGroup,
);
router.delete(
  "/:id",
  validateIntId,
  handleValidationErrors,
  auth,
  requireRole("admin"),
  emojiGroupController.deleteGroup,
);

module.exports = router;
