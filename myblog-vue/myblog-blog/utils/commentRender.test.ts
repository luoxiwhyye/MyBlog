import { describe, it, expect } from "vitest";
import {
  renderCommentContent,
  markupToPlain,
  countMarkupLength,
  normalizeMarkup,
  hasImageMarkup,
  markupToDoc,
  docToMarkup,
  isEmojiImage,
} from "./commentRender";

const IMG = "https://cdn.example.com/a.png";

describe("commentRender · 标记文本解析", () => {
  it("isEmojiImage 只认 http(s) 绝对地址", () => {
    expect(isEmojiImage(IMG)).toBe(true);
    expect(isEmojiImage("http://a.cn/x.png")).toBe(true);
    expect(isEmojiImage("javascript:alert(1)")).toBe(false);
    expect(isEmojiImage("data:image/png;base64,AAA")).toBe(false);
    expect(isEmojiImage("😀")).toBe(false);
  });

  it("图片标记渲染为 img 节点", () => {
    const html = renderCommentContent(`[img:${IMG}]`);
    expect(html).toContain(`<img class="comment-markup-img" src="${IMG}"`);
    expect(html).not.toContain("[img:");
  });

  it("@提及高亮，其余文本原样", () => {
    const html = renderCommentContent("@张三 你好");
    expect(html).toContain('<span class="mention">@张三</span>');
    expect(html).toContain("你好");
  });

  it("HTML 字符被转义（XSS 白名单渲染）", () => {
    const html = renderCommentContent("<script>alert(1)</script>");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("img 标签注入不会生效", () => {
    const html = renderCommentContent("<img src=x onerror=alert(1)>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  it("URL 含 ] 时标记失效，退化为转义文本（避免解析歧义）", () => {
    const html = renderCommentContent("[img:https://a.com/x]y.png]");
    // 标记内的 URL 到第一个 ] 结束 → 该段是合法 http(s)，剩余 `y.png]` 作为文本
    expect(html).toContain("<img");
    expect(html).toContain("y.png]");
  });

  it("非 http(s) 的伪协议标记退化为转义文本，不产出 img", () => {
    const html = renderCommentContent("[img:javascript:alert(1)]");
    expect(html).not.toContain("<img");
    expect(html).toContain("[img:javascript:alert(1)]");
  });

  it("多段落（\\n）与图片混排", () => {
    const html = renderCommentContent(`第一行\n[img:${IMG}]\n第三行`);
    expect(html).toContain("第一行");
    expect(html).toContain("第三行");
    expect(html.match(/<img/g)?.length).toBe(1);
  });

  it("空值安全", () => {
    expect(renderCommentContent("")).toBe("");
    expect(renderCommentContent(null)).toBe("");
    expect(renderCommentContent(undefined)).toBe("");
  });
});

describe("commentRender · 序列化", () => {
  it("docToMarkup：段落 → \\n，图片 → [img:url]", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "你好" }] },
        {
          type: "paragraph",
          content: [{ type: "image", attrs: { src: IMG } }],
        },
      ],
    };
    expect(docToMarkup(doc)).toBe(`你好\n[img:${IMG}]`);
  });

  it("docToMarkup 丢弃非法图片地址", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "image", attrs: { src: "javascript:x" } }],
        },
      ],
    };
    expect(docToMarkup(doc)).toBe("");
  });

  it("markupToDoc ↔ docToMarkup 往返一致", () => {
    const markup = `你好\n[img:${IMG}]\n(=^･ω･^=)`;
    const doc = markupToDoc(markup);
    expect(doc.content).toHaveLength(3);
    expect(docToMarkup(doc)).toBe(markup);
  });

  it("markupToPlain 把图片标记转为 [图片]", () => {
    expect(markupToPlain(`看这个[img:${IMG}]好看`)).toBe("看这个[图片]好看");
  });

  it("字数按标记文本长度计（含标记，emoji 计 2）", () => {
    expect(countMarkupLength(`[img:${IMG}]`)).toBe(IMG.length + 6);
    expect(countMarkupLength("😀")).toBe(2);
    expect(hasImageMarkup(`[img:${IMG}]`)).toBe(true);
    expect(hasImageMarkup("普通文本")).toBe(false);
  });
});

describe("commentRender · 空段落收敛（计数/判空的回归防线）", () => {
  it("normalizeMarkup 只收敛首尾换行，保留段落间的空行", () => {
    expect(normalizeMarkup("")).toBe("");
    expect(normalizeMarkup(null)).toBe("");
    expect(normalizeMarkup("\n")).toBe("");
    expect(normalizeMarkup("\n\n")).toBe("");
    expect(normalizeMarkup("a\n")).toBe("a");
    expect(normalizeMarkup("\na")).toBe("a");
    expect(normalizeMarkup("a\n\nb")).toBe("a\n\nb");
  });

  it("docToMarkup 不把尾部空段落序列化成多余的 \\n", () => {
    const p = (text?: string) =>
      text === undefined
        ? { type: "paragraph" }
        : { type: "paragraph", content: [{ type: "text", text }] };
    // 历史缺陷：编辑器多出一个空段落 → "a\n" → 计数器显示 2 / 1000
    expect(docToMarkup({ type: "doc", content: [p("a"), p()] })).toBe("a");
    expect(docToMarkup({ type: "doc", content: [p(), p("a")] })).toBe("a");
    // 视觉为空（删完所有可见字符）必须是空串，否则 Backspace 永远清不掉
    expect(docToMarkup({ type: "doc", content: [p()] })).toBe("");
    expect(docToMarkup({ type: "doc", content: [p(), p(), p()] })).toBe("");
    // 用户有意敲的空行（段落之间）不能吃
    expect(docToMarkup({ type: "doc", content: [p("a"), p(), p("b")] })).toBe(
      "a\n\nb",
    );
  });

  it("计数与序列化同口径（收敛后才算字数）", () => {
    expect(countMarkupLength("a\n")).toBe(1);
    expect(countMarkupLength("\n")).toBe(0);
    expect(countMarkupLength("a\n\nb")).toBe(4);
  });
});
