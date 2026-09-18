const articleModel = require("../models/Article");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");
const { uploadToCDN } = require("../utils/upload");
const meilisearch = require("../services/meilisearch");

/**
 * 解析「开关」类字段（multipart / urlencoded 表单里拿到的是字符串）。
 *
 * ⚠️ 不能直接写 `value ? 1 : 0`：表单传来的是字符串 "0"，它在 JS 里是**真值**，
 *    于是「关闭」会被反着写成「开启」。也不能只认 "1"——JSON 客户端传的是布尔 true/false。
 * 未传（undefined / null / 空串）返回 undefined，由调用方决定是否跳过该字段。
 */
const parseSwitch = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value ? 1 : 0;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase())
    ? 1
    : 0;
};

/**
 * 归一化标签 id：表单里是逗号分隔串（`"1,2"`）、JSON 里也可能是数组（`[1,2]`）。
 *
 * 返回值语义（**未传**与**传了空值**不同，与单条删除 / 恢复的级联一致）：
 * - 未传（undefined / null）→ `undefined`：**不动**标签关联
 * - 空串 / 空数组 / 只有空白 → `[]`：**清空**全部标签
 * - `"1,2"` / `[1,2]` → `[1, 2]`
 *
 * ⚠️ 非空但**一个有效 id 都没有**（如 `"abc"`）返 `null` 而不是 `[]`：
 *    空数组会把标签静默清空，而这类输入其实是客户端的错。调用方据此报 400。
 * ⚠️ 别忘了 `"".split(",")` 得到的是 `[""]`（长度 1）—— 空串（= 清空标签）
 *    必须先单独判掉，否则会被误判成非法输入。
 */
const normalizeLabelIds = (value) => {
  if (value === undefined || value === null) return undefined;

  let raw;
  if (Array.isArray(value)) {
    if (value.length === 0) return [];
    raw = value;
  } else {
    const text = String(value).trim();
    if (text === "") return [];
    raw = text.split(",");
  }

  const ids = raw
    .map((item) => parseInt(String(item).trim(), 10))
    .filter((id) => Number.isInteger(id) && id > 0);
  return ids.length === 0 ? null : ids;
};

/**
 * 解析封面地址。
 *
 * 两个来源都支持（兼容两条流程），且**随表单上传的文件优先**于 `coverImageUrl`：
 * - `coverImageUrl`：前端先调 `/upload/image` 拿到地址，再把它当普通字段提交（后台当前走这条）
 * - `coverImage` 文件部分：multer 已落盘，这里取它的访问地址
 */
const resolveCoverImage = (req) => {
  if (req.file) return uploadToCDN(req.file.path);
  return req.body.coverImageUrl || null;
};

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
 * 获取上一篇 / 下一篇（公开，含草稿鉴权判断）
 */
const getArticleAdjacent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = await articleModel.getAdjacentArticles(id);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

/**
 * 获取相关推荐（公开，按标签/分类聚合）
 */
const getArticleRelated = async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 4, 1), 12);
    const data = await articleModel.getRelatedArticles(id, limit);
    success(res, data);
  } catch (err) {
    next(err);
  }
};

/**
 * 创建文章
 */
const createArticle = async (req, res, next) => {
  try {
    const { title, content, summary, typeId, status, contentFormat } = req.body;

    // 验证必填字段
    if (!title || !content || !typeId) {
      return error(res, "标题、内容和分类不能为空", 400);
    }

    const labelIds = normalizeLabelIds(req.body.labelIds);
    if (labelIds === null) {
      return error(res, "标签 ID 必须是正整数", 400);
    }

    // 创建文章
    const articleData = {
      title,
      content,
      contentFormat: contentFormat === "markdown" ? "markdown" : "html",
      summary: summary || "",
      coverImage: resolveCoverImage(req) || "",
      typeId,
      status: status || "draft",
    };

    // 评论区开关：未传时留给建表默认值 1（= 开放），避免旧客户端新建的文章被静默关掉评论
    const commentEnabled = parseSwitch(req.body.commentEnabled);
    if (commentEnabled !== undefined) {
      articleData.commentEnabled = commentEnabled;
    }

    // 文章与标签关联在同一个事务里落库（否则标签关联失败会留下没标签的文章行）
    const articleId = await articleModel.createArticleWithLabels(
      articleData,
      labelIds ?? [],
    );

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
    const { title, content, summary, typeId, status, contentFormat } = req.body;

    const article = await articleModel.getArticleById(id);
    if (!article) {
      return error(res, "文章不存在", 404);
    }

    const labelIds = normalizeLabelIds(req.body.labelIds);
    if (labelIds === null) {
      return error(res, "标签 ID 必须是正整数", 400);
    }

    const articleData = {};
    if (title !== undefined) articleData.title = title;
    if (content !== undefined) articleData.content = content;
    if (contentFormat !== undefined)
      articleData.contentFormat =
        contentFormat === "markdown" ? "markdown" : "html";
    if (summary !== undefined) articleData.summary = summary;
    if (typeId !== undefined) articleData.typeId = typeId;
    if (status !== undefined) articleData.status = status;
    if (req.body.isPinned !== undefined)
      articleData.isPinned = req.body.isPinned ? 1 : 0;
    if (req.body.isFeatured !== undefined)
      articleData.isFeatured = req.body.isFeatured ? 1 : 0;
    // 评论区开关：必须走 parseSwitch，不能直接取真值（表单里的 "0" 是真值）
    const commentEnabled = parseSwitch(req.body.commentEnabled);
    if (commentEnabled !== undefined)
      articleData.commentEnabled = commentEnabled;

    // 封面：传了地址就覆盖，随表单上传的文件优先（两者都没传则不动该列）
    if (req.body.coverImageUrl) {
      articleData.coverImage = req.body.coverImageUrl;
    }
    if (req.file) {
      articleData.coverImage = uploadToCDN(req.file.path);
    }

    // 字段更新与标签重建在同一个事务里（否则清空标签后重建失败会丢掉原有标签）
    await articleModel.updateArticleWithLabels(id, articleData, labelIds);

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
  getArticleAdjacent,
  getArticleRelated,
  createArticle,
  updateArticle,
  batchUpdateStatus,
  deleteArticle,
  restoreArticle,
  hardDeleteArticle,
  getTrashArticles,
};
