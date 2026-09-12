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
      "--color-accent-text",
    ].forEach((v) => expect(css).toContain(v));
  });

  it("--color-accent-text 按 accent 亮度自动取前景色（保证两种主题都可读）", () => {
    const light = buildThemeColorCss({ accent: { light: "#475569" } });
    const dark = buildThemeColorCss({ accent: { dark: "#cbd5e1" } });
    // 深色 accent（亮色主题默认）→ 白字
    expect(light).toContain("--color-accent-text: #ffffff");
    // 浅色 accent（暗色主题默认）→ 深墨水字（固定白字在此处仅 1.48:1）
    expect(dark).toContain("--color-accent-text: #0f172a");
  });

  it("全部主题色预设 × 亮/暗 的 accent 填充面文字对比度均 ≥ 4.5:1", () => {
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex: string) => {
      const h = hex.replace("#", "");
      const full =
        h.length === 3
          ? h
              .split("")
              .map((x) => x + x)
              .join("")
          : h;
      const r = parseInt(full.slice(0, 2), 16);
      const g = parseInt(full.slice(2, 4), 16);
      const b = parseInt(full.slice(4, 6), 16);
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    /** 从生成的 CSS 中取出某个选择器块里的某变量值 */
    const readVar = (css: string, selector: string, name: string) => {
      const block = css.split(selector)[1] ?? "";
      const m = block.match(new RegExp(`${name}:\\s*([^;]+);`));
      return (m?.[1] ?? "").trim();
    };

    for (const preset of THEME_COLOR_PRESETS) {
      const css = buildThemeColorCss({
        accent: { light: preset.light.accent, dark: preset.dark.accent },
      });
      for (const [selector, label] of [
        [":root", "亮色"],
        ["html.dark", "暗色"],
      ] as const) {
        const bg = readVar(css, selector, "--color-accent");
        const fg = readVar(css, selector, "--color-accent-text");
        expect(fg, `${preset.key} / ${label} 应输出前景色`).toMatch(
          /^#[0-9a-f]{6}$/,
        );
        expect(
          contrast(fg, bg),
          `${preset.key} / ${label}：${fg} on ${bg} 对比度不足`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
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
