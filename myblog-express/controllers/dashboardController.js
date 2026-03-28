const articleModel = require("../models/Article");
const commentModel = require("../models/Comment");
const { success, error } = require("../utils/response");

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

module.exports = {
  getStats,
};
