const typeModel = require("../models/Type");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");
const { isDuplicateEntryError } = require("../utils/dbErrors");
const cache = require("../middleware/cache");

// 与 type.type_name 的 varchar(50) 对齐
const MAX_NAME_LENGTH = 50;

/** 规范化名称：非字符串/纯空白视为空；返回 { name } 或 { message } */
const normalizeName = (raw) => {
  const name = typeof raw === "string" ? raw.trim() : "";
  if (!name) {
    return { message: "分类名称不能为空" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { message: `分类名称过长（≤${MAX_NAME_LENGTH} 字符）` };
  }
  return { name };
};

/**
 * 获取分类列表
 */
const getTypes = async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = getPaginationParams(req);

    const types = await typeModel.getTypes(offset, limit);
    const total = await typeModel.getTypesCount();

    // 为每个分类添加文章数量
    for (const type of types) {
      type.articleCount = await typeModel.getTypeArticleCount(type.id);
    }

    success(res, getPaginationData(types, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

/**
 * 创建分类
 */
const createType = async (req, res, next) => {
  try {
    const { typeName } = req.body;

    const normalized = normalizeName(typeName);
    if (normalized.message) {
      return error(res, normalized.message, 400);
    }

    // 禁止重名（唯一索引外的第一层防护，报错更友好）
    const existed = await typeModel.getTypeByName(normalized.name);
    if (existed) {
      return error(res, `分类「${normalized.name}」已存在`, 409);
    }

    const typeId = await typeModel.createType(normalized.name);
    await cache.invalidate("types");
    success(res, { id: typeId }, "分类创建成功", 201);
  } catch (err) {
    // 并发下仍可能撞唯一索引（1062），转成友好提示而非 500
    if (isDuplicateEntryError(err)) {
      return error(res, "分类名称已存在", 409);
    }
    next(err);
  }
};

/**
 * 更新分类
 */
const updateType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { typeName } = req.body;

    const normalized = normalizeName(typeName);
    if (normalized.message) {
      return error(res, normalized.message, 400);
    }

    const type = await typeModel.getTypeById(id);
    if (!type) {
      return error(res, "分类不存在", 404);
    }

    // 改名时排除自身
    const existed = await typeModel.getTypeByName(normalized.name, id);
    if (existed) {
      return error(res, `分类「${normalized.name}」已存在`, 409);
    }

    const updated = await typeModel.updateType(id, normalized.name);
    if (!updated) {
      return error(res, "分类更新失败", 500);
    }

    await cache.invalidate("types");
    success(res, null, "分类更新成功");
  } catch (err) {
    if (isDuplicateEntryError(err)) {
      return error(res, "分类名称已存在", 409);
    }
    next(err);
  }
};

/**
 * 删除分类
 */
const deleteType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await typeModel.getTypeById(id);
    if (!type) {
      return error(res, "分类不存在", 404);
    }

    const inUse = await typeModel.isTypeInUse(id);
    if (inUse) {
      return error(res, "分类下有文章，无法删除", 400);
    }

    const deleted = await typeModel.deleteType(id);
    if (!deleted) {
      return error(res, "分类删除失败", 500);
    }

    await cache.invalidate("types");
    success(res, null, "分类删除成功");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTypes,
  createType,
  updateType,
  deleteType,
};
