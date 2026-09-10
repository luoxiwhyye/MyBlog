const labelModel = require("../models/Label");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");
const { isDuplicateEntryError } = require("../utils/dbErrors");
const cache = require("../middleware/cache");

// 与 label.label_name 的 varchar(50) 对齐
const MAX_NAME_LENGTH = 50;

/** 规范化名称：非字符串/纯空白视为空；返回 { name } 或 { message } */
const normalizeName = (raw) => {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (!name) {
    return { message: "标签名称不能为空" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { message: `标签名称过长（≤${MAX_NAME_LENGTH} 字符）` };
  }
  return { name };
};

/**
 * 获取标签列表
 */
const getLabels = async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = getPaginationParams(req);

    const labels = await labelModel.getLabels(offset, limit);
    const total = await labelModel.getLabelsCount();

    // 为每个标签添加文章数量
    for (const label of labels) {
      label.articleCount = await labelModel.getLabelArticleCount(label.id);
    }

    success(res, getPaginationData(labels, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

/**
 * 创建标签
 */
const createLabel = async (req, res, next) => {
  try {
    const { labelName } = req.body;

    const normalized = normalizeName(labelName);
    if (normalized.message) {
      return error(res, normalized.message, 400);
    }

    // 禁止重名（唯一索引外的第一层防护，报错更友好）
    const existed = await labelModel.getLabelByName(normalized.name);
    if (existed) {
      return error(res, `标签「${normalized.name}」已存在`, 409);
    }

    const labelId = await labelModel.createLabel(normalized.name);
    // 必须 await：确保清缓存完成后再返回，否则前端刷新列表仍命中旧缓存
    await cache.invalidate("labels");
    success(res, { id: labelId }, "标签创建成功", 201);
  } catch (err) {
    // 并发下仍可能撞唯一索引（1062），转成友好提示而非 500
    if (isDuplicateEntryError(err)) {
      return error(res, "标签名称已存在", 409);
    }
    next(err);
  }
};

/**
 * 更新标签
 */
const updateLabel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { labelName } = req.body;

    const normalized = normalizeName(labelName);
    if (normalized.message) {
      return error(res, normalized.message, 400);
    }

    const label = await labelModel.getLabelById(id);
    if (!label) {
      return error(res, "标签不存在", 404);
    }

    // 改名时排除自身，否则单独改大小写以外的同名保存会误判为重名
    const existed = await labelModel.getLabelByName(normalized.name, id);
    if (existed) {
      return error(res, `标签「${normalized.name}」已存在`, 409);
    }

    const updated = await labelModel.updateLabel(id, normalized.name);
    if (!updated) {
      return error(res, "标签更新失败", 500);
    }

    await cache.invalidate("labels");
    success(res, null, "标签更新成功");
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return error(res, "标签名称已存在", 409);
    }
    next(err);
  }
};

/**
 * 删除标签
 */
const deleteLabel = async (req, res, next) => {
  try {
    const { id } = req.params;

    const label = await labelModel.getLabelById(id);
    if (!label) {
      return error(res, "标签不存在", 404);
    }

    const inUse = await labelModel.isLabelInUse(id);
    if (inUse) {
      return error(res, "标签被使用中，无法删除", 400);
    }

    const deleted = await labelModel.deleteLabel(id);
    if (!deleted) {
      return error(res, "标签删除失败", 500);
    }

    await cache.invalidate("labels");
    success(res, null, "标签删除成功");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
};
