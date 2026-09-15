// ============================================
// utils/themeColor.ts - 博客品牌主色工具
// 主色全部走 CSS 变量，后台可在「外观与品牌」切换；
// 未配置或非法时回退到默认预设（当前设计 - 石墨青）。
//
// 关键：每个预设要输出【完整】的风格扩展色组（亮/暗），
// 否则切换主题色时大量组件（分类徽标/品牌渐变/收藏/
// 装饰光晕/热门排名/阴影光效）不会联动。
// ============================================

export interface ThemeColorVariant {
  /**
   * --color-accent（**装饰档**：填充 / 描边 / focus 外框 / 浅底 / 渐变）
   * 只需满足非文本 3:1，所以可以取亮色（观感轻快）。
   */
  accent: string;
  /** --color-accent-light（柔和背景/徽标底） */
  accentLight: string;
  /**
   * --color-accent-deep（**文字档**：链接 hover / 当前选中 / 统计数字 / 图标 / TOC 高亮）
   *
   * 与 `--color-category` / `--color-category-strong` 同一套两级思路：本体只当图形，
   * 真正当文字的地方必须 ≥4.5:1，故需要一个同色族的深（亮色主题）/ 浅（暗色主题）版本。
   */
  accentDeep: string;
  /**
   * --color-accent-text（**accent 填充面上的前景色**）
   *
   * --color-accent 会随主题"反相"（亮色下是深色、暗色下是浅色），
   * 因此写死 `color: #ffffff` 在暗色下会变成"白字压浅灰"（实测对比度仅 1.48:1）。
   * 本字段用于填充式按钮/徽标的前景，保证两种主题下都能读清。
   *
   * 通常**无需显式赋值**：buildThemeColorCss 会按 accent 的亮度自动推导。
   */
  accentText?: string;
  /** --color-link */
  link: string;
  /** --color-category（分类色·**装饰档**：边框 / focus 描边 / 时间线圆点 / 装饰条 / 渐变 / 填充） */
  category: string;
  /** --color-category-soft（徽标底） */
  categorySoft: string;
  /**
   * --color-category-strong（分类色的**文字档**，不参与图形 / 填充）
   *
   * ⚠️ 它现在**默认就是 accent 的文字档**（`variantToBlock` 里回退到 accentDeep）：
   * 全站品牌文字只保留一个颜色，避免出现「三种相近但不相同的蓝」。
   * 保留本字段只为将来真的要分色时留个口子。
   */
  categoryStrong?: string;
  /** --color-fav（收藏/星标暖橙） */
  fav: string;
  /** --color-fav-soft（收藏高亮底/搜索 mark） */
  favSoft: string;
  /** --gradient-brand（品牌渐变：标题竖条/最新徽标/排名徽标） */
  gradientBrand: string;
  /** --gradient-brand-text（渐变上的文字色） */
  gradientBrandText: string;
  /** --hot-rank-gradient（热门 top3 排名徽标渐变） */
  hotRankGradient: string;
  /** --hot-rank-text（热门 top3 排名字） */
  hotRankText: string;
  /** --deco-a（装饰光晕 A） */
  decoA: string;
  /** --deco-b（装饰光晕 B） */
  decoB: string;
  /** --shadow-glow（光效阴影） */
  shadowGlow: string;
  /** --text-glow（文字光晕） */
  textGlow: string;
}

export interface ThemeColorPreset {
  key: string;
  name: string;
  /** 唯一的规范色值（后台颜色选择器/预设回显用） */
  value: string;
  light: ThemeColorVariant;
  dark: ThemeColorVariant;
}

// 预设：当前博客设计（青瓷蓝 / 动漫极简）—— 图A 日间 / 图B 夜间
// ⚠️ 本预设必须与 assets/css/themes/_light.scss / _dark.scss 的静态回退值逐项一致。
// 2026-09-15 的第一轮：accent 由石墨 #475569 换成青瓷蓝 #0e7490；category 拆成
// 「装饰档 + 文字档」并改走偏蓝的 sky。
// 2026-09-15 的第二轮：**accent 也用同一套两级思路**——本体降为装饰/填充档
// （#088db0，比原值明显轻快），原值 #0e7490 移作文字档。
// 2026-09-15 的第三轮（作者反馈「品牌蓝和其他组件相比很突兀」）：根因不是「深」而是
// **饱和度** —— 周围文字只有 16~33% 彩度，而品牌文字是 82~96%。故把**文字档去彩度**
//（#0e7490 sat82% → #1f6a8c sat64%）并**统一全站品牌文字为一个颜色**：
// `--color-category-strong` 不再单独取值，直接回退到 accentDeep，`link` 也同用。
const SLATE_LIGHT: ThemeColorVariant = {
  accent: "#088db0",
  accentLight: "rgba(8, 141, 176, 0.1)",
  accentDeep: "#1f6a8c",
  link: "#1f6a8c",
  category: "#0284c7",
  categorySoft: "rgba(2, 132, 199, 0.12)",
  fav: "#f59e0b",
  favSoft: "rgba(245, 158, 11, 0.22)",
  gradientBrand: "linear-gradient(135deg, #75e1f1, #bff4fa)",
  gradientBrandText: "#2e5763",
  hotRankGradient: "linear-gradient(135deg, #75e1f1, #aeeef8)",
  hotRankText: "#2e5763",
  decoA: "rgba(143, 224, 232, 0.16)",
  decoB: "rgba(74, 155, 232, 0.14)",
  shadowGlow:
    "0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 30px rgba(120, 190, 240, 0.25)",
  textGlow: "0 2px 12px rgba(255, 255, 255, 0.45)",
};

