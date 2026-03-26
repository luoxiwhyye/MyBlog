/**
 * 统一响应格式函数
 */

const success = (res, data = null, message = "操作成功", code = 200) => {
  res.status(code).json({
    code,
    message,
    data,
  });
};

const error = (res, message = "操作失败", code = 500) => {
  res.status(code).json({
    code,
    message,
    data: null,
  });
};

module.exports = {
  success,
  error,
};
