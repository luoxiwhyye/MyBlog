const typeModel = require("../models/Type");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");

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

    if (!typeName || typeName.trim() === "") {
      return error(res, "分类名称不能为空", 400);
    }

    const typeId = await typeModel.createType(typeName);
    success(res, { id: typeId }, "分类创建成功", 201);
  } catch (err) {
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

    if (!typeName || typeName.trim() === "") {
      return error(res, "分类名称不能为空", 400);
    }

    const type = await typeModel.getTypeById(id);
    if (!type) {
      return error(res, "分类不存在", 404);
    }

    const updated = await typeModel.updateType(id, typeName);
    if (!updated) {
      return error(res, "分类更新失败", 500);
    }

    success(res, null, "分类更新成功");
  } catch (err) {
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
