const articleModel = require("../models/Article");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");
const { uploadToCDN } = require("../utils/upload");

/**
 * 分页查询文章
 */
const getArticles = async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = getPaginationParams(req);

    const filters = {};
    if (req.query.typeId) filters.typeId = req.query.typeId;
    if (req.query.labelId) filters.labelId = req.query.labelId;
    if (req.query.keyword) filters.keyword = req.query.keyword;
    if (req.query.sortBy) filters.sortBy = req.query.sortBy;

    // 权限判断：如果是未登录的访客，只能看已发布的文章
    if (!req.user || req.user.role !== "admin") {
      filters.status = "published";
    } else if (req.query.status) {
      // 博主可以指定status过滤
      filters.status = req.query.status;
    }

    const articles = await articleModel.getArticles(offset, limit, filters);
    const total = await articleModel.getArticlesCount(filters);

    success(res, getPaginationData(articles, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

/**
 * 获取文章详情
 */
const getArticleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await articleModel.getArticleById(id);
    if (!article) {
      return error(res, "文章不存在", 404);
    }

    // 权限判断：只有博主才能看草稿
    if (
      article.status !== "published" &&
      (!req.user || req.user.role !== "admin")
    ) {
      return error(res, "无权访问该文章", 403);
    }

    // 增加浏览次数
    await articleModel.incrementViewCount(id);
    article.viewCount += 1;

    success(res, article);
  } catch (err) {
    next(err);
  }
};

/**
 * 创建文章
 */
const createArticle = async (req, res, next) => {
  try {
    const { title, content, summary, typeId, labelIds, status } = req.body;

    // 验证必填字段
    if (!title || !content || !typeId) {
      return error(res, "标题、内容和分类不能为空", 400);
    }

    let coverImage = "";
    if (req.file) {
      coverImage = uploadToCDN(req.file.path);
    }

    // 创建文章
    const articleData = {
      title,
      content,
      summary: summary || "",
      coverImage,
      typeId,
      status: status || "draft",
    };

    const articleId = await articleModel.createArticle(articleData);

    // 处理标签关联
    if (labelIds) {
      const ids = labelIds.split(",").map((id) => parseInt(id));
      await articleModel.addArticleLabels(articleId, ids);
    }

    success(res, { id: articleId }, "文章创建成功", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 更新文章
 */
const updateArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, summary, typeId, labelIds, status } = req.body;

    const article = await articleModel.getArticleById(id);
    if (!article) {
      return error(res, "文章不存在", 404);
    }

    const articleData = {};
    if (title !== undefined) articleData.title = title;
    if (content !== undefined) articleData.content = content;
    if (summary !== undefined) articleData.summary = summary;
    if (typeId !== undefined) articleData.typeId = typeId;
    if (status !== undefined) articleData.status = status;

    if (req.file) {
      articleData.coverImage = uploadToCDN(req.file.path);
    }

    const updated = await articleModel.updateArticle(id, articleData);
    if (!updated && req.file === undefined) {
      // 如果没有更新字段且没有文件，返回成功
    }

    // 更新标签关联
    if (labelIds !== undefined) {
      await articleModel.clearArticleLabels(id);
      if (labelIds) {
        const ids = labelIds.split(",").map((id) => parseInt(id));
        await articleModel.addArticleLabels(id, ids);
      }
    }

    success(res, null, "文章更新成功");
  } catch (err) {
    next(err);
  }
};

/**
 * 软删除文章
 */
const deleteArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const article = await articleModel.getArticleById(id);
    if (!article) {
      return error(res, "文章不存在", 404);
    }

    const deleted = await articleModel.softDeleteArticle(id);
    if (!deleted) {
      return error(res, "文章删除失败", 500);
    }

    success(res, null, "文章已进入回收站");
  } catch (err) {
    next(err);
  }
};

/**
 * 恢复文章
 */
const restoreArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rows] = await require("../config/database").query(
      "SELECT * FROM article WHERE id = ? AND deleted_at IS NOT NULL",
      [id],
    );
    if (rows.length === 0) {
      return error(res, "文章不存在或未被删除", 404);
    }

    const restored = await articleModel.restoreArticle(id);
    if (!restored) {
      return error(res, "文章恢复失败", 500);
    }

    success(res, null, "文章已恢复");
  } catch (err) {
    next(err);
  }
};

/**
 * 获取回收站文章
 */
const getTrashArticles = async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = getPaginationParams(req);

    const articles = await articleModel.getTrashArticles(offset, limit);
    const total = await articleModel.getTrashArticlesCount();

    success(res, getPaginationData(articles, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getArticles,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  restoreArticle,
  getTrashArticles,
};
