/**
 * 分页工具函数
 */

const getPaginationParams = (req) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(req.query.pageSize) || 10),
  );
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  return {
    page,
    pageSize,
    offset,
    limit,
  };
};

const getPaginationData = (list, total, page, pageSize) => {
  return {
    list,
    total,
    page,
    pageSize,
  };
};

module.exports = {
  getPaginationParams,
  getPaginationData,
};
