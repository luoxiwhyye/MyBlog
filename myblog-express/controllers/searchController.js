const articleModel = require("../models/Article");
const meilisearch = require("../services/meilisearch");
const { success } = require("../utils/response");

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;
const MAX_KEYWORD_LENGTH = 100;

/**
 * 轻量关键词搜索（前台命令面板使用）
 *
 * 返回结构：
 *   { keyword, engine, total, list: [{ id, title, summary, coverImage, createdAt, typeName }] }
 *
 * engine 取值：
 *   "meilisearch" — 走全文检索引擎（命中标题 / 摘要 / 正文）
 *   "like"        — 引擎不可用，降级为 MySQL 模糊匹配
 *   "none"        — 未提供关键词
 *
 * 复用 `services/meilisearch.js` 的 search()：它内部已在引擎不可用时返回 null，
 * 因此这里只需按返回值分支，不会把「引擎挂了」暴露成错误。
 */
const searchArticles = async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword || "")
      .trim()
      .slice(0, MAX_KEYWORD_LENGTH);

    if (!keyword) {
      return success(res, { keyword: "", engine: "none", total: 0, list: [] });
    }

    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );

    const meiliResult = await meilisearch.search(keyword, {
      page: 1,
      pageSize: limit,
    });

    if (meiliResult) {
      const list = await articleModel.getArticleBriefByIds(meiliResult.ids);
      return success(res, {
        keyword,
        engine: "meilisearch",
        total: meiliResult.total,
        list,
      });
    }

    // 降级：MySQL LIKE（覆盖标题 / 摘要 / 正文）
    const list = await articleModel.searchArticleBriefs(keyword, limit);
    success(res, {
      keyword,
      engine: "like",
      total: list.length,
      list,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { searchArticles };