const SLATE_DARK: ThemeColorVariant = {
  accent: "#67e8f9",
  accentLight: "rgba(103, 232, 249, 0.16)",
  accentDeep: "#96cee8",
  link: "#96cee8",
  category: "#38bdf8",
  categorySoft: "rgba(56, 189, 248, 0.14)",
  fav: "#fbbf24",
  favSoft: "rgba(251, 191, 36, 0.2)",
  gradientBrand: "linear-gradient(135deg, #34d0c2, #4fc3f7)",
  gradientBrandText: "#132b30",
  hotRankGradient: "linear-gradient(135deg, #34d0c2, #4fc3f7)",
  hotRankText: "#132b30",
  decoA: "rgba(90, 140, 220, 0.2)",
  decoB: "rgba(201, 138, 75, 0.18)",
  shadowGlow:
    "0 0 0 1px rgba(80, 140, 220, 0.25), 0 8px 30px rgba(20, 40, 90, 0.55)",
  textGlow: "0 2px 14px rgba(80, 140, 230, 0.35)",
};

// 其它预设：协调的动漫极简配色（分类/渐变/装饰随主色系联动）
const MINT_LIGHT: ThemeColorVariant = {
  ...SLATE_LIGHT,
  accent: "#0d9488",
  accentLight: "rgba(13, 148, 136, 0.12)",
  accentDeep: "#1f4c48",
  link: "#1f4c48",
  category: "#0d9488",
  categorySoft: "rgba(13, 148, 136, 0.14)",
  gradientBrand: "linear-gradient(135deg, #5eead4, #99f6e4)",
  gradientBrandText: "#27524f",
  hotRankGradient: "linear-gradient(135deg, #2dd4bf, #4fc3f7)",
  hotRankText: "#132b30",
  decoA: "rgba(45, 212, 191, 0.16)",
  decoB: "rgba(20, 184, 166, 0.14)",
  shadowGlow:
    "0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 30px rgba(45, 212, 191, 0.25)",
};
const MINT_DARK: ThemeColorVariant = {
  ...SLATE_DARK,
  accent: "#2dd4bf",
  accentLight: "rgba(45, 212, 191, 0.16)",
  // accentDeep 是**文字档**（暗色下必须是浅色，否则压在暗卡上读不出）
  accentDeep: "#95d1c9",
  link: "#95d1c9",
  category: "#2dd4bf",
  categorySoft: "rgba(45, 212, 191, 0.16)",
  gradientBrand: "linear-gradient(135deg, #2dd4bf, #4fc3f7)",
  gradientBrandText: "#0e2522",
  hotRankGradient: "linear-gradient(135deg, #2dd4bf, #4fc3f7)",
  hotRankText: "#0e2522",
  decoA: "rgba(45, 212, 191, 0.22)",
  decoB: "rgba(20, 184, 166, 0.18)",
  shadowGlow:
    "0 0 0 1px rgba(45, 212, 191, 0.25), 0 8px 30px rgba(4, 47, 46, 0.55)",
};

const AZURE_LIGHT: ThemeColorVariant = {
  ...SLATE_LIGHT,
  accent: "#2563eb",
  accentLight: "rgba(37, 99, 235, 0.12)",
  accentDeep: "#2d426f",
  link: "#2d426f",
  category: "#2563eb",
  categorySoft: "rgba(37, 99, 235, 0.14)",
  gradientBrand: "linear-gradient(135deg, #93c5fd, #bfdbfe)",
  gradientBrandText: "#32426e",
  hotRankGradient: "linear-gradient(135deg, #60a5fa, #93c5fd)",
  hotRankText: "#32426e",
  decoA: "rgba(96, 165, 250, 0.16)",
  decoB: "rgba(59, 130, 246, 0.14)",
  shadowGlow:
    "0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 30px rgba(96, 165, 250, 0.25)",
};
const AZURE_DARK: ThemeColorVariant = {
  ...SLATE_DARK,
  accent: "#60a5fa",
  accentLight: "rgba(96, 165, 250, 0.16)",
  accentDeep: "#aec7e5",
  link: "#aec7e5",
  category: "#60a5fa",
  categorySoft: "rgba(96, 165, 250, 0.16)",
  gradientBrand: "linear-gradient(135deg, #3b82f6, #60a5fa)",
  gradientBrandText: "#182638",
  hotRankGradient: "linear-gradient(135deg, #3b82f6, #60a5fa)",
  hotRankText: "#182638",
  decoA: "rgba(96, 165, 250, 0.22)",
  decoB: "rgba(59, 130, 246, 0.18)",
  shadowGlow:
    "0 0 0 1px rgba(96, 165, 250, 0.25), 0 8px 30px rgba(23, 37, 84, 0.55)",
};

