const { error } = require("../utils/response");

/**
 * 请求内容类型守卫（用于「读取请求体」的写接口）。
 *
 * 背景：`express.json()` / `express.urlencoded()` 只解析与自己的 `type` 匹配的请求，
 * 其它类型（如 `text/plain`）下 `req.body` 是 **undefined**，于是控制器里
 * `const { title } = req.body` 直接抛 TypeError → 500。
 * 但这是**客户端**错误（请求格式对、内容类型不被支持），返回 500 会把客户端错
 * 计入错误率指标，也与 Spring 侧的 415 不一致。
 *
 * 语义（对齐 Spring 的 `HttpMediaTypeNotSupportedException`）：只放行
 * `application/json` / `application/x-www-form-urlencoded` / `multipart/form-data`，
 * 其余返回 **415**，文案与 Spring 逐字一致。
 *
 * ⚠️ 必须挂在**鉴权之后**：Spring 的安全过滤器在 DispatcherServlet **之前**，
 *    未鉴权的请求在那里就被拦成 403 了；挂早了会让「未鉴权 + 错类型」
 *    在 Express 得到 415、在 Spring 得到 403（不一致）。
 * ⚠️ 只给「会读请求体」的写接口使用 —— GET / DELETE 不带 body，
 * 缺 Content-Type 是正常的，挂了会误报 415。
 */
const SUPPORTED = [
  "application/json",
  "application/x-www-form-urlencoded",
  "multipart/form-data",
];

const requireWritableContentType = (req, res, next) => {
  // req.is() 在「没有请求体」时返回 null，在类型不匹配时返回 false
  const matched = SUPPORTED.some((type) => req.is(type));
  if (matched) return next();
  return error(res, "不支持的请求内容类型", 415);
};

module.exports = requireWritableContentType;
