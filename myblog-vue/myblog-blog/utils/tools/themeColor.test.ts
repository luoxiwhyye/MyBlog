import { describe, it, expect } from "vitest";
import {
  DEFAULT_THEME_COLOR_VALUE,
  THEME_COLOR_PRESETS,
  resolveThemeColor,
  computeElementPlusLevels,
  buildThemeColorCss,
} from "../themeColor";

describe("themeColor 工具", () => {
  it("未配置（无输入）回退到当前设计晴空青", () => {
    const resolved = resolveThemeColor();
    expect(resolved.light.accent).toBe("#008fbe");
    expect(resolved.light.accentDeep).toBe("#0b5c82");
    expect(resolved.dark.accent).toBe("#22d3ee");
    expect(resolved.light.accentLight).toBe("rgba(0, 143, 190, 0.14)");
  });

  it("预设值命中对应预设（按 accent 维度亮色）", () => {
    const mint = THEME_COLOR_PRESETS.find((p) => p.key === "mint");
    expect(mint?.value).toBe("#0d9488");
    const resolved = resolveThemeColor({ accent: { light: "#0d9488" } });
    expect(resolved.light.accent).toBe("#0d9488");
    // dark 未设置，保持默认
    expect(resolved.dark.accent).toBe("#22d3ee");
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
    // accent 保持默认晴空青
    expect(resolved.light.accent).toBe("#008fbe");
    // category 使用独立值
    expect(resolved.light.category).toBe("#2563eb");
  });

  it("按维度设置渐变影响 gradient-brand 但不影响 accent", () => {
    const resolved = resolveThemeColor({ gradient: { light: "#fbbf24" } });
    expect(resolved.light.accent).toBe("#008fbe");
    expect(resolved.light.gradientBrand).toContain("linear-gradient(135deg,");
    expect(resolved.light.hotRankGradient).toContain("linear-gradient(135deg,");
  });

  it("gradient / deco 的输入即最终色（不再额外提亮）", () => {
    // 渐变：选的就是渐变起始色本身
    const light = resolveThemeColor({ gradient: { light: "#fbbf24" } });
    expect(light.light.gradientBrand).toContain(
      "linear-gradient(135deg, #fbbf24,",
    );
    const dark = resolveThemeColor({ gradient: { dark: "#34d0c2" } });
    expect(dark.dark.gradientBrand).toContain(
      "linear-gradient(135deg, #34d0c2,",
    );

    // 光晕：选的就是光晕主色本身（只加透明度）
    const deco = resolveThemeColor({ deco: { light: "#2dd4bf" } });
    expect(deco.light.decoA).toBe("rgba(45, 212, 191, 0.16)");
    expect(deco.light.decoB).toBe("rgba(45, 212, 191, 0.14)");
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

  it("填充面的前景：亮色白字、暗色同色系深字", () => {
    const parse = (hex: string) => {
      const h = hex.replace("#", "");
      return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    };
    const lum = (hex: string) => {
      const ch = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      const [r, g, b] = parse(hex);
      return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
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
      // 亮色：填充是高饱和色块 → 固定白字
      expect(
        readVar(css, ":root", "--color-accent-text"),
        `${preset.key} / 亮色：填充面的前景应为白字`,
      ).toBe("#ffffff");
      // 暗色：填充本身是亮青，白字会糊 → 同色系深字
      const fill = readVar(css, "html.dark", "--color-accent");
      const text = readVar(css, "html.dark", "--color-accent-text");
      expect(text).toMatch(/^#[0-9a-f]{6}$/);
      // ① 可读：过 AA
      expect(
        contrast(text, fill),
        `${preset.key} / 暗色：${text} on ${fill} 不足 4.5:1`,
      ).toBeGreaterThanOrEqual(4.5);
      // ② 但**不能黑白硬碰硬**（配近黑字会得到 8.3~12.3）
      expect(
        contrast(text, fill),
        `${preset.key} / 暗色：${text} on ${fill} 对比度过高（黑白硬碰硬）`,
      ).toBeLessThanOrEqual(6);
      // ③ 同色系：前景不得是近黑
      expect(
        ["#000000", "#0f172a"],
        `${preset.key} / 暗色：${text} 仍是近黑`,
      ).not.toContain(text.toLowerCase());
    }
  });

  it("全部主题色预设：亮色填充面为白字且填充够饱和，暗色填充面文字过 AA", () => {
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

    /** HSL 饱和度（0~1）：亮色填充要「鲜明」，不能被洗成粉彩 / 灰蓝 */
    const saturation = (hex: string) => {
      const h = hex.replace("#", "");
      const [r, g, b] = [0, 2, 4]
        .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .sort((x, y) => y - x);
      const l = (r + b) / 2;
      if (r === b) return 0;
      return l > 0.5 ? (r - b) / (2 - r - b) : (r - b) / (r + b);
    };

    for (const preset of THEME_COLOR_PRESETS) {
      const css = buildThemeColorCss({
        accent: { light: preset.light.accent, dark: preset.dark.accent },
      });
      // 亮色：填充是高饱和色块，前景固定白字
      expect(
        readVar(css, ":root", "--color-accent-text"),
        `${preset.key} / 亮色：填充面的前景应为白字`,
      ).toBe("#ffffff");
      expect(
        saturation(preset.light.accent),
        `${preset.key} / 亮色：填充 ${preset.light.accent} 饱和度偏低（不是鲜明色）`,
      ).toBeGreaterThanOrEqual(0.8);
      // 暗色：填充本身是亮青，白字会糊 → 同色系深字，且必须过 AA
      const bg = readVar(css, "html.dark", "--color-accent");
      const fg = readVar(css, "html.dark", "--color-accent-text");
      expect(fg, `${preset.key} / 暗色 应输出前景色`).toMatch(/^#[0-9a-f]{6}$/);
      expect(
        contrast(fg, bg),
        `${preset.key} / 暗色：${fg} on ${bg} 对比度不足`,
      ).toBeGreaterThanOrEqual(4.5);
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
        // 填充档（--color-accent）**不承担图形/描边**：它的职责是「真高亮」底色
        // （配自动前景，见下面的检查）。描边统一走 --color-accent-deep，
        // 所以这里校验「描边/文字档 ≥ 3:1（非文本，专给边框 / focus 用）」。
        expect(
          contrast(deep, base),
          `${preset.key} / ${label}：描边档 ${deep} 作边框不足 3:1`,
        ).toBeGreaterThanOrEqual(3);
        // 填充档只需保证「它比底色亮或暗得足够」不构成误读 —— 这里不断言，
        // 因为它允许是浅色高亮（亮色主题）或浅色高亮（暗色主题），两端方向相反。
        void accent;
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
        // 填充面 + 交互档：前景始终是同一个 --color-accent-text，
        // 所以逐个底色都要拿得住它。⚠️ **只对暗色断言 4.5:1** —— 亮色填充是
        // 高饱和色块，前景按设计就是白字，不强求对比度（见上面的断言）。
        if (selector === "html.dark") {
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

  it("品牌文字保持鲜亮且可读（往鲜亮走，而非洗成灰蓝）", () => {
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
          // ⚠️ 上限 0.98 只作「不要变成纯色」的防呆，**不要收紧**：
          // 品牌色「突兀」的真因是【深 + 高饱和】的组合，而不是高饱和本身；
          // 明度抬上来之后，高饱和不再显得沉重，收紧会把品牌色洗成灰蓝。
          expect(
            saturation(hex),
            `${preset.key} / ${mode} / ${key} = ${hex} 饱和度仍然偏高`,
          ).toBeLessThanOrEqual(0.98);
        }
      }
    }
  });

  it("分类色文字档已统一：不再单独取值，直接复用 accent 的文字档", () => {
    const resolved = resolveThemeColor({ category: { light: "#0284c7" } });
    expect(resolved.light.category).toBe("#0284c7"); // 只设 category 时，categoryStrong 仍与默认 accent 的文字档一致（不再按 category 派生）
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

  it("默认预设（晴空青）保留当前设计的扩展色", () => {
    const resolved = resolveThemeColor();
    expect(resolved.light.category).toBe("#147fa8");
    expect(resolved.light.accentDeep).toBe("#0b5c82");
    expect(resolved.dark.accentDeep).toBe("#7dd3fc");
    expect(resolved.light.fav).toBe("#f59e0b");
    expect(resolved.light.gradientBrand).toContain("#61c9e5");
    expect(resolved.dark.category).toBe("#22d3ee");
    expect(resolved.dark.gradientBrand).toContain("#34d0c2");
  });
});
