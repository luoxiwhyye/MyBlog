const messageModel = require("../models/MessageBoard");
const bloggerModel = require("../models/Blogger");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");
const { notifyBlogger } = require("../services/messageNotifier");

/**
 * 获取留言列表
 * 公开请求只返回 approved；管理端（isAdmin）可读全部状态（排除已删除）
 */
const getMessages = async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = getPaginationParams(req);
    const isAdmin = req.user && req.user.role === "admin";
    const filters = {};

    if (isAdmin) {
      if (req.query.status && req.query.status !== "all") {
        filters.status = req.query.status;
      } else {
        filters.excludeDeleted = true;
      }
    } else {
      filters.status = "approved";
    }

    const messages = await messageModel.getMessages(
      offset,
      limit,
      filters,
      isAdmin,
    );
    const total = await messageModel.getMessagesCount(filters, isAdmin);

    success(res, getPaginationData(messages, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

/**
 * 发布留言（公开，访客免登录）— 提交后默认为待审核
 */
const createMessage = async (req, res, next) => {
  try {
    const { authorName, authorEmail, authorUrl, content } = req.body;

    if (!authorName || !authorEmail || !content) {
      return error(res, "必填字段不能为空", 400);
    }

    if (authorUrl) {
      const urlPattern =
        /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;
      if (!urlPattern.test(authorUrl)) {
        return error(res, "网址格式不正确", 400);
      }
    }

    // 记录 IP
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "";

    const messageId = await messageModel.createMessage({
      authorName,
      authorEmail,
      authorUrl: authorUrl || null,
      authorIp: ip,
      content,
    });

    // 异步通知博主（fire-and-forget，失败不影响主流程）
    const siteUrl = process.env.SITE_URL || "";
    bloggerModel
      .getBloggerByUsername(process.env.BLOGGER_USERNAME || "admin")
      .then((blogger) => {
        if (!blogger) return;
        return notifyBlogger({
          authorName,
          content,
          siteUrl,
          bloggerEmail: blogger.email,
        });
      })
      .catch((err) => {
        console.error("[messageNotifier] 通知博主失败:", err.message);
      });

    success(res, { id: messageId }, "留言发布成功，审核通过后展示", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 更新留言状态（需认证 + 管理员权限）
 */
const updateMessageStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "pending", "spam", "deleted"].includes(status)) {
      return error(res, "状态非法", 400);
    }

    const message = await messageModel.getMessageById(id);
    if (!message) {
      return error(res, "留言不存在", 404);
    }

    const updated = await messageModel.updateStatus(id, status);
    if (!updated) {
      return error(res, "更新失败", 500);
    }

    success(res, null, "留言状态已更新");
  } catch (err) {
    next(err);
  }
};

/**
 * 恢复留言（需认证 + 管理员权限）
 */
const restoreMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = await messageModel.getMessageById(id);
    if (!message) {
      return error(res, "留言不存在", 404);
    }

    const updated = await messageModel.updateStatus(id, "pending");
    if (!updated) {
      return error(res, "恢复失败", 500);
    }

    success(res, null, "留言已恢复");
  } catch (err) {
    next(err);
  }
};

/**
 * 软删除留言（需认证 + 管理员权限）
 */
const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = await messageModel.getMessageById(id);
    if (!message) {
      return error(res, "留言不存在", 404);
    }

    const deleted = await messageModel.softDelete(id);
    if (!deleted) {
      return error(res, "删除失败", 500);
    }

    success(res, null, "留言已删除");
  } catch (err) {
    next(err);
  }
};

/**
 * 彻底删除留言（需认证 + 管理员权限）
 */
const hardDeleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const message = await messageModel.getMessageById(id);
    if (!message) {
      return error(res, "留言不存在", 404);
    }

    const deleted = await messageModel.hardDelete(id);
    if (!deleted) {
      return error(res, "删除失败", 500);
    }

    success(res, null, "留言已彻底删除");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMessages,
  createMessage,
  updateMessageStatus,
  restoreMessage,
  deleteMessage,
  hardDeleteMessage,
};
