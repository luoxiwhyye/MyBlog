// ============================================
// utils/markdown.ts - 前台 Markdown 渲染工具
// 后台可在「富文本 / Markdown」两种模式写作。
// 前台在此对文章内容做「自动识别 + 渲染」：
//   - 检测到 Markdown 块级语法时，用 markdown-it 渲染为 HTML
//   - 否则按既有 HTML 原样输出（兼容旧富文本文章）
// ============================================
import MarkdownIt from "markdown-it";
import { normalizeContentUrls } from "~/utils/image";

// 单例 markdown-it（html 关闭 -> 对 <script> 等安全；linkify 开启）
const md = new MarkdownIt({
  html: false, // 不解析 HTML，防 XSS（文章内容可含图片 URL，交由下游归一化）
  linkify: true,
  breaks: true,
});

/**
 * 判断一段内容是否包含 Markdown 块级语法特征。
 * 用于「按内容自动识别」：命中才渲染，否则按 HTML 原样输出。
 * 注意：不能因为内容含 HTML 标签就判定为非 Markdown——
 * 富文本编辑器常用 <p> 包裹内容，此时应正向检测 Markdown 语法。
 */
export const looksLikeMarkdown = (content?: string): boolean => {
  if (!content) return false;

  // 先剥离 HTML 标签，避免富文本 <p> 前缀干扰 Markdown 语法检测
  const text = content.replace(/<[^>]+>/g, "");
  if (!text.trim()) return false;

  // 正向检测 Markdown 块级语法（标题/列表/引用/代码块/表格/分隔线/任务列表）
  return /(^|\n)\s{0,4}(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```|\|(?=.*\|)|---($|\n)|\[[ x]\]\s)/m.test(
    text,
  );
};

/**
 * 渲染正文：根据内容自动识别是否用 Markdown 渲染，输出 HTML。
 * 渲染后再归一化正文中的图片 URL（localhost -> 相对路径）。
 */
export const renderArticleContent = (content?: string): string => {
  if (!content) return "";
  const html = looksLikeMarkdown(content)
    ? md.render(unwrapRichText(content))
    : content;
  return normalizeContentUrls(html);
};

/**
 * 部分编辑器（如 Quill）会把整体内容用 <p>...</p> 包裹，或把 Markdown 符号转义成
 * &gt; / &amp;quot; 等实体。识别为 Markdown 后，先把它还原成纯 Markdown 语句再渲染。
 * 仅在内容整体是一个被 <p> 包裹的文本（无其它突出块级标签）时清理。
 */
const unwrapRichText = (content?: string): string => {
  if (!content) return "";
  let text = content;

  // 还原常见转义实体（Quill/HTML 输出）
  text = text
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 若整体只是一个 <p>...</p> 包裹（无其它真实块级富文本标签），剥掉该包裹
  const wrapped = text.match(/^\s*<p[^>]*>([\s\S]*?)<\/p>\s*$/i);
  if (wrapped) {
    text = wrapped[1];
  }

  // 去掉段落标签（可能仍是 <p>...</p> 包裹多个段落）
  text = text.replace(/<\/?p[^>]*>/gi, "\n");

  return text.trim();
};

/**
 * 将 Markdown/富文本内容转为纯文本（用于摘要、卡片标题等元信息展示）。
 * 剥离 Markdown 语法符号与 HTML 标签。
 */
export const markdownToPlain = (content?: string): string => {
  if (!content) return "";
  let text = content;

  // 还原转义实体
  text = text
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 去掉 HTML 标签
  text = text.replace(/<[^>]+>/g, " ");

  // 剥离 Markdown 语法
  text = text
    .replace(/```[^\n`]*\n?/g, "\n") // 代码块围栏
    .replace(/\s{0,3}#{1,6}\s+/g, " ") // 标题 #（允许前导空白）
    .replace(/\s{0,3}>\s?/g, " ") // 引用 >
    .replace(/\s{0,3}[-*+]\s+/g, " ") // 无序列表
    .replace(/\s{0,3}\d+\.\s+/g, " ") // 有序列表
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // 图片 ![alt](url)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // 链接 [text](url)
    .replace(/(\*\*|__)(.*?)\1/g, "$2") // 加粗
    .replace(/(\*|_)(.*?)\1/g, "$2") // 斜体
    .replace(/`([^`]+)`/g, "$1") // 行内代码
    .replace(/~~(.*?)~~/g, "$1") // 删除线
    // 分隔线（---/***/___）：原写法末尾 * 可匹配空串，会在每个字符间插入空格，务必修复
    .replace(/(?:^|\n)\s*(?:-{3,}|\*{3,}|_{3,})\s*(?=\n|$)/g, " ");

  // 合并空白
  return text.replace(/\s+/g, " ").trim();
};
