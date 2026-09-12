import { describe, it, expect } from "vitest";
import { escapeHtml, highlightKeyword } from "./searchHighlight";

describe("searchHighlight · HTML 转义", () => {
  it("转义全部危险字符", () => {
    expect(escapeHtml(`<img src="x" onerror='y'>&`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;y&#39;&gt;&amp;",
    );
  });

  it("空值不抛错", () => {
    expect(escapeHtml(undefined as unknown as string)).toBe("");
    expect(escapeHtml(null as unknown as string)).toBe("");
  });
});

describe("searchHighlight · 关键词高亮", () => {
  it("命中处包 mark，大小写不敏感且保留原文大小写", () => {
    expect(highlightKeyword("Hello World", "world")).toBe(
      "Hello <mark>World</mark>",
    );
  });

  it("关键词为空时只转义、不加 mark", () => {
    expect(highlightKeyword("a<b", "")).toBe("a&lt;b");
    expect(highlightKeyword("a<b", "   ")).toBe("a&lt;b");
  });

  it("标题里的 HTML 被转义，不会注入标签", () => {
    const html = highlightKeyword("<img src=x onerror=alert(1)>", "img");
    expect(html).not.toContain("<img");
    expect(html.startsWith("&lt;")).toBe(true);
    expect(html).toContain("<mark>img</mark>");
  });

  it("关键词里的正则元字符按字面量匹配", () => {
    // "." 不应匹配任意字符
    expect(highlightKeyword("a.b axb", ".")).toBe("a<mark>.</mark>b axb");
    expect(highlightKeyword("1+1", "+")).toBe("1<mark>+</mark>1");
    expect(highlightKeyword("f(x)", "(x)")).toBe("f<mark>(x)</mark>");
  });

  it("关键词里的特殊字符走同一套转义，能命中转义后的文本", () => {
    // 文本 "<a>" 转义为 "&lt;a&gt;"，关键词 "<a>" 同样转义，故可命中
    expect(highlightKeyword("<a>", "<a>")).toBe("<mark>&lt;a&gt;</mark>");
    // "&" 场景
    expect(highlightKeyword("A & B", "&")).toBe("A <mark>&amp;</mark> B");
  });

  it("同一关键词多次出现全部高亮", () => {
    expect(highlightKeyword("tag tag", "tag")).toBe(
      "<mark>tag</mark> <mark>tag</mark>",
    );
  });

  it("中文关键词命中", () => {
    expect(highlightKeyword("如何用设计 Token 统一前后台", "设计")).toBe(
      "如何用<mark>设计</mark> Token 统一前后台",
    );
  });
});
