const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

// 仪表盘统计（需管理员）
router.get("/stats", auth, requireRole("admin"), dashboardController.getStats);

module.exports = router;