const WISTERIA_LIGHT: ThemeColorVariant = {
  ...SLATE_LIGHT,
  accent: "#7c3aed",
  accentLight: "rgba(124, 58, 237, 0.12)",
  accentDeep: "#4e3974",
  link: "#4e3974",
  category: "#8b5cf6",
  categorySoft: "rgba(139, 92, 246, 0.14)",
  gradientBrand: "linear-gradient(135deg, #c4b5fd, #ddd6fe)",
  gradientBrandText: "#503678",
  hotRankGradient: "linear-gradient(135deg, #a78bfa, #c4b5fd)",
  hotRankText: "#503678",
  decoA: "rgba(196, 181, 253, 0.16)",
  decoB: "rgba(167, 139, 250, 0.14)",
  shadowGlow:
    "0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 30px rgba(167, 139, 250, 0.25)",
};
const WISTERIA_DARK: ThemeColorVariant = {
  ...SLATE_DARK,
  accent: "#a78bfa",
  accentLight: "rgba(167, 139, 250, 0.16)",
  accentDeep: "#cbc2e9",
  link: "#cbc2e9",
  category: "#a78bfa",
  categorySoft: "rgba(167, 139, 250, 0.16)",
  gradientBrand: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
  gradientBrandText: "#271e3b",
  hotRankGradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
  hotRankText: "#271e3b",
  decoA: "rgba(167, 139, 250, 0.22)",
  decoB: "rgba(139, 92, 246, 0.18)",
  shadowGlow:
    "0 0 0 1px rgba(167, 139, 250, 0.25), 0 8px 30px rgba(46, 16, 101, 0.55)",
};

const AMBER_LIGHT: ThemeColorVariant = {
  ...SLATE_LIGHT,
  fav: "#ea580c",
  favSoft: "rgba(234, 88, 12, 0.22)",
  accent: "#d97706",
  accentLight: "rgba(217, 119, 6, 0.12)",
  accentDeep: "#664621",
  link: "#664621",
  category: "#b45309",
  categorySoft: "rgba(180, 83, 9, 0.12)",
  gradientBrand: "linear-gradient(135deg, #fbbf24, #fde68a)",
  gradientBrandText: "#5e3924",
  hotRankGradient: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  hotRankText: "#5e3924",
  decoA: "rgba(251, 191, 36, 0.16)",
  decoB: "rgba(217, 119, 6, 0.14)",
  shadowGlow:
    "0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 30px rgba(245, 158, 11, 0.25)",
};
const AMBER_DARK: ThemeColorVariant = {
  ...SLATE_DARK,
  fav: "#fb923c",
  favSoft: "rgba(251, 146, 60, 0.2)",
  accent: "#fbbf24",
  accentLight: "rgba(251, 191, 36, 0.16)",
  accentDeep: "#e1cc95",
  link: "#e1cc95",
  category: "#f59e0b",
  categorySoft: "rgba(245, 158, 11, 0.16)",
  gradientBrand: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  gradientBrandText: "#351d10",
  hotRankGradient: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  hotRankText: "#351d10",
  decoA: "rgba(251, 191, 36, 0.22)",
  decoB: "rgba(217, 119, 6, 0.18)",
  shadowGlow:
    "0 0 0 1px rgba(251, 191, 36, 0.25), 0 8px 30px rgba(69, 26, 3, 0.55)",
};

// 预设主题色：当前博客设计（青瓷蓝 Slate）作为默认预设，其余贴合动漫极简风格
// ⚠️ 预设的 value 是「accent 亮色值」：后台一键应用预设、以及 THEME_COLOR_PRESET_MAP
//（admin Settings.vue）的键都靠它对应，改名/改值必须两处同步。
export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  {
    key: "slate",
    name: "青瓷蓝（当前/默认）",
    value: "#088db0",
    light: SLATE_LIGHT,
    dark: SLATE_DARK,
  },
  {
    key: "mint",
    name: "薄荷青",
    value: "#0d9488",
    light: MINT_LIGHT,
    dark: MINT_DARK,
  },
  {
    key: "azure",
    name: "天青蓝",
    value: "#2563eb",
    light: AZURE_LIGHT,
    dark: AZURE_DARK,
  },
  {
    key: "wisteria",
    name: "暮紫藤",
    value: "#7c3aed",
    light: WISTERIA_LIGHT,
    dark: WISTERIA_DARK,
  },
  {
    key: "amber",
    name: "暖琥珀",
    value: "#d97706",
    light: AMBER_LIGHT,
    dark: AMBER_DARK,
  },
];

