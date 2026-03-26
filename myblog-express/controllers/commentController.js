const commentModel = require("../models/Comment");
const articleModel = require("../models/Article");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");

/**
 * 获取评论列表
 */
const getComments = async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = getPaginationParams(req);
    const filters = {};

    if (req.query.articleId) {
      filters.articleId = req.query.articleId;
    }

    const isAdmin = req.user && req.user.role === "admin";

    const comments = await commentModel.getComments(
      offset,
      limit,
      filters,
      isAdmin,
    );
    const total = await commentModel.getCommentsCount(filters, isAdmin);

    // 为顶级评论添加回复
    for (const comment of comments) {
      if (!comment.parentId) {
        comment.replies = await commentModel.getReplies(comment.id);
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
    const { articleId, parentId, authorName, authorEmail, content } = req.body;

    // 验证必填字段
    if (!articleId || !authorName || !authorEmail || !content) {
      return error(res, "必填字段不能为空", 400);
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
      content,
    };

    const commentId = await commentModel.createComment(commentData);
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

    const comment = await commentModel.getCommentById(id);
    if (!comment) {
      return error(res, "评论不存在", 404);
    }

    // 权限判断：博主可以删除任何评论，用户只能删除自己的评论
    if (!isAdmin && req.user.email !== comment.authorEmail) {
      return error(res, "无权删除该评论", 403);
    }

    const deleted = await commentModel.deleteComment(id);
    if (!deleted) {
      return error(res, "评论删除失败", 500);
    }

    success(res, null, "评论已删除");
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
  updateCommentStatus,
  likeComment,
};
