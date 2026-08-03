// ============================================
// routes/cacheRoutes.js - 缓存管理（仅管理员）
// GET  /api/v1/cache/stats   查看缓存统计（命中率/键数量）
// POST /api/v1/cache/clear   清空全部缓存
// POST /api/v1/cache/preheat 手动触发预热
// ============================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const cache = require("../middleware/cache");
const { success } = require("../utils/response");

router.use(auth, requireRole("admin"));

/**
 * 缓存统计
 */
router.get("/stats", async (req, res, next) => {
  try {
    const stats = await cache.getStats();
    success(res, stats);
  } catch (err) {
    next(err);
  }
});

/**
 * 清空全部缓存
 */
router.post("/clear", async (req, res, next) => {
  try {
    const cleared = await cache.clearAll();
    success(res, { cleared }, `已清除 ${cleared} 条缓存`);
  } catch (err) {
    next(err);
  }
});

/**
 * 手动预热
 */
router.post("/preheat", async (req, res, next) => {
  try {
    const prefixes = Array.isArray(req.body?.prefixes)
      ? req.body.prefixes
      : ["settings", "types", "labels"];
    // 预热异步执行，立即返回
    cache.preheat({ prefixes });
    success(res, { prefixes }, "预热任务已启动");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