export const DEFAULT_THEME_COLOR = THEME_COLOR_PRESETS[0];

export const DEFAULT_THEME_COLOR_VALUE = DEFAULT_THEME_COLOR.value;

// ---------------------- 颜色运算工具 ----------------------

interface Rgb {
  r: number;
  g: number;
  b: number;
}

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

const hexToRgb = (hex: string): Rgb | null => {
  let h = hex.replace("#", "").trim();
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }: Rgb): string => {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
};

/** 将 a 与 b 按 weight（b 的比例）混合 */
const mix = (a: Rgb, b: Rgb, weight: number): Rgb => ({
  r: a.r + (b.r - a.r) * weight,
  g: a.g + (b.g - a.g) * weight,
  b: a.b + (b.b - a.b) * weight,
});

const lighten = (c: Rgb, weight: number): Rgb => mix(c, WHITE, weight);
const darken = (c: Rgb, weight: number): Rgb => mix(c, BLACK, weight);

/**
 * 去彩度（往「通道均值」靠）。
 *
 * 为什么需要它：品牌色作为**文字**时必须在 4.5:1 以上，而“够深”的高饱和度蓝
 * 在全是低饱和灰蓝的页面里会显得很突兀（实测：周围文字只有 16~33% 饱和，
 * 品牌文字却是 82~96%）。降低彩度而不动亮度，就能同时拿到「可读」与「不突兀」。
 *
 * 注意：去彩度会略微改变亮度 —— 实测是**小幅提高**对比度（因为底色是蓝调浅底），
 * 所以不会把刚达标的颜色弄得不达标。
 */
const mute = (c: Rgb, weight: number): Rgb => {
  const avg = (c.r + c.g + c.b) / 3;
  return mix(c, { r: avg, g: avg, b: avg }, weight);
};

const toRgba = (c: Rgb, alpha: number): string =>
  `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`;

/** 深墨水色（slate-900 系），用作浅底色上的前景 */
const INK: Rgb = { r: 15, g: 23, b: 42 };

/** sRGB 相对亮度（WCAG 2.x 定义），用于判断前景该用白还是深色 */
const relativeLuminance = ({ r, g, b }: Rgb): number => {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/**
 * 在给定底色上取可读的前景色：对比度更高的那一方胜出（白 / 深墨水）。
 * 用于 --color-accent-text —— accent 随主题反相，固定白字会在暗色下失效。
 */
const readableOn = (bg: Rgb): string => {
  const l = relativeLuminance(bg);
  const withWhite = (1 + 0.05) / (l + 0.05);
  const withInk = (l + 0.05) / (relativeLuminance(INK) + 0.05);
  return withWhite >= withInk ? "#ffffff" : rgbToHex(INK);
};

/**
 * 主题色可拆分为 5 个独立可调维度，且亮色/暗色模式各自独立：
 *   accent   强调/链接（--color-accent* / --color-link / --el-color-primary*）
 *   category 分类徽标（--color-category*）
 *   fav      收藏/星标（--color-fav*）
 *   gradient 品牌渐变（--gradient-brand* / --hot-rank-*）
 *   deco     装饰光效（--deco-* / --shadow-glow / --text-glow）
 * 每个维度可分别设置亮色(light)与暗色(dark)主色；未设置（空/非法）则回退到
 * 默认预设对应维度的对应模式。这样「功能性组件」可改用独立中性色（不随主题
 * 联动），各维度、各模式互不牵连。
 */
export type ThemeColorDimKey =
  | "accent"
  | "category"
  | "fav"
  | "gradient"
  | "deco";

export type ThemeColorMode = "light" | "dark";

export interface ThemeColorModeInput {
  light?: string;
  dark?: string;
}

export interface ThemeColorInput {
  accent?: ThemeColorModeInput;
  category?: ThemeColorModeInput;
  fav?: ThemeColorModeInput;
  gradient?: ThemeColorModeInput;
  deco?: ThemeColorModeInput;
}

function parseHex(value?: string): Rgb | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (!/^#[0-9a-f]{6}$/.test(trimmed) && !/^#[0-9a-f]{3}$/.test(trimmed)) {
    return null;
  }
  return hexToRgb(trimmed);
}

