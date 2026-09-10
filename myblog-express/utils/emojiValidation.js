/**
 * 表情内容 / 分组标识 共用校验
 *
 * 「表情内容」与「分组标识（cover）」属于同规则字段，必须共用同一套规则：
 *   - 含 `:` / `/` / `.`（疑似协议或 URL）时，必须是 http(s) 绝对地址
 *     （拦掉 javascript: / data: / vbscript: 等危险协议）
 *   - 纯文本表情（Emoji / 颜文字）允许任意 Unicode，但禁止 HTML 标记字符
 *     `< > " ' \``（前端默认转义，这里只做源头收窄）
 *
 * 上轮回归教训：只给表情内容加校验、漏了分组标识，导致 `javascript:` 被成功建组。
 * 因此两处必须调用同一个函数。
 */

// 图片 URL 白名单（仅 http/https，无引号/尖括号/空白）
const URL_PATTERN = /^https?:\/\/[^\s"'<>\\]+$/i;
// 危险 HTML 字符（防 XSS）
const UNSAFE_CHARS = /[<>"'`]/;

const isHttpUrl = (value) =>
  typeof value === "string" && URL_PATTERN.test(value);

/**
 * 校验「文本或图片 URL」类字段。
 * @param {string} value 待校验内容
 * @param {object} [options]
 * @param {number} [options.maxLength=500] 最大长度
 * @param {string} [options.label='内容'] 字段名（用于错误提示）
 * @returns {string|null} 返回错误信息字符串；通过则返回 null
 */
const validateTextOrImageUrl = (value, options = {}) => {
  const { maxLength = 500, label = "内容" } = options;

  if (!value || typeof value !== "string") {
    return `${label}不能为空`;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return `${label}不能为空`;
  }
  if (trimmed.length > maxLength) {
    return `${label}过长（≤${maxLength} 字符）`;
  }

  // 形似协议 / URL 的：必须是 http(s)，否则拒绝（防 javascript:/data:/vbscript: 等）
  if (trimmed.includes(":") || trimmed.includes("/") || trimmed.includes(".")) {
    if (!isHttpUrl(trimmed)) {
      return "图片 URL 格式不正确（仅支持 http/https）";
    }
    return null;
  }

  // 纯文本：不允许出现 HTML 危险字符
  if (UNSAFE_CHARS.test(trimmed)) {
    return `${label}包含非法字符（不允许 HTML 标记字符）`;
  }
  return null;
};

/** 依据内容自动判定表情类型：http(s) URL → image，否则回退到传入类型 */
const resolveEmojiType = (content, type) => {
  if (isHttpUrl((content || "").trim())) {
    return "image";
  }
  return type || "emoji";
};

module.exports = {
  URL_PATTERN,
  UNSAFE_CHARS,
  isHttpUrl,
  validateTextOrImageUrl,
  resolveEmojiType,
};
