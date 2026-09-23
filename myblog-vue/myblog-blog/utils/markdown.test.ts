import { describe, it, expect } from "vitest";
import {
  looksLikeMarkdown,
  markdownToPlain,
  renderArticleContent,
} from "./markdown";

const TABLE_MD = [
  "| 键 | 情况 |",
  "| --- | --- |",
  "| `A_B` | 全项目零引用 |",
].join("\n");

describe("markdown 工具", () => {
  describe("renderArticleContent 的表格处理", () => {
    it("Markdown 表格被套上滚动容器", () => {
      const html = renderArticleContent(TABLE_MD, "markdown");

      expect(html).toContain('<div class="table-wrap"><table>');
      expect(html).toContain("</table></div>");
    });

    it("HTML 格式正文里的表格同样被套上（两种格式都在这里汇合）", () => {
      const html = renderArticleContent(
        "<table><tr><td>a</td></tr></table>",
        "html",
      );

      expect(html).toBe(
        '<div class="table-wrap"><table><tr><td>a</td></tr></table></div>',
      );
    });

    it("同一篇里多个表格逐个包好，不带表格的内容不引入多余容器", () => {
      const html = renderArticleContent(
        `${TABLE_MD}\n\n正文一段。\n\n${TABLE_MD}`,
        "markdown",
      );

      expect(html.match(/<div class="table-wrap">/g)).toHaveLength(2);
      expect(renderArticleContent("只有一段正文。", "markdown")).toBe(
        "<p>只有一段正文。</p>\n",
      );
    });

    it("包裹表格不影响正文图片 URL 的归一化", () => {
      const html = renderArticleContent(
        `${TABLE_MD}\n\n![图](http://localhost:3000/uploads/a.jpg)`,
        "markdown",
      );

      expect(html).toContain('src="/uploads/a.jpg"');
      expect(html).not.toContain("localhost:3000");
    });

    it("空内容返回空串", () => {
      expect(renderArticleContent("", "markdown")).toBe("");
      expect(renderArticleContent()).toBe("");
    });
  });

  describe("looksLikeMarkdown", () => {
    it("命中块级语法（含表格）", () => {
      expect(looksLikeMarkdown(TABLE_MD)).toBe(true);
      expect(looksLikeMarkdown("# 标题")).toBe(true);
      expect(looksLikeMarkdown("```\ncode\n```")).toBe(true);
    });

    it("纯富文本段落不误判为 Markdown", () => {
      expect(looksLikeMarkdown("<p>一段普通正文，没有块级语法。</p>")).toBe(
        false,
      );
      expect(looksLikeMarkdown("")).toBe(false);
    });
  });

  describe("markdownToPlain", () => {
    it("剥离标签、语法符号与多余空白", () => {
      expect(markdownToPlain("# 标题\n\n- 列表项 `code`")).toBe(
        "标题 列表项 code",
      );
      expect(markdownToPlain("<p>正文</p>")).toBe("正文");
      expect(markdownToPlain()).toBe("");
    });
  });
});
