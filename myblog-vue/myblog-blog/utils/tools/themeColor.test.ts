import { describe, it, expect } from "vitest";
import {
  DEFAULT_THEME_COLOR_VALUE,
  THEME_COLOR_PRESETS,
  resolveThemeColor,
  computeElementPlusLevels,
  buildThemeColorCss,
} from "../themeColor";

describe("themeColor 工具", () => {
  it("未配置（无输入）回退到当前设计青瓷蓝", () => {
    const resolved = resolveThemeColor();
    expect(resolved.light.accent).toBe("#088db0");
    expect(resolved.light.accentDeep).toBe("#1f6a8c");
    expect(resolved.dark.accent).toBe("#67e8f9");
    expect(resolved.light.accentLight).toBe("rgba(8, 141, 176, 0.1)");
  });

  it("预设值命中对应预设（按 accent 维度亮色）", () => {
    const mint = THEME_COLOR_PRESETS.find((p) => p.key === "mint");
    expect(mint?.value).toBe("#0d9488");
    const resolved = resolveThemeColor({ accent: { light: "#0d9488" } });
    expect(resolved.light.accent).toBe("#0d9488");
    // dark 未设置，保持默认
    expect(resolved.dark.accent).toBe("#67e8f9");
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
    // accent 保持默认青瓷蓝
    expect(resolved.light.accent).toBe("#088db0");
    // category 使用独立值
    expect(resolved.light.category).toBe("#2563eb");
  });

  it("按维度设置渐变影响 gradient-brand 但不影响 accent", () => {
    const resolved = resolveThemeColor({ gradient: { light: "#fbbf24" } });
    expect(resolved.light.accent).toBe("#088db0");
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
      "--color-category-strong",
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

  it("强调色拆两级：装饰档只给图形、文字档保证可读（亮/暗、全部预设）", () => {
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex: string) => {
      const h = hex.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const readVar = (css: string, selector: string, name: string) => {
      const block = css.split(selector)[1] ?? "";
      const m = block.match(new RegExp(`${name}:\\s*([^;]+);`));
      return (m?.[1] ?? "").trim();
    };

    for (const preset of THEME_COLOR_PRESETS) {
      const css = buildThemeColorCss({
        accent: { light: preset.light.accent, dark: preset.dark.accent },
      });
      // 底色统一按「该主题里最不利于对比度的底座」：亮色取纯白、暗色取实测卡片合成色
      for (const [selector, label, base] of [
        [":root", "亮色", "#ffffff"],
        ["html.dark", "暗色", "#1d2743"],
      ] as const) {
        const accent = readVar(css, selector, "--color-accent");
        const deep = readVar(css, selector, "--color-accent-deep");
        const text = readVar(css, selector, "--color-accent-text");
        const link = readVar(css, selector, "--color-link");
        // 装饰档：只当图形/填充（非文本 3:1）
        expect(
          contrast(accent, base),
          `${preset.key} / ${label}：装饰档 ${accent} 作图形不足 3:1`,
        ).toBeGreaterThanOrEqual(3);
        // 文字档：链接 / hover / 当前选中都用它（4.5:1）
        for (const [v, n] of [
          [deep, "--color-accent-deep"],
          [link, "--color-link"],
        ] as const) {
          expect(
            contrast(v, base),
            `${preset.key} / ${label}：${n} ${v} 作文字不足 4.5:1`,
          ).toBeGreaterThanOrEqual(4.5);
        }
        // 填充面 + 自动前景 + 交互档：三者都要 ≥4.5
        for (const name of [
          "--color-accent",
          "--color-accent-hover",
          "--color-accent-active",
        ]) {
          const fill = readVar(css, selector, name);
          expect(
            contrast(text, fill),
            `${preset.key} / ${label}：${name} ${fill} 上的 ${text} 不足 4.5:1`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("分类色拆两级：装饰档只给图形、文字档保证可读（亮/暗、全部预设）", () => {
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (hex: string) => {
      const h = hex.replace("#", "");
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    for (const preset of THEME_COLOR_PRESETS) {
      for (const [mode, label] of [
        ["light", "亮色"],
        ["dark", "暗色"],
      ] as const) {
        const v = preset[mode];
        // 底色统一按「该主题里最不利于对比度的底座」取：亮色取纯白，暗色取卡片合成色。
        // 装饰档只需非文本 3:1（WCAG 1.4.11），文字档要 4.5:1。
        const base = mode === "light" ? "#ffffff" : "#1d2743";
        expect(
          contrast(v.category, base),
          `${preset.key} / ${label}：装饰档 ${v.category} 作图形不足 3:1`,
        ).toBeGreaterThanOrEqual(3);
        // 分类色的文字档 = accent 的文字档（全站品牌文字只有一个颜色）
        expect(
          contrast(v.categoryStrong ?? v.accentDeep, base),
          `${preset.key} / ${label}：文字档 ${v.categoryStrong ?? v.accentDeep} 不足 4.5:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("品牌文字全部去彩度：不再出现高饱和的蓝字（2026-09-15 反馈）", () => {
    /** HSL 饱和度（0~1）：与实测定值时引用的口径一致 */
    const saturation = (hex: string) => {
      const h = hex.replace("#", "");
      const [r, g, b] = [0, 2, 4]
        .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .sort((x, y) => y - x);
      const l = (r + b) / 2;
      if (r === b) return 0;
      return l > 0.5 ? (r - b) / (2 - r - b) : (r - b) / (r + b);
    };
    const BLUE_CHARS = ["accentDeep", "link"] as const;
    for (const preset of THEME_COLOR_PRESETS) {
      for (const mode of ["light", "dark"] as const) {
        for (const key of BLUE_CHARS) {
          const hex = preset[mode][key];
          // 调整前是 82%~96%；周围中性文字只有 16~33%。留 70% 作硬上限。
          expect(
            saturation(hex),
            `${preset.key} / ${mode} / ${key} = ${hex} 饱和度仍然偏高`,
          ).toBeLessThanOrEqual(0.7);
        }
      }
    }
  });

  it("分类色文字档已统一：不再单独取值，直接复用 accent 的文字档", () => {
    const resolved = resolveThemeColor({ category: { light: "#0284c7" } });
    expect(resolved.light.category).toBe("#0284c7");
    // 只设 category 时，categoryStrong 仍与默认 accent 的文字档一致（不再按 category 派生）
    expect(resolved.light.categoryStrong).toBeUndefined();
    const css = buildThemeColorCss({ category: { light: "#0284c7" } });
    const readVar = (selector: string, name: string) => {
      const block = css.split(selector)[1] ?? "";
      const m = block.match(new RegExp(`${name}:\\s*([^;]+);`));
      return (m?.[1] ?? "").trim();
    };
    expect(readVar(":root", "--color-category-strong")).toBe(
      readVar(":root", "--color-accent-deep"),
    );
    expect(readVar(":root", "--color-link")).toBe(
      readVar(":root", "--color-accent-deep"),
    );
  });

  it("默认预设（青瓷蓝）保留当前设计的扩展色", () => {
    const resolved = resolveThemeColor();
    expect(resolved.light.category).toBe("#0284c7");
    expect(resolved.light.accentDeep).toBe("#1f6a8c");
    expect(resolved.dark.accentDeep).toBe("#96cee8");
    expect(resolved.light.fav).toBe("#f59e0b");
    expect(resolved.light.gradientBrand).toContain("#75e1f1");
    expect(resolved.dark.category).toBe("#38bdf8");
    expect(resolved.dark.gradientBrand).toContain("#34d0c2");
  });
});
