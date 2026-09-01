const articleModel = require("../models/Article");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");
const { uploadToCDN } = require("../utils/upload");
const meilisearch = require("../services/meilisearch");

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
      filters.status = req.query.status;
    }

    // F-01: 关键词搜索优先使用 Meilisearch
    if (filters.keyword && filters.status === "published") {
      const meiliResult = await meilisearch.search(filters.keyword, {
        page,
        pageSize,
        typeId: filters.typeId ? Number(filters.typeId) : undefined,
        sortBy: filters.sortBy,
      });

      if (meiliResult) {
        // 用 Meilisearch 返回的 ID 列表查询数据库获取完整数据
        if (meiliResult.ids.length > 0) {
          const articles = await articleModel.getArticlesByIds(meiliResult.ids);
          return success(
            res,
            getPaginationData(articles, meiliResult.total, page, pageSize),
          );
        }
        return success(res, getPaginationData([], 0, page, pageSize));
      }
      // Meilisearch 不可用，降级到 MySQL LIKE（继续走下面逻辑）
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
    // 优先使用前端传来的封面地址，兼容通过 upload/image 先上传再写入场景
    if (req.body.coverImageUrl) {
      coverImage = req.body.coverImageUrl;
    }
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

    // F-01: 同步到 Meilisearch（仅已发布文章）
    if (articleData.status === "published") {
      meilisearch.syncArticle({
        id: articleId,
        title,
        content,
        summary: summary || "",
        status: articleData.status,
        typeId,
        viewCount: 0,
        createdAt: new Date().toISOString(),
      });
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
    if (req.body.isPinned !== undefined)
      articleData.isPinned = req.body.isPinned ? 1 : 0;
    if (req.body.isFeatured !== undefined)
      articleData.isFeatured = req.body.isFeatured ? 1 : 0;

    // 优先处理前端传来的地址字段，兼容先上传再写入场景
    if (req.body.coverImageUrl) {
      articleData.coverImage = req.body.coverImageUrl;
    }

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

    // F-01: 同步到 Meilisearch
    const updatedArticle = await articleModel.getArticleById(id);
    if (updatedArticle && updatedArticle.status === "published") {
      meilisearch.syncArticle(updatedArticle);
    } else {
      meilisearch.deleteArticle(id);
    }

    success(res, null, "文章更新成功");
  } catch (err) {
    next(err);
  }
};

/**
 * 批量更新文章状态（发布 / 下架）
 */
const batchUpdateStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    const normalizedIds = ids.map((id) => Number(id));

    const affected = await articleModel.updateArticlesStatus(
      normalizedIds,
      status,
    );

    // F-01: 同步 Meilisearch（发布加入索引，下架移除）
    for (const id of normalizedIds) {
      const article = await articleModel.getArticleById(id);
      if (article) {
        if (article.status === "published") {
          meilisearch.syncArticle(article);
        } else {
          meilisearch.deleteArticle(id);
        }
      }
    }

    success(res, { affected }, `已更新 ${affected} 篇文章`, 200);
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

    // F-01: 从 Meilisearch 移除
    meilisearch.deleteArticle(id);

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

    // F-01: 检查恢复后状态，决定是否同步到 Meilisearch
    const restoredArticle = await articleModel.getArticleById(id);
    if (restoredArticle && restoredArticle.status === "published") {
      meilisearch.syncArticle(restoredArticle);
    }

    success(res, null, "文章已恢复");
  } catch (err) {
    next(err);
  }
};

/**
 * 彻底删除文章
 */
const hardDeleteArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await articleModel.hardDeleteArticle(id);
    if (!deleted) {
      return error(res, "文章不存在或不在回收站", 404);
    }
    // F-01: 从 Meilisearch 移除
    meilisearch.deleteArticle(id);
    success(res, null, "文章已彻底删除");
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
  batchUpdateStatus,
  deleteArticle,
  restoreArticle,
  hardDeleteArticle,
  getTrashArticles,
};