/** 强调维度：accent / accent-light / accent-deep / link（主色 = 传入 hex） */
const applyAccentDim = (baseHex: string, isDark: boolean) => {
  const c = parseHex(baseHex);
  if (!c) return null;
  // accentDeep 兼作「文字档」：亮色主题压深（对白底）、暗色主题提亮（对暗卡），
  // 并**去彩度**（见 mute 注释）—— 与中性灰蓝同族，不再突兀。
  const deep = mute(isDark ? lighten(c, 0.35) : darken(c, 0.4), 0.45);
  return {
    accent: baseHex,
    accentLight: isDark ? toRgba(darken(c, 0.35), 0.9) : toRgba(c, 0.1),
    accentDeep: rgbToHex(deep),
    // 链接必须走文字档：accent 本体（装饰档）作文字普遍只有 3 点几比一
    link: rgbToHex(deep),
  };
};

/**
 * 分类维度：category（图形）+ category-soft（徽标底）。
 *
 * ⚠️ **不再产出 categoryStrong**（2026-09-15）：分类色的**文字档直接复用 accent 的文字档**
 *（见 variantToBlock 的回退）。原因是全站出现三种近似但不相同的品牌蓝，在几乎全是灰蓝的
 * 页面里显得很乱（作者反馈「和其他组件相比很突兀」）—— 现在全站品牌文字只有**一个**颜色；
 * 两类颜色的区分靠**底 / 描边 / 圆点 / 渐变**，而不是靠文字色。
 */
const applyCategoryDim = (baseHex: string, isDark: boolean) => {
  const c = parseHex(baseHex);
  if (!c) return null;
  return {
    category: baseHex,
    categorySoft: toRgba(c, isDark ? 0.14 : 0.12),
  };
};

/** 收藏/星标维度：fav / fav-soft（主色 = 传入 hex） */
const applyFavDim = (baseHex: string, isDark: boolean) => {
  const c = parseHex(baseHex);
  if (!c) return null;
  return {
    fav: baseHex,
    favSoft: toRgba(c, isDark ? 0.2 : 0.22),
  };
};

/** 品牌渐变维度：gradient-brand / gradient-brand-text / hot-rank-*（基色 = 传入 hex） */
const applyGradientDim = (baseHex: string, isDark: boolean) => {
  const c = parseHex(baseHex);
  if (!c) return null;
  const first = rgbToHex(lighten(c, isDark ? 0.05 : 0.3));
  const last = rgbToHex(lighten(c, 0.6));
  // 渐变上的文字也去彩度（同一理由，见 mute 注释）
  const text = rgbToHex(
    mute(isDark ? { r: 3, g: 33, b: 28 } : darken(c, 0.4), 0.45),
  );
  const gradientBrand = `linear-gradient(135deg, ${first}, ${last})`;
  return {
    gradientBrand,
    gradientBrandText: text,
    hotRankGradient: gradientBrand,
    hotRankText: text,
  };
};

/** 装饰光效维度：deco-a / deco-b / shadow-glow / text-glow（基色 = 传入 hex） */
const applyDecoDim = (baseHex: string, isDark: boolean) => {
  const c = parseHex(baseHex);
  if (!c) return null;
  return {
    decoA: toRgba(lighten(c, 0.2), isDark ? 0.22 : 0.16),
    decoB: toRgba(c, isDark ? 0.18 : 0.14),
    shadowGlow: isDark
      ? `0 0 0 1px ${toRgba(c, 0.25)}, 0 8px 30px ${toRgba(darken(c, 0.5), 0.55)}`
      : `0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 30px ${toRgba(c, 0.25)}`,
    textGlow: isDark
      ? `0 2px 14px ${toRgba(lighten(c, 0.2), 0.42)}`
      : "0 2px 12px rgba(255, 255, 255, 0.45)",
  };
};

/** 取预设的亮/暗两组变量（深拷贝，避免调用方意外修改预设） */
const presetVariants = (preset: ThemeColorPreset) => ({
  light: { ...preset.light },
  dark: { ...preset.dark },
});

const overrideDim = (
  base: ThemeColorVariant,
  patch: Partial<ThemeColorVariant>,
): ThemeColorVariant => ({ ...base, ...patch });

const hasHex = (v?: string) => parseHex(v) != null;

const DIM_LIST: ThemeColorDimKey[] = [
  "accent",
  "category",
  "fav",
  "gradient",
  "deco",
];

const modeOf = (isDark: boolean): ThemeColorMode => (isDark ? "dark" : "light");

/**
 * 按维度 + 模式解析主题色设置值，返回亮/暗两组完整 CSS 变量。
 * 输入每个维度一个 { light?, dark? }；未设置的位置回退到默认预设对应维度/模式。
 *
 * @param input 各维度各模式主题色（如 { accent: { light: "#2563eb", dark: "#60a5fa" } }）
 */
