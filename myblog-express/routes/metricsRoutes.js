// ============================================
// routes/metricsRoutes.js - 性能监控（仅管理员）
// GET /api/v1/metrics  查看响应时间/错误率/慢请求
// ============================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { metrics } = require("../middleware/metrics");
const { success } = require("../utils/response");

router.get("/", auth, requireRole("admin"), (req, res) => {
  success(res, metrics.getSnapshot());
});

module.exports = router;
