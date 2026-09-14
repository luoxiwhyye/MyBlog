/**
 * 评论 / 留言内容「标记文本」协议与安全渲染
 *
 * 数据契约（关键决策）：
 *   - 提交时序列化为「标记文本」，**不存 HTML**：
 *       图片节点 → `[img:https://...]`
 *       段落 / 换行 → `\n`
 *       文本原样输出
 *   - 原因：① 后端 content 上限 1000 字符，HTML 标签会膨胀导致误判超长；
 *           ② 不存 HTML 就不扩大 XSS 面；③ 邮件通知与后台列表无需大改。
 *   - 边界：标记以 `[img:` 开头、`]` 结尾，故 **URL 内不能含 `]`**（正常 URL 不会）。
 *
 * 安全（前置条件）：
 *   评论 content 后端零转义、全项目无 DOMPurify，而评论区用 v-html。
 *   因此渲染时不「先拼 HTML 再过滤」，而是**标记白名单**：
 *   只有 `[img:http(s) URL]` 与 `@xxx` 会被转换，其余一律 HTML 转义。
 */

/** 图片标记：仅匹配 http(s) 且 URL 内不含空白或 `]` */
const IMG_MARKER = /\[img:(https?:\/\/[^\s\]]+)\]/gi;

/** 图片 URL 白名单（与 useEmoji / 后端校验一致） */
export const isEmojiImage = (content: string) =>
  /^https?:\/\/[^\s"'<>\\]+$/i.test((content || "").trim());

/** 安全的图片地址（http/https 且不含 `]`，避免标记歧义） */
const isSafeImageUrl = (url: string) => isEmojiImage(url) && !url.includes("]");

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** 转义 + @提及高亮（先转义再高亮，@ 不在转义字符内，顺序安全） */
const escapeAndMention = (text: string) =>
  escapeHtml(text).replace(
    /(@[^\s@,，。！？!?]+)/g,
    '<span class="mention">$1</span>',
  );

/**
 * 标记文本 → 安全 HTML（白名单渲染）
 * 仅识别 `[img:http(s)]` 图片与 `@xxx` 提及，其余全部转义。
 */
export const renderCommentContent = (markup?: string | null): string => {
  const content = markup || "";
  if (!content) return "";

  const parts: string[] = [];
  const re = new RegExp(IMG_MARKER.source, "gi");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(escapeAndMention(content.slice(lastIndex, match.index)));
    }
    const url = match[1];
    if (isSafeImageUrl(url)) {
      parts.push(
        `<img class="comment-markup-img" src="${escapeHtml(url)}" alt="表情" loading="lazy" />`,
      );
    } else {
      // 非法地址：退化为转义后的原样文本
      parts.push(escapeHtml(match[0]));
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(escapeAndMention(content.slice(lastIndex)));
  }
  return parts.join("");
};

/**
 * 标记文本 → 纯文本（用于后台列表 / 邮件通知等只看文字的场景）
 * 图片标记 → `[图片]`
 */
export const markupToPlain = (markup?: string | null): string => {
  const content = markup || "";
  return content.replace(IMG_MARKER, "[图片]");
};

/**
 * 收敛「标记文本」首尾的空段落残留（首尾连续的 `\n`）。
 *
 * 背景：`docToMarkup` 用 `\n` 连接**每一个**段落、空段落也参与，所以视觉上为空的
 * 文档会被序列化成 `"\n"` / `"\n\n"`。若不收敛，计数与前端判空都会把不可见的
 * 换行当成字符（历史缺陷：输入 1 个字却显示 `2 / 1000`、Backspace 删完仍清不掉）。
 *
 * 只收敛首尾 —— 段落之间的空行是用户有意敲出来的（Enter ×2），不能吃掉。
 */
export const normalizeMarkup = (markup?: string | null): string =>
  (markup || "").replace(/^\n+/, "").replace(/\n+$/, "");

/** 字数口径：按收敛后的标记文本长度计（后端 isLength 按 UTF-16 码元，emoji 计 2） */
export const countMarkupLength = (markup?: string | null): number =>
  normalizeMarkup(markup).length;

/** 是否含图片标记 */
export const hasImageMarkup = (markup?: string | null): boolean =>
  new RegExp(IMG_MARKER.source, "i").test(markup || "");

/**
 * 标记文本 → tiptap 文档 JSON
 * 供 CommentInput 编辑器初始化使用。
 */
export const markupToDoc = (markup?: string | null) => {
  const lines = (markup || "").split("\n");
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph",
      content: markupToInlineNodes(line),
    })),
  };
};

/** 单行标记文本 → 内联节点数组（文本 + 图片） */
export const markupToInlineNodes = (line: string) => {
  const nodes: Array<Record<string, unknown>> = [];
  const re = new RegExp(IMG_MARKER.source, "gi");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushText = (text: string) => {
    if (text) nodes.push({ type: "text", text });
  };

  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIndex) pushText(line.slice(lastIndex, match.index));
    if (isSafeImageUrl(match[1])) {
      nodes.push({ type: "image", attrs: { src: match[1] } });
    } else {
      pushText(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) pushText(line.slice(lastIndex));

  return nodes.length ? nodes : undefined;
};

/**
 * tiptap 文档 JSON → 标记文本
 * 供 CommentInput 在编辑器内容变化时序列化使用。
 */
export const docToMarkup = (doc: any): string => {
  if (!doc || !Array.isArray(doc.content)) return "";
  return normalizeMarkup(
    doc.content
      .map((node: any) => {
        if (node.type === "paragraph") {
          return inlineNodesToMarkup(node.content || []);
        }
        if (node.type === "image") {
          const src = node.attrs?.src;
          return isSafeImageUrl(src) ? `[img:${src}]` : "";
        }
        return "";
      })
      .join("\n"),
  );
};

/** 内联节点数组 → 单行标记文本 */
export const inlineNodesToMarkup = (nodes: any[]): string =>
  (nodes || [])
    .map((node) => {
      if (node.type === "text") return node.text || "";
      if (node.type === "image") {
        const src = node.attrs?.src;
        return isSafeImageUrl(src) ? `[img:${src}]` : "";
      }
      if (node.type === "hardBreak") return "\n";
      return "";
    })
    .join("");
