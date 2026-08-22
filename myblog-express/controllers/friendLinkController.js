const friendLinkModel = require("../models/FriendLink");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");
const cache = require("../middleware/cache");

const URL_PATTERN = /^https?:\/\/.+/i;

/**
 * 校验友链表单（name/url 必填）
 */
const validateFriendLinkBody = (body, { partial = false } = {}) => {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || body.name.trim() === "") {
      errors.push("网站名称不能为空");
    }
  }
  if (!partial || body.url !== undefined) {
    if (!body.url || body.url.trim() === "") {
      errors.push("网站URL不能为空");
    } else if (!URL_PATTERN.test(body.url)) {
      errors.push("URL 必须以 http(s):// 开头");
    }
  }
  if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push("站长邮箱格式不正确");
  }
  return errors;
};

/**
 * 获取友链列表（公开，仅启用；管理端可看全部）
 * 公开场景默认 onlyEnabled=true，带 api/status 查询可控 → 交由路由决定
 */
const getFriendLinks = async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = getPaginationParams(req);

    // 非管理员只看启用
    const onlyEnabled = !req.user || req.user.role !== "admin";
    const filters = { onlyEnabled };

    const list = await friendLinkModel.getFriendLinks(offset, limit, filters);
    const total = await friendLinkModel.getFriendLinksCount(filters);

    success(res, getPaginationData(list, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

/**
 * 获取友链详情
 */
const getFriendLinkById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await friendLinkModel.getFriendLinkById(id);
    if (!item) {
      return error(res, "友链不存在", 404);
    }
    // 非管理员只能看启用状态
    if (!item.status && (!req.user || req.user.role !== "admin")) {
      return error(res, "无权访问该友链", 403);
    }
    success(res, item);
  } catch (err) {
    next(err);
  }
};

/**
 * 创建友链（管理员）
 */
const createFriendLink = async (req, res, next) => {
  try {
    const errors = validateFriendLinkBody(req.body);
    if (errors.length > 0) {
      return error(res, errors[0], 400);
    }

    const id = await friendLinkModel.createFriendLink({
      name: req.body.name.trim(),
      url: req.body.url.trim(),
      avatar: req.body.avatar,
      description: req.body.description,
      email: req.body.email,
      status: req.body.status,
      isSticky: req.body.isSticky,
    });
    cache.invalidate("friend-links");
    success(res, { id }, "友链创建成功", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 更新友链（管理员）
 */
const updateFriendLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await friendLinkModel.getFriendLinkById(id);
    if (!item) {
      return error(res, "友链不存在", 404);
    }

    const errors = validateFriendLinkBody(req.body, { partial: true });
    if (errors.length > 0) {
      return error(res, errors[0], 400);
    }

    const updated = await friendLinkModel.updateFriendLink(id, {
      name: req.body.name !== undefined ? req.body.name.trim() : undefined,
      url: req.body.url !== undefined ? req.body.url.trim() : undefined,
      avatar: req.body.avatar,
      description: req.body.description,
      email: req.body.email,
      status: req.body.status,
      isSticky: req.body.isSticky,
    });
    if (!updated) {
      return error(res, "友链更新失败", 500);
    }
    cache.invalidate("friend-links");
    success(res, null, "友链更新成功");
  } catch (err) {
    next(err);
  }
};

/**
 * 删除友链（管理员）
 */
const deleteFriendLink = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await friendLinkModel.getFriendLinkById(id);
    if (!item) {
      return error(res, "友链不存在", 404);
    }

    const deleted = await friendLinkModel.deleteFriendLink(id);
    if (!deleted) {
      return error(res, "友链删除失败", 500);
    }
    cache.invalidate("friend-links");
    success(res, null, "友链删除成功");
  } catch (err) {
    next(err);
  }
};

/**
 * 记录点击次数（公开，无需登录）
 */
const incrementClickCount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await friendLinkModel.getFriendLinkById(id);
    if (!item) {
      return error(res, "友链不存在", 404);
    }
    await friendLinkModel.incrementClickCount(id);
    success(res, null, "点击已记录");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFriendLinks,
  getFriendLinkById,
  createFriendLink,
  updateFriendLink,
  deleteFriendLink,
  incrementClickCount,
};
