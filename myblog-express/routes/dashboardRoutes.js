const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

// 未读提醒统计（评论/留言待审核数）— 供后台侧边栏红点高频轮询（仅两个 COUNT，轻量）
router.get(
  "/unread-counts",
  auth,
  requireRole("admin"),
  dashboardController.getUnreadCounts,
);

// 仪表盘统计（需管理员）
router.get("/stats", auth, requireRole("admin"), dashboardController.getStats);
router.get(
  "/charts",
  auth,
  requireRole("admin"),
  dashboardController.getCharts,
);

module.exports = router;
