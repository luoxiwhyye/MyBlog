const jwt = require("jsonwebtoken");
const { secret } = require("../config/jwt");
const { error } = require("../utils/response");

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return error(res, "缺少授权token", 401);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return error(res, "token已过期", 401);
    }
    if (err.name === "JsonWebTokenError") {
      return error(res, "token无效", 401);
    }
    return error(res, "认证失败", 401);
  }
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
  } catch (err) {
    // 如果 token 无效或过期，仍然允许继续访问公开接口。
  }

  next();
};

module.exports = auth;
module.exports.optionalAuth = optionalAuth;