export const resolveThemeColor = (
  input?: ThemeColorInput,
): { light: ThemeColorVariant; dark: ThemeColorVariant } => {
  const base = presetVariants(DEFAULT_THEME_COLOR);
  if (!input) return base;

  for (const dim of DIM_LIST) {
    const modeInput = input[dim];
    if (!modeInput) continue;

    if (hasHex(modeInput.light)) {
      const patch = applyDim(dim, modeInput.light!, false);
      if (patch) base.light = overrideDim(base.light, patch);
    }
    if (hasHex(modeInput.dark)) {
      const patch = applyDim(dim, modeInput.dark!, true);
      if (patch) base.dark = overrideDim(base.dark, patch);
    }
  }

  return base;
};

/** 按维度派生一组（Partial）变量；mode 用派生函数的 isDark 判定 */
const applyDim = (
  dim: ThemeColorDimKey,
  baseHex: string,
  isDark: boolean,
): Partial<ThemeColorVariant> | null => {
  switch (dim) {
    case "accent":
      return applyAccentDim(baseHex, isDark);
    case "category":
      return applyCategoryDim(baseHex, isDark);
    case "fav":
      return applyFavDim(baseHex, isDark);
    case "gradient":
      return applyGradientDim(baseHex, isDark);
    case "deco":
      return applyDecoDim(baseHex, isDark);
    default:
      return null;
  }
};

/** 兼容旧用法：仅按单一主色解析（若传字符串则视为 accent 维度的 light/dark 同色） */
export const resolveThemeColorByValue = (value?: string) => {
  return resolveThemeColor(
    value ? { accent: { light: value, dark: value } } : undefined,
  );
};

// ---------------------- Element Plus 主色层级 ----------------------

export interface ElementPlusLevels {
  primary: string;
  light3: string;
  light5: string;
  light7: string;
  light8: string;
  light9: string;
  dark2: string;
}

/** 依据主色推导 Element Plus 的 --el-color-primary-* 层级色（近似） */
export const computeElementPlusLevels = (
  accentHex: string,
): ElementPlusLevels => {
  const rgb =
    hexToRgb(accentHex) || (hexToRgb(DEFAULT_THEME_COLOR_VALUE) as Rgb);
  return {
    primary: rgbToHex(rgb),
    light3: rgbToHex(mix(rgb, WHITE, 0.3)),
    light5: rgbToHex(mix(rgb, WHITE, 0.5)),
    light7: rgbToHex(mix(rgb, WHITE, 0.7)),
    light8: rgbToHex(mix(rgb, WHITE, 0.8)),
    light9: rgbToHex(mix(rgb, WHITE, 0.9)),
    dark2: rgbToHex(mix(rgb, BLACK, 0.15)),
  };
};

/**
 * 站点字体栈 = abstracts/_variables.scss 的 $font-family-base。
 * EP 组件的文字必须回落到站点字体（EP 默认栈是另一套）。
 */
const FONT_FAMILY_BASE =
  '"Avenir", Helvetica, Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif';

/**
 * accent 填充式控件的交互档（hover / active）。
 *
 * 方向**不能写死**，必须让对比度变大：
 * - 深底 + 白字（如墨水蓝、天青蓝）→ hover 压深（原逻辑，朝黑）
 * - 浅底 + 深墨字（如青瓷蓝、薄荷青）→ hover **提亮**（朝白）
 *
 * 2026-09-15 实测教训：accent 降为亮色后仍按「亮色主题一律压深」，
 * 墨字对比度会从 4.63 降到 **3.51**（hover）/ **2.61**（active）—— 直接跌破 AA。
 * 现改为按 `readableOn()` 选出的前景色反推方向，两种情形都只会提高对比度。
 */
const interactionLevels = (accentHex: string) => {
  const rgb =
    hexToRgb(accentHex) || (hexToRgb(DEFAULT_THEME_COLOR_VALUE) as Rgb);
  const fg = readableOn(rgb);
  const toward = fg === "#ffffff" ? BLACK : WHITE;
  return {
    hover: rgbToHex(mix(rgb, toward, 0.15)),
    active: rgbToHex(mix(rgb, toward, 0.3)),
  };
};

