import { describe, it, expect } from "vitest";
import {
  buildSrcSet,
  getThumbWebpUrl,
  getWebpUrl,
  normalizeAssetUrl,
  toSiteAbsoluteUrl,
} from "./image";

describe("image 工具", () => {
  describe("normalizeAssetUrl", () => {
    it("把 localhost / 127.0.0.1 前缀归一化为相对路径", () => {
      expect(normalizeAssetUrl("http://localhost:3000/uploads/a.jpg")).toBe(
        "/uploads/a.jpg",
      );
      expect(normalizeAssetUrl("https://127.0.0.1/uploads/a.jpg")).toBe(
        "/uploads/a.jpg",
      );
      expect(normalizeAssetUrl("http://LOCALHOST:8080/uploads/a.jpg")).toBe(
        "/uploads/a.jpg",
      );
    });

    it("其他 URL 与相对路径原样返回，空值返回空串", () => {
      expect(normalizeAssetUrl("https://cdn.example.com/a.jpg")).toBe(
        "https://cdn.example.com/a.jpg",
      );
      expect(normalizeAssetUrl("/uploads/a.jpg")).toBe("/uploads/a.jpg");
      expect(normalizeAssetUrl()).toBe("");
    });
  });

  describe("getThumbWebpUrl / getWebpUrl", () => {
    it("栅格图按扩展名派生变体，保留 query", () => {
      expect(getThumbWebpUrl("/uploads/a.jpg")).toBe("/uploads/a_thumb.webp");
      expect(getThumbWebpUrl("/uploads/a.PNG?t=1")).toBe(
        "/uploads/a_thumb.webp?t=1",
      );
      expect(getWebpUrl("/uploads/a.jpeg")).toBe("/uploads/a.webp");
      expect(getWebpUrl("/uploads/a.gif")).toBe("/uploads/a.webp");
    });

    it("已是 webp / avif 的原图不派生（后端不重复转换）", () => {
      expect(getThumbWebpUrl("/uploads/a.webp")).toBe("/uploads/a.webp");
      expect(getWebpUrl("/uploads/a.webp")).toBe("/uploads/a.webp");
      expect(getThumbWebpUrl("/uploads/a.avif")).toBe("/uploads/a.avif");
      expect(getWebpUrl("/uploads/a.avif")).toBe("/uploads/a.avif");
    });

    it("矢量图与无扩展名的 URL 不派生（否则必然 404）", () => {
      expect(getThumbWebpUrl("/favicon.svg")).toBe("/favicon.svg");
      expect(getWebpUrl("/favicon.svg")).toBe("/favicon.svg");
      expect(getThumbWebpUrl("/uploads/abc123")).toBe("/uploads/abc123");
    });

    it("空值返回空串", () => {
      expect(getThumbWebpUrl("")).toBe("");
      expect(getWebpUrl()).toBe("");
    });
  });

  describe("buildSrcSet", () => {
    it("可派生的原图给出 400w / 1200w 两个候选", () => {
      const result = buildSrcSet("/uploads/a.jpg");
      expect(result.src).toBe("/uploads/a.webp");
      expect(result.srcset).toBe(
        "/uploads/a_thumb.webp 400w, /uploads/a.webp 1200w",
      );
      expect(result.sizes).toBe("100vw");
    });

    it("派生不出第二个尺寸时退化为单一来源（srcset 为空）", () => {
      for (const url of ["/uploads/a.webp", "/favicon.svg"]) {
        const result = buildSrcSet(url);
        expect(result.src).toBe(url);
        expect(result.srcset).toBe("");
      }
    });

    it("空值返回空 src 与空 srcset", () => {
      expect(buildSrcSet()).toEqual({ src: "", srcset: "", sizes: "100vw" });
    });
  });

  describe("toSiteAbsoluteUrl", () => {
    const SITE = "https://blog.example.com";

    it("上传资源一律取站点域名，忽略后端源", () => {
      // 库里存的是后端拼的绝对地址；直接 new URL(值, siteUrl) 会保留后端域名
      expect(
        toSiteAbsoluteUrl("http://localhost:3000/uploads/a.jpg", SITE),
      ).toBe("https://blog.example.com/uploads/a.jpg");
      expect(
        toSiteAbsoluteUrl("https://api.example.com/uploads/a.jpg", SITE),
      ).toBe("https://blog.example.com/uploads/a.jpg");
      expect(toSiteAbsoluteUrl("/uploads/a.jpg", SITE)).toBe(
        "https://blog.example.com/uploads/a.jpg",
      );
    });

    it("保留查询串，切掉上传路径之后的其它部分", () => {
      expect(toSiteAbsoluteUrl("/uploads/article/cover/a.jpg?v=2", SITE)).toBe(
        "https://blog.example.com/uploads/article/cover/a.jpg?v=2",
      );
    });

    it("非上传地址按 siteUrl 解析（相对路径）或原样保留（外链）", () => {
      expect(toSiteAbsoluteUrl("/favicon.svg", SITE)).toBe(
        "https://blog.example.com/favicon.svg",
      );
      expect(toSiteAbsoluteUrl("https://cdn.example.com/a.png", SITE)).toBe(
        "https://cdn.example.com/a.png",
      );
    });

    it("空值与非法值有兜底", () => {
      expect(toSiteAbsoluteUrl("", SITE)).toBe("");
      expect(toSiteAbsoluteUrl(undefined, SITE)).toBe("");
      expect(toSiteAbsoluteUrl("/uploads/a.jpg")).toBe("/uploads/a.jpg");
    });
  });
});
