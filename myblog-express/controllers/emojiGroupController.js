const emojiGroupModel = require("../models/EmojiGroup");
const { success, error } = require("../utils/response");
const { validateTextOrImageUrl } = require("../utils/emojiValidation");

/**
 * 表情分组接口（全部需认证 + 管理员权限）
 * 路由前缀：/api/v1/emoji-groups
 */

const getGroups = async (req, res, next) => {
  try {
    const groups = await emojiGroupModel.getGroups();
    success(res, groups);
  } catch (err) {
    next(err);
  }
};

const createGroup = async (req, res, next) => {
  try {
    const { name, cover, sortOrder } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return error(res, "分组名称不能为空", 400);
    }
    if (name.trim().length > 50) {
      return error(res, "分组名称过长（≤50 字符）", 400);
    }
    // 分组标识与表情内容共用同一套校验规则（上轮回归教训）
    let normalizedCover = null;
    if (cover !== undefined && cover !== null && String(cover).trim() !== "") {
      const validCover = validateTextOrImageUrl(cover, {
        label: "分组标识",
        maxLength: 500,
      });
      if (validCover) {
        return error(res, validCover, 400);
      }
      normalizedCover = String(cover).trim();
    }

    const id = await emojiGroupModel.createGroup({
      name: name.trim(),
      cover: normalizedCover,
      sortOrder: Number(sortOrder) || 0,
    });

    success(res, { id }, "分组创建成功", 201);
  } catch (err) {
    next(err);
  }
};

const updateGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, cover, sortOrder } = req.body;

    const group = await emojiGroupModel.getGroupById(id);
    if (!group) {
      return error(res, "分组不存在", 404);
    }

    const payload = {};

    if (name !== undefined) {
      if (!name || typeof name !== "string" || !name.trim()) {
        return error(res, "分组名称不能为空", 400);
      }
      if (name.trim().length > 50) {
        return error(res, "分组名称过长（≤50 字符）", 400);
      }
      payload.name = name.trim();
    }

    // cover：undefined = 不动；null / '' = 清空；其余按规则校验
    if (cover !== undefined) {
      if (cover === null || String(cover).trim() === "") {
        payload.cover = null;
      } else {
        const validCover = validateTextOrImageUrl(cover, {
          label: "分组标识",
          maxLength: 500,
        });
        if (validCover) {
          return error(res, validCover, 400);
        }
        payload.cover = String(cover).trim();
      }
    }

    if (sortOrder !== undefined) {
      payload.sortOrder = Number(sortOrder) || 0;
    }

    const updated = await emojiGroupModel.updateGroup(id, payload);
    if (!updated) {
      return error(res, "更新失败", 500);
    }

    success(res, null, "分组已更新");
  } catch (err) {
    next(err);
  }
};

const deleteGroup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const group = await emojiGroupModel.getGroupById(id);
    if (!group) {
      return error(res, "分组不存在", 404);
    }

    // 外键 ON DELETE SET NULL：删除分组不删表情，组内表情退回未分组
    const deleted = await emojiGroupModel.deleteGroup(id);
    if (!deleted) {
      return error(res, "删除失败", 500);
    }

    success(res, null, "分组已删除，组内表情退回未分组");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};