const variantToBlock = (
  selector: string,
  v: ThemeColorVariant,
  el: ElementPlusLevels,
  isDark: boolean,
): string => {
  const inter = interactionLevels(v.accent);
  return `
${selector} {
  --color-accent: ${v.accent};
  --color-accent-light: ${v.accentLight};
  --color-accent-deep: ${v.accentDeep};
  --color-accent-text: ${v.accentText || readableOn(parseHex(v.accent) ?? WHITE)};
  --color-accent-hover: ${inter.hover};
  --color-accent-active: ${inter.active};
  --color-link: ${v.link};
  --color-category: ${v.category};
  --color-category-strong: ${v.categoryStrong || v.accentDeep};
  --color-category-soft: ${v.categorySoft};
  --color-fav: ${v.fav};
  --color-fav-soft: ${v.favSoft};
  --gradient-brand: ${v.gradientBrand};
  --gradient-brand-text: ${v.gradientBrandText};
  --hot-rank-gradient: ${v.hotRankGradient};
  --hot-rank-text: ${v.hotRankText};
  --deco-a: ${v.decoA};
  --deco-b: ${v.decoB};
  --shadow-glow: ${v.shadowGlow};
  --text-glow: ${v.textGlow};

  --el-color-primary: ${el.primary};
  --el-color-primary-light-3: ${el.light3};
  --el-color-primary-light-5: ${el.light5};
  --el-color-primary-light-7: ${el.light7};
  --el-color-primary-light-8: ${el.light8};
  --el-color-primary-light-9: ${el.light9};
  --el-color-primary-dark-2: ${el.dark2};

  /* Element Plus 的基础变量必须写在「运行时注入块」里：
     assets/css/vendors/_element-plus.scss 的 :root 声明会被 EP 自己的样式表盖掉
     —— main.scss 是 <link>，而 EP 的 theme-chalk 由组件模块以 <style> 内联注入、
     位置更靠后，同特异性下后写者胜。本 <style> 恒在 <head> 末尾 → 最后生效。 */
  --el-border-radius-base: var(--control-radius);
  --el-border-radius-small: 4px;
  --el-font-family: ${FONT_FAMILY_BASE};
  --el-component-size: var(--control-height);
  --el-text-color-primary: var(--text-primary);
  --el-text-color-regular: var(--text-secondary);
  --el-text-color-secondary: var(--text-muted);
  --el-text-color-placeholder: var(--text-muted);
  --el-text-color-disabled: var(--text-muted);
  --el-bg-color: var(--bg-card-solid);
  --el-bg-color-page: var(--bg-page-solid);
  --el-bg-color-overlay: var(--bg-card-solid);
  --el-fill-color-blank: var(--bg-card-solid);
  --el-border-color: var(--border-color);
  --el-border-color-light: var(--border-light);
  --el-border-color-lighter: var(--border-light);
  --el-border-color-hover: var(--color-accent);
  --el-mask-color: var(--bg-backdrop);
  --el-disabled-bg-color: var(--bg-hover);
  --el-disabled-text-color: var(--text-muted);
  --el-disabled-border-color: var(--border-light);
}`;
};

/**
 * Element Plus 组件级覆盖（只输出一份，值全部走 CSS 变量 → 自动跟主题）。
 *
 * ⚠️ 必须用**元素级选择器**：EP 把 --el-button-* / --el-input-* 声明在
 * .el-button / .el-input 元素上，元素级声明会遮蔽 :root 的继承值
 * （实测 :root 上设 --el-button-text-color 无效，.el-button 上立即生效）。
 * ⚠️ 本块内顺序不能颠倒：EP 自己的 .el-button--primary 与我们的 .el-button
 * 同特异性，靠「后写者胜」分出层级，所以 primary 必须写在 default 之后。
 *
 * 三级按钮：主（.el-button--primary）/ 次（EP 默认档）/ 幽灵（EP link 档），
 * 输入框与多行文本共用同一组控件令牌 → 与玻璃卡同源。详见 design-system.md §6.1。
 */
