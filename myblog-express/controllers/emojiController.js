const emojiModel = require("../models/Emoji");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");

// 图片 URL 白名单（仅 http/https，无引号/尖括号/空白）
const URL_PATTERN = /^https?:\/\/[^\s"'<>\\]+$/i;
// 危险 HTML 字符（防 XSS）——文本表情允许任意 Unicode（含 Emoji/颜文字），
// 但绝不能包含 HTML 标记字符。文本在 Vue 中默认转义渲染，故只需排除这些。
const UNSAFE_CHARS = /[<>"'`]/;
// 任何形似协议（含 :// 或单个冒号）但非 http(s) 的 URL（如 javascript:、data:）都要拒绝
const PROTOCOL_LOOKALIKE = /^[a-z][a-z0-9+.-]*:/i;

const isHttpUrl = (value) => URL_PATTERN.test(value);

const validateEmojiContent = (content) => {
  if (!content || typeof content !== "string") {
    return "表情内容不能为空";
  }
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return "表情内容不能为空";
  }
  if (trimmed.length > 500) {
    return "表情内容过长（≤500 字符）";
  }

  // 明确形似协议/URL 的：必须是 http(s)，否则拒绝（防 javascript:/data:/vbscript: 等）
  if (trimmed.includes(":") || trimmed.includes("/") || trimmed.includes(".")) {
    if (!isHttpUrl(trimmed)) {
      return "图片 URL 格式不正确（仅支持 http/https）";
    }
    return null;
  }

  // 纯文本表情：不允许出现 HTML 危险字符（防 XSS）
  if (UNSAFE_CHARS.test(trimmed)) {
    return "表情内容包含非法字符（不允许 HTML 标记字符）";
  }
  return null;
};

/**
 * 获取表情列表（公开只返回启用；管理端可看全部）
 */
const getEmojis = async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = getPaginationParams(req);
    const isAdmin = req.user && req.user.role === "admin";
    const filters = {};

    if (isAdmin) {
      if (req.query.type) filters.type = req.query.type;
      if (req.query.enabled !== undefined) {
        filters.enabled =
          req.query.enabled === "1" || req.query.enabled === "true";
      }
    } else {
      // 公开只返回启用
    }

    const emojis = await emojiModel.getEmojis(offset, limit, filters, isAdmin);
    const total = await emojiModel.getEmojisCount(filters, isAdmin);

    success(res, getPaginationData(emojis, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

/**
 * 公开：获取所有启用的表情（首页/评论/留言动态拉取用，一次拉全）
 */
const getEnabledEmojis = async (req, res, next) => {
  try {
    const emojis = await emojiModel.getEnabledEmojis();
    success(res, emojis);
  } catch (err) {
    next(err);
  }
};

/**
 * 新增表情（需认证 + 管理员权限）
 */
const createEmoji = async (req, res, next) => {
  try {
    const { content, type, isCustom, enabled, sortOrder } = req.body;

    const validContent = validateEmojiContent(content);
    if (validContent) {
      return error(res, validContent, 400);
    }
    if (type && !["emoji", "kaomoji"].includes(type)) {
      return error(res, "type 必须是 emoji 或 kaomoji", 400);
    }

    const id = await emojiModel.createEmoji({
      content: content.trim(),
      type: type || "emoji",
      isCustom: Boolean(isCustom),
      enabled: enabled !== false,
      sortOrder: Number(sortOrder) || 0,
    });

    success(res, { id }, "表情添加成功", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 更新表情（需认证 + 管理员权限）
 */
const updateEmoji = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, type, isCustom, enabled, sortOrder } = req.body;

    const emoji = await emojiModel.getEmojiById(id);
    if (!emoji) {
      return error(res, "表情不存在", 404);
    }

    if (content !== undefined) {
      const validContent = validateEmojiContent(content);
      if (validContent) {
        return error(res, validContent, 400);
      }
    }
    if (type && !["emoji", "kaomoji"].includes(type)) {
      return error(res, "type 必须是 emoji 或 kaomoji", 400);
    }

    const updated = await emojiModel.updateEmoji(id, {
      content: content !== undefined ? content.trim() : undefined,
      type,
      isCustom,
      enabled,
      sortOrder: sortOrder !== undefined ? Number(sortOrder) : undefined,
    });
    if (!updated) {
      return error(res, "更新失败", 500);
    }

    success(res, null, "表情已更新");
  } catch (err) {
    next(err);
  }
};

/**
 * 删除表情（需认证 + 管理员权限）
 */
const deleteEmoji = async (req, res, next) => {
  try {
    const { id } = req.params;
    const emoji = await emojiModel.getEmojiById(id);
    if (!emoji) {
      return error(res, "表情不存在", 404);
    }

    const deleted = await emojiModel.deleteEmoji(id);
    if (!deleted) {
      return error(res, "删除失败", 500);
    }

    success(res, null, "表情已删除");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEmojis,
  getEnabledEmojis,
  createEmoji,
  updateEmoji,
  deleteEmoji,
};
