const emojiModel = require("../models/Emoji");
const emojiGroupModel = require("../models/EmojiGroup");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");
const {
  validateTextOrImageUrl,
  resolveEmojiType,
} = require("../utils/emojiValidation");

// 表情类型枚举（A：新增 image，「图片表情」不再被硬塞进 emoji）
const EMOJI_TYPES = ["emoji", "kaomoji", "image"];

/**
 * 校验表情类型，并在内容形如 http(s) URL 时自动归为 image
 */
const normalizeType = (content, type) => {
  if (type !== undefined && type !== null && type !== "") {
    if (!EMOJI_TYPES.includes(type)) {
      return { error: "type 必须是 emoji / kaomoji / image" };
    }
  }
  return { type: resolveEmojiType(content, type) };
};

/**
 * 校验 groupId 是否存在（0 / null / '' 表示未分组）
 * 返回 { skip: true } 表示未传（更新时保持不动）
 */
const resolveGroupId = async (groupId) => {
  if (groupId === undefined) return { skip: true };
  if (groupId === null || groupId === "" || groupId === 0 || groupId === "0") {
    return { value: null };
  }
  const id = Number(groupId);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "groupId 必须是正整数" };
  }
  const group = await emojiGroupModel.getGroupById(id);
  if (!group) {
    return { error: "分组不存在" };
  }
  return { value: id };
};

/**
 * 获取表情列表（公开只返回启用；管理端可看全部）
 * 支持 type / enabled / groupId 筛选（groupId 仅管理端生效）
 */
const getEmojis = async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = getPaginationParams(req);
    const isAdmin = req.user && req.user.role === "admin";
    const filters = {};

    if (req.query.type) filters.type = req.query.type;

    if (isAdmin) {
      if (req.query.enabled !== undefined) {
        filters.enabled =
          req.query.enabled === "1" || req.query.enabled === "true";
      }
      // 分组筛选：''=全部 / 0|none=未分组 / 正整数=指定分组
      if (req.query.groupId !== undefined) {
        filters.groupId = req.query.groupId;
      }
    }

    const emojis = await emojiModel.getEmojis(offset, limit, filters, isAdmin);
    const total = await emojiModel.getEmojisCount(filters, isAdmin);

    success(res, getPaginationData(emojis, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

/**
 * 公开：获取所有启用的表情（含分组信息，兼容旧调用）
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
 * 公开：按分组返回启用表情（前台表情面板）
 */
const getGroupedEmojis = async (req, res, next) => {
  try {
    const groups = await emojiModel.getEnabledGrouped();
    success(res, groups);
  } catch (err) {
    next(err);
  }
};

/**
 * 新增表情（需认证 + 管理员权限）
 */
const createEmoji = async (req, res, next) => {
  try {
    const { content, type, isCustom, enabled, sortOrder, groupId } = req.body;

    const validContent = validateTextOrImageUrl(content, { label: "表情内容" });
    if (validContent) {
      return error(res, validContent, 400);
    }

    const normalized = normalizeType(content, type);
    if (normalized.error) {
      return error(res, normalized.error, 400);
    }

    const group = await resolveGroupId(groupId);
    if (group.error) {
      return error(res, group.error, 400);
    }

    const id = await emojiModel.createEmoji({
      content: content.trim(),
      type: normalized.type,
      groupId: group.value || null,
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
    const { content, type, isCustom, enabled, sortOrder, groupId } = req.body;

    const emoji = await emojiModel.getEmojiById(id);
    if (!emoji) {
      return error(res, "表情不存在", 404);
    }

    if (content !== undefined) {
      const validContent = validateTextOrImageUrl(content, {
        label: "表情内容",
      });
      if (validContent) {
        return error(res, validContent, 400);
      }
    }

    // 仅在显式改内容或改类型时重新判定（内容为 URL 时优先归 image）
    let nextType = type;
    if (type !== undefined || content !== undefined) {
      const normalized = normalizeType(
        content !== undefined ? content : emoji.content,
        type !== undefined ? type : emoji.type,
      );
      if (normalized.error) {
        return error(res, normalized.error, 400);
      }
      nextType = normalized.type;
    }

    const group = await resolveGroupId(groupId);
    if (group.error) {
      return error(res, group.error, 400);
    }

    const updated = await emojiModel.updateEmoji(id, {
      content: content !== undefined ? content.trim() : undefined,
      type: nextType,
      groupId: group.skip ? undefined : group.value,
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
  getGroupedEmojis,
  createEmoji,
  updateEmoji,
  deleteEmoji,
};
