const commentModel = require("../models/Comment");
const articleModel = require("../models/Article");
const bloggerModel = require("../models/Blogger");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");
const { getClientIp } = require("../utils/clientIp");
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
    // 层级筛选（管理端）：all 全部 / top 仅父评论 / reply 仅回复；取不到或非法值一律当 all
    const level = ["top", "reply"].includes(req.query.level)
      ? req.query.level
      : "all";
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
      { topLevelOnly, sortBy, level },
    );
    const total = await commentModel.getCommentsCount(filters, isAdmin, {
      topLevelOnly,
      level,
    });

    // 文章详情页按顶级评论分页时，批量加载该页所有顶级评论的一层回复（评论为两级结构）
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
    const {
      articleId,
      parentId,
      replyToId,
      authorName,
      authorEmail,
      authorUrl,
      content,
      notifyEmail,
    } = req.body;

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

    // 两级扁平结构：若回复的目标本身是"回复"（有父级），需把回复挂到其顶层评论下，
    // 避免出现第三层及以上嵌套。
    let normalizedParentId = parentId || null;
    if (parentId) {
      const parentComment = await commentModel.getCommentById(parentId);
      if (parentComment) {
        normalizedParentId =
          parentComment.parent_id || parentComment.parentId || parentComment.id;
      }
    }

    const commentData = {
      articleId,
      parentId: normalizedParentId,
      // 「回复谁」必须单独记录：parentId 已被规整到顶层，丢掉这个信息会让
      // 二级回复者永远收不到通知（详见 scripts/addNotifyEmailColumns.js）
      replyToId: replyToId || parentId || null,
      authorName,
      authorEmail,
      authorUrl: authorUrl || null,
      // 客户端 IP：与限流、留言三处共用 utils/clientIp（口径由 TRUST_PROXY 决定）
      authorIp: getClientIp(req),
      content,
      // 邮件订阅开关：只有访客显式勾选才为 true（未传 / 非 true 一律不接收）
      notifyEmail: notifyEmail === true || notifyEmail === "true",
    };

    const commentId = await commentModel.createComment(commentData);

    // 异步发送通知（fire-and-forget，失败不影响主流程）
    //
    // 通知时机分两类：
    //   ① 顶层评论 → 博主：**创建即发**（博主是审核方，需要第一时间知道有新评论）；
    //   ② 回复 → 被回复者：**延后到审核通过**（见 notifyCommentReplied）。
    //      回复若创建即发，未审核的垃圾 / 恶意回复会直接打扰被回复者，且邮件没有
    //      退订途径；延后后与「审核通过后才展示」的语义一致。
    if (!parentId) {
      const siteUrl = process.env.SITE_URL || "";
      const articleTitle = article.title || "未命名文章";

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
 * 发送「您的评论收到回复」邮件（收件人 = 被回复者）。
 *
 * 触发时机：**回复审核通过时**（延后通知，见更新状态处）。与顶层评论不同 ——
 * 顶层评论创建即通知博主（博主是审核方，需要第一时间知晓）；回复若创建即发，
 * 未审核的垃圾 / 恶意回复会直接打扰被回复者，且邮件无退订途径。延后到 approved
 * 后通知，与「审核通过后才展示」的语义一致。
 *
 * 幂等：由调用方保证只在「非 approved → approved」时调用，重复审核不会重复发信。
 * fire-and-forget：内部自捕获异常，不影响状态更新主流程。
 *
 * 订阅开关：收件人（= 被回复的那条评论的作者）必须勾选过「有人回复我时，邮件通知我」
 * （`notify_email = 1`）。新列默认 0 → 存量评论者不再收到回复邮件，这是
 * 「默认不接收」的预期结果。
 *
 * ⚠️ 收件人是 `reply_to_id` 指向的那条评论的作者，不是 `parent_id`：评论是两级扁平
 * 结构，回复二级评论时 parent_id 已被规整到顶层，只有 reply_to_id 才代表「你回复的是谁」。
 * reply_to_id 为空时（存量数据 / 旧客户端）回退用 parent_id，与改动前的行为一致。
 */
const notifyCommentReplied = async (commentId) => {
  try {
    const comment = await commentModel.getCommentById(commentId);
    if (!comment || !comment.parent_id) {
      return;
    }

    const article = await articleModel.getArticleById(comment.article_id);
    const targetId = comment.reply_to_id || comment.parent_id;
    const recipient = await commentModel.getCommentById(targetId);
    if (!article || !recipient) {
      return;
    }

    // 未订阅就静默短路（与「收件人邮箱为空」同一种跳过语义）
    if (Number(recipient.notify_email) !== 1) {
      return { skipped: true };
    }

    await notifyReplied({
      articleTitle: article.title || "未命名文章",
      articleId: comment.article_id,
      recipientName: recipient.author_name,
      recipientEmail: recipient.author_email,
      replierName: comment.author_name,
      content: comment.content,
      siteUrl: process.env.SITE_URL || "",
    });
  } catch (err) {
    console.error("[commentNotifier] 回复通知发送失败:", err.message);
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

    // 状态只有三档：pending（待审核）/ approved（已审核）/ deleted（回收站）
    if (!["pending", "approved", "deleted"].includes(status)) {
      return error(res, "状态值无效", 400);
    }

    const result = await commentModel.applyCommentStatus(id, status);
    if (!result.found) {
      return error(res, "评论不存在", 404);
    }
    // 审核守卫：父评论未通过时拒绝写入，避免出现「子回复已审核、父评论没通过」
    if (result.blocker) {
      return error(
        res,
        commentModel.approveBlockerMessage(result.blocker),
        400,
      );
    }

    // 回复通知延后到「审核通过」时发送（fire-and-forget）：
    // 只在状态真正发生「非 approved → approved」变化时发一次，重复审核不重复发信。
    if (
      status === "approved" &&
      result.previous.status !== "approved" &&
      result.previous.parent_id
    ) {
      notifyCommentReplied(id);
    }

    success(res, null, "评论状态更新成功");
  } catch (err) {
    next(err);
  }
};

/**
 * 批量更新评论状态（审核）
 *
 * 对象语义与单条删除 / 恢复一致：传入顶层评论即连带其后代。
 */
const batchUpdateCommentStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;

    const rootIds = [
      ...new Set(
        (Array.isArray(ids) ? ids : [])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
    if (!rootIds.length) {
      return error(res, "ids 必须是非空数组", 400);
    }

    const { affected, requested, newlyApprovedReplyIds, blocked } =
      await commentModel.batchUpdateCommentsStatus(rootIds, status);
    // 命中审核守卫：整批拒绝，不做部分写入
    if (blocked) {
      return error(res, commentModel.approveBlockerMessage(blocked), 400);
    }
    if (affected === 0) {
      return error(res, "评论不存在", 404);
    }

    // 回复通知延后到「审核通过」时发送（fire-and-forget）：与单条端点同口径，
    // 按条判定「由非 approved 变为 approved 且是回复」，重复审核不重复发信。
    newlyApprovedReplyIds.forEach((id) => notifyCommentReplied(id));

    success(
      res,
      { affected, requested },
      affected > requested
        ? `已更新 ${affected} 条评论（含 ${affected - requested} 条子回复）`
        : `已更新 ${affected} 条评论`,
    );
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
  batchUpdateCommentStatus,
  likeComment,
};
