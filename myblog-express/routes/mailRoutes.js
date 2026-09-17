// ============================================
// routes/mailRoutes.js - 邮件通知配置（仅管理员）
// GET  /api/v1/mail/status   查看 SMTP 配置状态与收件人
// POST /api/v1/mail/test     用当前配置真实发一封测试邮件
// ============================================

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { getStatus, sendTestMail } = require("../controllers/mailController");

router.use(auth, requireRole("admin"));

router.get("/status", getStatus);
router.post("/test", sendTestMail);

module.exports = router;
