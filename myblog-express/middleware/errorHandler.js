const inspect = require("util").inspect;

module.exports = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== "production";

  const statusCode = err.statusCode || 500;

  // 生产环境不暴露原始错误信息，避免 SQL/连接错误等敏感信息泄露；
  // 统一返回通用文案（与 response.error() 的商品文案一致）。
  const message =
    isDevelopment || statusCode < 500
      ? err.message || "请求处理失败"
      : "服务器内部错误";

  // 统一响应结构：{ code, message, data }（与 utils/response.js 的 error() 完全一致）
  const response = {
    code: statusCode,
    message,
    data: null,
  };

  // 开发环境包含错误堆栈信息（便于排查）
  if (isDevelopment) {
    response.stack = err.stack;
  }

  // 生产环境仍完整记录原始错误到服务端日志（不发给客户端）
  if (!isDevelopment) {
    console.error(
      `[errorHandler] ${statusCode} ${err.message || ""}`,
      inspect(err),
    );
  }

  res.status(statusCode).json(response);
};
