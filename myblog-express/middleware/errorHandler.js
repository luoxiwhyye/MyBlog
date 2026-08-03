module.exports = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== "production";

  const statusCode = err.statusCode || 500;
  const message = err.message || "服务器内部错误";

  const response = {
    code: statusCode,
    message,
  };

  // 开发环境包含错误堆栈信息
  if (isDevelopment) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
