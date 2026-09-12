import { describe, it, expect } from "vitest";
import { parseSocialLinks, resolveSocialAction } from "./socialLinks";

describe("socialLinks 工具", () => {
  describe("parseSocialLinks", () => {
    it("解析合法数组并保留 name / url / icon / action", () => {
      const raw = JSON.stringify([
        { name: "GitHub", url: "https://github.com/", icon: "github" },
        { name: "邮箱", url: "a@b.com", icon: "email", action: "copy" },
      ]);
      expect(parseSocialLinks(raw)).toEqual([
        { name: "GitHub", url: "https://github.com/", icon: "github" },
        { name: "邮箱", url: "a@b.com", icon: "email", action: "copy" },
      ]);
    });

    it("丢弃缺少 name 或 url 的条目", () => {
      const raw = JSON.stringify([
        { name: "有名字", url: "https://a.com" },
        { name: "", url: "https://b.com" },
        { name: "没有链接" },
        { url: "https://c.com" },
        null,
      ]);
      expect(parseSocialLinks(raw)).toHaveLength(1);
      expect(parseSocialLinks(raw)[0].name).toBe("有名字");
    });

    it("非法输入（空 / 非 JSON / 非数组）一律返回空数组", () => {
      expect(parseSocialLinks()).toEqual([]);
      expect(parseSocialLinks(null)).toEqual([]);
      expect(parseSocialLinks("")).toEqual([]);
      expect(parseSocialLinks("not-json")).toEqual([]);
      expect(parseSocialLinks('{"name":"x"}')).toEqual([]);
      expect(parseSocialLinks("[]")).toEqual([]);
    });

    it("不输出 undefined 字段（避免污染写回的 JSON）", () => {
      const [item] = parseSocialLinks(
        JSON.stringify([{ name: "A", url: "https://a.com" }]),
      );
      expect(Object.keys(item)).toEqual(["name", "url"]);
      expect("icon" in item).toBe(false);
      expect("action" in item).toBe(false);
    });

    it("忽略非法的 action 取值", () => {
      const [item] = parseSocialLinks(
        JSON.stringify([{ name: "A", url: "https://a.com", action: "mailto" }]),
      );
      expect("action" in item).toBe(false);
    });
  });

  describe("resolveSocialAction", () => {
    it("显式配置优先于默认推导", () => {
      // 邮箱默认复制，但显式写了 link 就应跳转
      expect(
        resolveSocialAction({
          name: "邮箱",
          url: "a@b.com",
          icon: "email",
          action: "link",
        }),
      ).toBe("link");
      // 反之 GitHub 显式写 copy 也应复制
      expect(
        resolveSocialAction({
          name: "GitHub",
          url: "https://github.com",
          action: "copy",
        }),
      ).toBe("copy");
    });

    it("未配置时：邮箱默认复制，其余默认跳转", () => {
      expect(
        resolveSocialAction({ name: "邮箱", url: "a@b.com", icon: "email" }),
      ).toBe("copy");
      expect(
        resolveSocialAction({ name: "GitHub", url: "u", icon: "github" }),
      ).toBe("link");
      // 无 icon 的条目按跳转处理
      expect(resolveSocialAction({ name: "个人站", url: "u" })).toBe("link");
    });
  });
});
