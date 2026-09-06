const clientErrorLogModel = require("../models/ClientErrorLog");
const { success, error } = require("../utils/response");
const {
  getPaginationParams,
  getPaginationData,
} = require("../utils/pagination");

// 接收前端上报（公开；限流由路由层控制）。只做长度截断，不落敏感信息。
const MAX_LEN = 2000;

const truncate = (value, max = MAX_LEN) =>
  value && typeof value === "string" ? value.slice(0, max) : "";

/**
 * 接收前端错误上报（公开，限流）
 */
const createErrorLog = async (req, res, next) => {
  try {
    const { title, message, source, line, col, url, component, ua } =
      req.body || {};

    if (!message && !title) {
      return error(res, "缺少错误信息", 400);
    }

    const id = await clientErrorLogModel.create({
      title: truncate(title, 120),
      message: truncate(message),
      source: truncate(source, 500),
      line: Number.isFinite(Number(line)) ? Number(line) : null,
      col: Number.isFinite(Number(col)) ? Number(col) : null,
      url: truncate(url, 500),
      component: truncate(component, 200),
      ua: truncate(ua, 500),
    });

    success(res, { id }, "上报成功", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 获取错误日志列表（需管理员）
 */
const getErrorLogs = async (req, res, next) => {
  try {
    const { page, pageSize, offset, limit } = getPaginationParams(req);
    const filters = {};
    if (req.query.type) filters.type = req.query.type;

    const logs = await clientErrorLogModel.getList(offset, limit, filters);
    const total = await clientErrorLogModel.getListCount(filters);

    success(res, getPaginationData(logs, total, page, pageSize));
  } catch (err) {
    next(err);
  }
};

/**
 * 清空错误日志（需管理员）
 */
const clearErrorLogs = async (req, res, next) => {
  try {
    const affected = await clientErrorLogModel.clearAll();
    success(res, { affected }, `已清空 ${affected} 条错误日志`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createErrorLog,
  getErrorLogs,
  clearErrorLogs,
};
