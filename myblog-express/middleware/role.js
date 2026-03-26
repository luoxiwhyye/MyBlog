const { error } = require("../utils/response");

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return error(res, "权限不足", 403);
    }
    next();
  };
};

module.exports = { requireRole };
