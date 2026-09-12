const express = require("express");
const router = express.Router();
const searchController = require("../controllers/searchController");

// 关键词搜索（公开，供前台命令面板 / 全局搜索入口使用）
router.get("/", searchController.searchArticles);

module.exports = router;
