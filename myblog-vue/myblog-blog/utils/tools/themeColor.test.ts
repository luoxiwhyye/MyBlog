import { describe, it, expect } from "vitest";
import {
  DEFAULT_THEME_COLOR_VALUE,
  THEME_COLOR_PRESETS,
  resolveThemeColor,
  computeElementPlusLevels,
  buildThemeColorCss,
} from "../themeColor";

describe("themeColor 工具", () => {
  it("未配置（无输入）回退到当前设计石墨青", () => {
    const resolved = resolveThemeColor();
    expect(resolved.light.accent).toBe("#475569");
    expect(resolved.dark.accent).toBe("#cbd5e1");
    expect(resolved.light.accentLight).toBe("rgba(241, 245, 249, 0.9)");
  });

  it("预设值命中对应预设（按 accent 维度亮色）", () => {
    const mint = THEME_COLOR_PRESETS.find((p) => p.key === "mint");
    expect(mint?.value).toBe("#0d9488");
    const resolved = resolveThemeColor({ accent: { light: "#0d9488" } });
    expect(resolved.light.accent).toBe("#0d9488");
    // dark 未设置，保持默认
    expect(resolved.dark.accent).toBe("#cbd5e1");
  });

  it("亮/暗可独立设置（accent 不同色）", () => {
    const resolved = resolveThemeColor({
      accent: { light: "#2563eb", dark: "#cbd5e1" },
    });
    expect(resolved.light.accent).toBe("#2563eb");
    expect(resolved.dark.accent).toBe("#cbd5e1");
  });

  it("自定义颜色走派生逻辑（亮/暗分别派生且为合法 hex）", () => {
    const resolved = resolveThemeColor({ accent: { light: "#123456" } });
    expect(resolved.light.accent).toBe("#123456");
    expect(resolved.light.accentDeep).toMatch(/^#([0-9a-f]{2}){3}$/i);
    expect(resolved.light.accentLight).toMatch(
      /^rgba\(\d+, \d+, \d+, [\d.]+\)$/,
    );
  });

  it("非法值回退默认", () => {
    const resolved = resolveThemeColor({ accent: { light: "not-a-color" } });
    expect(resolved.light.accent).toBe(DEFAULT_THEME_COLOR_VALUE);
  });

  it("各维度独立解析：仅设置 category 不影响 accent", () => {
    const resolved = resolveThemeColor({ category: { light: "#2563eb" } });
    // accent 保持默认石墨青
    expect(resolved.light.accent).toBe("#475569");
    // category 使用独立值
    expect(resolved.light.category).toBe("#2563eb");
  });

  it("按维度设置渐变影响 gradient-brand 但不影响 accent", () => {
    const resolved = resolveThemeColor({ gradient: { light: "#fbbf24" } });
    expect(resolved.light.accent).toBe("#475569");
    expect(resolved.light.gradientBrand).toContain("linear-gradient(135deg,");
    expect(resolved.light.gradientBrand).not.toContain("#75e1f1");
    expect(resolved.light.hotRankGradient).toContain("linear-gradient(135deg,");
  });

  it("computeElementPlusLevels 生成含 primary 的层级", () => {
    const levels = computeElementPlusLevels("#475569");
    expect(levels.primary).toBe("#475569");
    expect(levels.light3).toMatch(/^#([0-9a-f]{2}){3}$/i);
    expect(levels.dark2).toMatch(/^#([0-9a-f]{2}){3}$/i);
  });

  it("buildThemeColorCss 生成含亮/暗 + Element Plus + selection 的样式", () => {
    const css = buildThemeColorCss({ accent: { light: "#0d9488" } });
    expect(css).toContain(":root");
    expect(css).toContain("html.dark");
    expect(css).toContain("--color-accent: #0d9488");
    expect(css).toContain("--el-color-primary");
    expect(css).toContain("::selection");
  });

  it("buildThemeColorCss 覆盖全部风格扩展色（组件联动）", () => {
    const css = buildThemeColorCss({ accent: { light: "#475569" } });
    [
      "--color-category",
      "--color-category-soft",
      "--color-fav",
      "--color-fav-soft",
      "--gradient-brand",
      "--gradient-brand-text",
      "--hot-rank-gradient",
      "--hot-rank-text",
      "--deco-a",
      "--deco-b",
      "--shadow-glow",
      "--text-glow",
    ].forEach((v) => expect(css).toContain(v));
  });

  it("默认预设（石墨青）保留当前设计的扩展色", () => {
    const resolved = resolveThemeColor();
    expect(resolved.light.category).toBe("#2e9aad");
    expect(resolved.light.fav).toBe("#f59e0b");
    expect(resolved.light.gradientBrand).toContain("#75e1f1");
    expect(resolved.dark.category).toBe("#2dd4bf");
    expect(resolved.dark.gradientBrand).toContain("#34d0c2");
  });
});
