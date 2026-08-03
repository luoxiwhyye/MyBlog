const commentModel = require("../models/Comment");
const articleModel = require("../models/Article");
const bloggerModel = require("../models/Blogger");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");
const { notifyBlogger, notifyReplied } = require("../services/commentNotifier");

/**
 * 获取评论列表
 */
const getComments = async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = getPaginationParams(req);
    const filters = {};
    const sortBy = req.query.sortBy === "hottest" ? "hottest" : "latest";
    const topLevelOnly = req.query.topLevelOnly === "true";
    const isAdmin = req.user && req.user.role === "admin";

    if (req.query.articleId) {
      filters.articleId = req.query.articleId;
    }

    if (isAdmin) {
      if (req.query.status && req.query.status !== "all") {
        filters.status = req.query.status;
      } else {
        // 管理端默认列表不展示已删除评论，避免与回收站混在一起。
        filters.excludeDeleted = true;
      }
    } else {
      filters.status = "approved";
    }

    const comments = await commentModel.getComments(
      offset,
      limit,
      filters,
      isAdmin,
      { topLevelOnly, sortBy },
    );
    const total = await commentModel.getCommentsCount(filters, isAdmin, {
      topLevelOnly,
    });

    // 文章详情页按顶级评论分页时，批量加载该页所有顶级评论的回复树
    if (topLevelOnly && comments.length > 0) {
      const parentIds = comments.map((c) => c.id);
      const repliesMap = await commentModel.getRepliesBatch(parentIds);
      for (const comment of comments) {
        comment.replies = repliesMap[comment.id] || [];
      }
    }

    success(res, getPaginationData(comments, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

/**
 * 发布评论
 */
const createComment = async (req, res, next) => {
  try {
    const { articleId, parentId, authorName, authorEmail, authorUrl, content } =
      req.body;

    // 验证必填字段
    if (!articleId || !authorName || !authorEmail || !content) {
      return error(res, "必填字段不能为空", 400);
    }

    // 验证 authorUrl 格式（如果提供）
    if (authorUrl) {
      const urlPattern =
        /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;
      if (!urlPattern.test(authorUrl)) {
        return error(res, "网址格式不正确", 400);
      }
    }

    // 检查文章是否存在
    const article = await articleModel.getArticleById(articleId);
    if (!article) {
      return error(res, "文章不存在", 404);
    }

    const commentData = {
      articleId,
      parentId: parentId || null,
      authorName,
      authorEmail,
      authorUrl: authorUrl || null,
      content,
    };

    const commentId = await commentModel.createComment(commentData);

    // 异步发送通知（fire-and-forget，失败不影响主流程）
    const siteUrl = process.env.SITE_URL || "";
    const articleTitle = article.title || "未命名文章";

    if (parentId) {
      // 回复通知：通知被回复者
      commentModel
        .getCommentById(parentId)
        .then((parentComment) => {
          if (!parentComment) {
            return;
          }
          return notifyReplied({
            articleTitle,
            articleId,
            parentAuthorName: parentComment.authorName,
            parentEmail: parentComment.authorEmail,
            replierName: authorName,
            content,
            siteUrl,
          });
        })
        .catch((err) => {
          console.error("[commentNotifier] 获取父评论失败:", err.message);
        });
    } else {
      // 新评论通知：通知博主
      bloggerModel
        .getBloggerByUsername(process.env.BLOGGER_USERNAME || "admin")
        .then((blogger) => {
          if (!blogger) {
            return;
          }
          return notifyBlogger({
            articleTitle,
            articleId,
            authorName,
            content,
            siteUrl,
            bloggerEmail: blogger.email,
          });
        })
        .catch((err) => {
          console.error("[commentNotifier] 通知博主失败:", err.message);
        });
    }

    success(res, { id: commentId }, "评论发布成功", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 删除评论
 */
const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user && req.user.role === "admin";
    const requesterEmail = req.user?.email;

    const comment = await commentModel.getCommentById(id);
    if (!comment) {
      return error(res, "评论不存在", 404);
    }

    // 权限判断：博主可以删除任何评论，用户只能删除自己的评论
    if (!isAdmin && !requesterEmail) {
      return error(res, "请先登录后再删除评论", 401);
    }

    if (!isAdmin && requesterEmail !== comment.authorEmail) {
      return error(res, "无权删除该评论", 403);
    }

    const deleted = await commentModel.softDeleteComment(id);
    if (!deleted) {
      return error(res, "评论删除失败", 500);
    }

    success(res, null, "评论已移入回收站");
  } catch (err) {
    next(err);
  }
};

/**
 * 恢复评论
 */
const restoreComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await commentModel.getCommentById(id);
    if (!comment) {
      return error(res, "评论不存在", 404);
    }

    const restored = await commentModel.restoreComment(id);
    if (!restored) {
      return error(res, "评论恢复失败", 500);
    }

    success(res, null, "评论已恢复为待审核");
  } catch (err) {
    next(err);
  }
};

/**
 * 彻底删除评论
 */
const hardDeleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await commentModel.getCommentById(id);
    if (!comment) {
      return error(res, "评论不存在", 404);
    }

    const deleted = await commentModel.deleteComment(id);
    if (!deleted) {
      return error(res, "评论彻底删除失败", 500);
    }

    success(res, null, "评论已彻底删除");
  } catch (err) {
    next(err);
  }
};

/**
 * 更新评论状态（审核）
 */
const updateCommentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "approved", "spam", "deleted"].includes(status)) {
      return error(res, "状态值无效", 400);
    }

    const comment = await commentModel.getCommentById(id);
    if (!comment) {
      return error(res, "评论不存在", 404);
    }

    const updated = await commentModel.updateCommentStatus(id, status);
    if (!updated) {
      return error(res, "状态更新失败", 500);
    }

    success(res, null, "评论状态更新成功");
  } catch (err) {
    next(err);
  }
};

/**
 * 点赞评论
 */
const likeComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await commentModel.getCommentById(id);
    if (!comment) {
      return error(res, "评论不存在", 404);
    }

    const liked = await commentModel.incrementCommentLikes(id);
    if (!liked) {
      return error(res, "点赞失败", 500);
    }

    const updatedComment = await commentModel.getCommentById(id);
    success(res, { likeCount: updatedComment.likeCount }, "点赞成功");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getComments,
  createComment,
  deleteComment,
  restoreComment,
  hardDeleteComment,
  updateCommentStatus,
  likeComment,
};