const ELEMENT_PLUS_COMPONENTS = `
/* 次要按钮：玻璃卡底色 + 站点描边；hover 转 accent（**文字档**，见下） */
.el-button {
  --el-button-bg-color: var(--control-bg);
  --el-button-border-color: var(--control-border);
  --el-button-text-color: var(--text-secondary);
  --el-button-hover-bg-color: var(--bg-hover);
  --el-button-hover-border-color: var(--color-accent);
  --el-button-hover-text-color: var(--color-accent-deep);
  --el-button-active-bg-color: var(--bg-hover);
  --el-button-active-border-color: var(--color-accent);
  --el-button-active-text-color: var(--color-accent-deep);
  --el-button-disabled-bg-color: var(--control-bg);
  --el-button-disabled-border-color: var(--control-border);
  --el-button-disabled-text-color: var(--text-muted);
}

/* 主按钮：accent 填充面 → 前景一律用 --color-accent-text
   （原 EP 硬白 --el-color-white 在暗色下是白字压浅灰，实测仅 1.48:1） */
.el-button--primary {
  --el-button-bg-color: var(--color-accent);
  --el-button-border-color: var(--color-accent);
  --el-button-text-color: var(--color-accent-text);
  --el-button-hover-bg-color: var(--color-accent-hover);
  --el-button-hover-border-color: var(--color-accent-hover);
  --el-button-hover-text-color: var(--color-accent-text);
  --el-button-active-bg-color: var(--color-accent-active);
  --el-button-active-border-color: var(--color-accent-active);
  --el-button-active-text-color: var(--color-accent-text);
}

/* plain 主按钮：EP 用「极浅底 + 主色字」，底色换成站点 accent 浅底、**文字走文字档** */
.el-button--primary.is-plain {
  --el-button-bg-color: var(--color-accent-light);
  --el-button-border-color: var(--color-accent);
  --el-button-text-color: var(--color-accent-deep);
  --el-button-hover-bg-color: var(--color-accent);
  --el-button-hover-border-color: var(--color-accent);
  --el-button-hover-text-color: var(--color-accent-text);
  --el-button-active-bg-color: var(--color-accent-active);
  --el-button-active-border-color: var(--color-accent-active);
  --el-button-active-text-color: var(--color-accent-text);
}

.el-button--primary.is-disabled,
.el-button--primary.is-disabled:hover {
  --el-button-disabled-bg-color: var(--control-bg);
  --el-button-disabled-border-color: var(--control-border);
  --el-button-disabled-text-color: var(--text-muted);
}

/* 幽灵按钮（EP link 档）：透明底、行内低强调，hover 转 accent（文字档）+ --bg-hover */
.el-button.is-link {
  --el-button-text-color: var(--text-secondary);
  --el-button-hover-text-color: var(--color-accent-deep);
}
.el-button.is-link:hover {
  background: var(--bg-hover);
}

/* ===== 其它「选中态填充」型 EP 组件 =====
   EP 默认是 --el-color-primary 填充 + **硬白字/硬白勾**（.el-radio-button 的
   --el-radio-button-checked-text-color: var(--el-color-white)、checkbox 的
   --el-checkbox-checked-icon-color 同理）。accent 降为亮色后，硬白会重演
   与主按钮同一类缺陷，所以这些组件的填充一律改成「accent 填充 + 自动前景」。
   注：--el-color-primary 本身保持**文字档**（见 buildThemeColorCss），
   因为 EP 把 primary 更多地当文字色用（tag / checkbox 标签 / link / 选中项）。 */
.el-radio-button {
  --el-radio-button-checked-bg-color: var(--color-accent);
  --el-radio-button-checked-border-color: var(--color-accent);
  --el-radio-button-checked-text-color: var(--color-accent-text);
}

.el-checkbox {
  --el-checkbox-checked-bg-color: var(--color-accent);
  --el-checkbox-checked-input-border-color: var(--color-accent);
  --el-checkbox-checked-icon-color: var(--color-accent-text); /* 对勾 */
  --el-checkbox-checked-text-color: var(--color-accent-deep); /* 标签文字 */
  --el-checkbox-input-border-color-hover: var(--color-accent);
}

.el-switch {
  --el-switch-on-color: var(--color-accent);
}

/* 输入框 / 多行文本：底色 --bg-card、描边 --border-color、圆角 8px、focus 转 accent
   —— 与 CommentInput.vue 的 tiptap 富文本框同源 */
.el-input,
.el-textarea {
  --el-input-text-color: var(--text-primary);
  --el-input-bg-color: var(--control-bg);
  --el-input-border-color: var(--control-border);
  --el-input-hover-border-color: var(--color-accent);
  --el-input-focus-border-color: var(--color-accent);
  --el-input-border-radius: var(--control-radius);
  --el-input-placeholder-color: var(--text-muted);
  --el-input-icon-color: var(--text-muted);
  --el-input-clear-hover-color: var(--text-secondary);
}
`;

/**
 * 生成完整的主题色覆盖 CSS（注入 <style> 用）。
 * 区分亮/暗两套变量，并同步 Element Plus 主色、组件外观与 ::selection 高亮。
 * 覆盖前台所有视觉相关变量，确保切换主题色时各组件联动。
 *
 * @param input 各维度主题色（每维一个 hex，可选）
 */
export const buildThemeColorCss = (input?: ThemeColorInput): string => {
  const { light, dark } = resolveThemeColor(input);
  // ⚠️ EP 主色取的是 **文字档**（accentDeep）而非装饰档（accent）：
  // EP 把 --el-color-primary 更多当**文字色**用（tag / checkbox 标签 / link /
  // 选中项 / 分页当前页），拿亮色的装饰档去喂它会让这些地方全部掉到 3 点几比一。
  // 「填充型」组件（主按钮 / radio-button / checkbox / switch）已在
  // ELEMENT_PLUS_COMPONENTS 里单独指向 --color-accent + --color-accent-text。
  const elLight = computeElementPlusLevels(light.accentDeep);
  const elDark = computeElementPlusLevels(dark.accentDeep);
  const lightSelection = hexToRgb(light.accent);
  const darkSelection = hexToRgb(dark.accent);

  return `
${variantToBlock(":root", light, elLight, false)}
${variantToBlock("html.dark", dark, elDark, true)}
${ELEMENT_PLUS_COMPONENTS}
${lightSelection ? `::selection { background: ${toRgba(lightSelection, 0.3)}; }` : ""}
${darkSelection ? `html.dark ::selection { background: ${toRgba(darkSelection, 0.3)}; }` : ""}
`;
};
