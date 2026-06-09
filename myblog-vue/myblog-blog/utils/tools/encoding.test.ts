import { describe, it, expect } from "vitest";
import { encodeBase64, decodeBase64, encodeUrl, decodeUrl } from "./encoding";

describe("Base64 编解码", () => {
  it("正常英文字符串", () => {
    const input = "Hello, World!";
    const encoded = encodeBase64(input);
    expect(decodeBase64(encoded)).toBe(input);
  });

  it("中文字符串", () => {
    const input = "你好世界";
    const encoded = encodeBase64(input);
    expect(decodeBase64(encoded)).toBe(input);
  });

  it("空字符串返回空", () => {
    expect(decodeBase64("")).toBe("");
  });

  it("Emoji 编解码", () => {
    const input = "Hello 👋🌍";
    const encoded = encodeBase64(input);
    expect(decodeBase64(encoded)).toBe(input);
  });
});

describe("URL 编解码", () => {
  it("普通 URL 编解码", () => {
    const input = "hello world & more";
    const encoded = encodeUrl(input);
    expect(decodeUrl(encoded)).toBe(input);
  });

  it("中文字符 URL 编解码", () => {
    const input = "搜索关键词";
    const encoded = encodeUrl(input);
    expect(decodeUrl(encoded)).toBe(input);
  });
});
