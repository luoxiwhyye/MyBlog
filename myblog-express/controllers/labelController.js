const labelModel = require("../models/Label");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");
const cache = require("../middleware/cache");

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

    if (!labelName || labelName.trim() === "") {
      return error(res, "标签名称不能为空", 400);
    }

    const labelId = await labelModel.createLabel(labelName);
    cache.invalidate("labels");
    success(res, { id: labelId }, "标签创建成功", 201);
  } catch (err) {
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

    if (!labelName || labelName.trim() === "") {
      return error(res, "标签名称不能为空", 400);
    }

    const label = await labelModel.getLabelById(id);
    if (!label) {
      return error(res, "标签不存在", 404);
    }

    const updated = await labelModel.updateLabel(id, labelName);
    if (!updated) {
      return error(res, "标签更新失败", 500);
    }

    cache.invalidate("labels");
    success(res, null, "标签更新成功");
  } catch (err) {
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

    cache.invalidate("labels");
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
