/**
 * 搜索关键词高亮（命令面板）
 *
 * 做法是「先 HTML 转义、再包裹 <mark>」，因此结果可以安全交给 v-html：
 * 文章标题是用户内容，若先包裹再转义会把 <mark> 一起转义掉；
 * 若先转义再包裹且用正则匹配原始关键词，则标题里的 `<script>` 会被当标签注入。
 */

/** HTML 转义（含引号，避免属性场景下越界） */
export const escapeHtml = (input: string): string =>
  String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** 转义正则元字符，避免关键词里的 . * + ( ) 等被当成模式 */
const escapeRegExp = (input: string): string =>
  input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * 把 text 中出现的关键词包成 <mark>，其余部分保持转义后的原样。
 *
 * 关键词与文本走同一套转义，所以 `&`、`<` 这类字符也能正确命中
 * （文本里的 `&` 会变成 `&amp;`，关键词里的 `&` 同样是 `&amp;`）。
 */
export const highlightKeyword = (text: string, keyword: string): string => {
  const safeText = escapeHtml(text);
  const rawKeyword = String(keyword ?? "").trim();
  if (!rawKeyword) return safeText;

  const pattern = escapeRegExp(escapeHtml(rawKeyword));
  return safeText.replace(
    new RegExp(pattern, "gi"),
    (matched) => `<mark>${matched}</mark>`,
  );
};
