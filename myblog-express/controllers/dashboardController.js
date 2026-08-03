const articleModel = require("../models/Article");
const commentModel = require("../models/Comment");
const { success } = require("../utils/response");

const padNumber = (num) => String(num).padStart(2, "0");

const formatDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = padNumber(date.getMonth() + 1);
  const day = padNumber(date.getDate());
  return `${year}-${month}-${day}`;
};

const buildDateRange = (days) => {
  const result = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    result.push(formatDate(date));
  }

  return result;
};

const getStats = async (req, res, next) => {
  try {
    const totalArticles = await articleModel.getArticlesCount();
    const totalComments = await commentModel.getCommentsCount({}, true);
    const totalViews = await articleModel.getTotalViewCount();
    const pendingComments = await commentModel.getCommentsCount(
      { status: "pending" },
      true,
    );

    success(res, { totalArticles, totalComments, totalViews, pendingComments });
  } catch (err) {
    next(err);
  }
};

const getCharts = async (req, res, next) => {
  try {
    const days = Math.max(7, Math.min(90, Number(req.query.days) || 30));
    const scope = req.query.scope === "all" ? "all" : "published";
    const trendRows = await articleModel.getArticlePublishTrend(days, scope);
    const distributionRows =
      await articleModel.getTypeArticleDistribution(scope);

    const trendMap = new Map(
      trendRows.map((item) => [
        formatDate(item.publishDate),
        Number(item.articleCount),
      ]),
    );

    const dates = buildDateRange(days);
    const articlePublishTrend = dates.map((date) => ({
      date,
      count: trendMap.get(date) || 0,
    }));

    const typeDistribution = distributionRows.map((item) => ({
      typeId: Number(item.id),
      typeName: item.typeName,
      articleCount: Number(item.articleCount),
    }));

    success(res, {
      scope,
      articlePublishTrend,
      typeDistribution,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getCharts,
};
