// ============================================
// utils/themeColor.ts - 博客品牌主色工具
// 主色全部走 CSS 变量，后台可在「外观与品牌」切换；
// 未配置或非法时回退到默认预设（晴空青）。
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
   * 因此写死 `color: #ffffff` 在暗色下会变成"白字压亮青"。
   * 本字段用于填充式按钮/徽标的前景。
   *
   * 通常**无需显式赋值**：buildThemeColorCss 按当前主题推导
   *（亮色固定白字、暗色推同色系深字，见 fillTextOn）。
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

// 默认预设（晴空青）。
// ⚠️ 本预设必须与 assets/css/themes/_light.scss / _dark.scss 的静态回退值逐项一致。
// ⚠️ 历次品牌色调整的过程记录（谁反馈了什么、试过什么）已抽到
//    documents/design-documents/design-token-history.md；本文件只留「当前规则」。
const SLATE_LIGHT: ThemeColorVariant = {
  // 亮色填充取天空湖青，填充面配白字（见 fillTextOn）
  accent: "#008fbe",
  accentLight: "rgba(0, 143, 190, 0.14)",
  // 文字/描边档：填充同色相压深 —— 链接 / 图标 / 当前选中 / 所有边框与 focus
  accentDeep: "#0b5c82",
  link: "#0b5c82",
  // 分类图形档：与填充同色相但再压深一档（它当边框 / 圆点用，要守非文本 3:1，不能与填充同色）
  category: "#147fa8",
  categorySoft: "rgba(20, 127, 168, 0.14)",
  fav: "#f59e0b",
  favSoft: "rgba(245, 158, 11, 0.22)",
  gradientBrand: "linear-gradient(135deg, #61c9e5, #c5eaf5)",
  gradientBrandText: "#174e68",
  hotRankGradient: "linear-gradient(135deg, #53b9d8, #b7e4f1)",
  hotRankText: "#174e68",
  decoA: "rgba(97, 201, 229, 0.18)",
  decoB: "rgba(147, 119, 206, 0.14)",
  shadowGlow:
    "0 0 0 1px rgba(241, 249, 255, 0.64), 0 8px 30px rgba(22, 143, 190, 0.22)",
  textGlow: "0 2px 12px rgba(255, 255, 255, 0.45)",
};

const SLATE_DARK: ThemeColorVariant = {
  accent: "#22d3ee",
  accentLight: "rgba(34, 211, 238, 0.16)",
  accentDeep: "#7dd3fc",
  link: "#7dd3fc",
  category: "#22d3ee",
  categorySoft: "rgba(34, 211, 238, 0.16)",
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

// 预设主题色：当前博客设计（晴空青 Slate）作为默认预设，其余贴合动漫极简风格
// ⚠️ 预设的 value 是「accent 亮色值」：后台一键应用预设、以及 THEME_COLOR_PRESET_MAP
//（admin Settings.vue）的键都靠它对应，改名/改值必须两处同步。
export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  {
    key: "slate",
    name: "晴空青（当前/默认）",
    value: "#008fbe",
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
 * 去彩度（往「通道均值」靠），用于品牌**文字/描边档**：
 * 全站其余文字都是低饱和灰蓝，文字盘保留满饱和会显得笑兀。
 */
const mute = (c: Rgb, weight: number): Rgb => {
  const avg = (c.r + c.g + c.b) / 3;
  return mix(c, { r: avg, g: avg, b: avg }, weight);
};

const toRgba = (c: Rgb, alpha: number): string =>
  `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`;

/** sRGB 相对亮度（WCAG 2.x 定义），用于判断前景该用白还是深色 */
const relativeLuminance = ({ r, g, b }: Rgb): number => {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** WCAG 对比度 */
const contrastRatio = (a: Rgb, b: Rgb): number => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/**
 * 填充面上的**前景色**。
 *
 * - 亮色：固定白字。亮色填充是高饱和蓝绿，白字与它是同一档强度的对比。
 * - 暗色：填充本身是亮青，白字会糊在一起 → 用 `deepTextOn` 推一个同色系深字。
 *
 * @param fill 填充底色
 * @param isDark 当前是否为暗色主题
 */
const fillTextOn = (fill: Rgb, isDark: boolean): string =>
  isDark ? deepTextOn(fill) : "#ffffff";

/**
 * 在给定底色上取**同色系深字**：保持色相、把明度压到刚好达标（步长 0.01，
 * 命中即返回 —— 要的是「刚好达标」而不是「越深越好」，粗步长会白丢一截彩度与亮度）。
 *
 * @param bg 底色
 * @param target 目标对比度（默认 4.6，略高于 AA 下限以留余量）
 */
const deepTextOn = (bg: Rgb, target = 4.6): string => {
  for (let w = 0.3; w <= 0.96; w += 0.01) {
    const c = darken(bg, Number(w.toFixed(2)));
    if (contrastRatio(c, bg) >= target) return rgbToHex(c);
  }
  return rgbToHex(darken(bg, 0.96));
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
  // 填充/高亮档 = 用户/预设给的标称主色**原样使用**（后台取色器选什么就是什么）。
  const accent = c;
  // accentDeep 兼作「文字 / 描边档」：链接、图标、以及**所有边框 / focus**。
  // 亮色压深、暗色提亮，且只做极少量去彩度（mute 0.1）—— 品牌色要「鲜亮」。
  const deep = mute(isDark ? lighten(c, 0.35) : darken(c, 0.4), 0.1);
  return {
    accent: rgbToHex(accent),
    accentLight: toRgba(accent, isDark ? 0.16 : 0.14),
    accentDeep: rgbToHex(deep),
    // 链接必须走文字档：accent 本体（填充档）作文字普遍只有 3 点几比一
    link: rgbToHex(deep),
  };
};

/**
 * 分类维度：category（图形）+ category-soft（徽标底）。
 *
 * ⚠️ **不产出 categoryStrong**：分类色的**文字档直接复用 accent 的文字档**
 *（见 variantToBlock 的回退）—— 全站品牌文字只保留**一个**颜色；
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
 * 方向按**填充面实际用的前景**反推，两种情形对比度都只会变大：
 * - 前景比填充亮（白字）→ 压深（朝黑）
 * - 前景比填充暗（同色系深字）→ 提亮（朝白）
 */
const interactionLevels = (accentHex: string, isDark: boolean) => {
  const rgb =
    hexToRgb(accentHex) || (hexToRgb(DEFAULT_THEME_COLOR_VALUE) as Rgb);
  const fg = hexToRgb(fillTextOn(rgb, isDark)) as Rgb;
  const toward = relativeLuminance(fg) > relativeLuminance(rgb) ? BLACK : WHITE;
  return {
    hover: rgbToHex(mix(rgb, toward, 0.12)),
    active: rgbToHex(mix(rgb, toward, 0.24)),
  };
};

const variantToBlock = (
  selector: string,
  v: ThemeColorVariant,
  el: ElementPlusLevels,
  isDark: boolean,
): string => {
  const inter = interactionLevels(v.accent, isDark);
  // 二级/幽灵按钮的**不透明品牌浅面**：跟主色派生（后台换色自动跟随）。
  // ⚠️ 必须是**不透明**的，不能用 --color-accent-light（半透明叠在背景图暗区上时，
  //    品牌深字会随之掉到读不清）。
  const accentRgb = parseHex(v.accent) ?? WHITE;
  const softSurface = rgbToHex(
    isDark
      ? mix(accentRgb, { r: 15, g: 23, b: 41 }, 0.84)
      : mix(accentRgb, WHITE, 0.9),
  );
  return `
${selector} {
  --color-accent: ${v.accent};
  --color-accent-light: ${v.accentLight};
  --color-accent-deep: ${v.accentDeep};
  --surface-brand-soft: ${softSurface};
  --color-accent-text: ${v.accentText || fillTextOn(accentRgb, isDark)};
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
  --el-border-color-hover: var(--color-accent-deep);
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
/* 次要按钮：**品牌浅底 + 品牌文字档**，与主按钮是同一个色族的深浅两档 */
.el-button {
  --el-button-bg-color: var(--surface-brand-soft);
  --el-button-border-color: var(--color-accent-deep);
  --el-button-text-color: var(--color-accent-deep);
  --el-button-hover-bg-color: var(--color-accent);
  --el-button-hover-border-color: var(--color-accent);
  --el-button-hover-text-color: var(--color-accent-text);
  --el-button-active-bg-color: var(--color-accent-hover);
  --el-button-active-border-color: var(--color-accent-hover);
  --el-button-active-text-color: var(--color-accent-text);
  /* 禁用态：褪到中性——不能再带品牌色，否则与可用态只差文字色 */
  --el-button-disabled-bg-color: var(--bg-hover);
  --el-button-disabled-border-color: var(--border-light);
  --el-button-disabled-text-color: var(--text-muted);
}

/* 主按钮：品牌填充面 + --color-accent-text（见 fillTextOn）。
   不要用 EP 的硬白 --el-color-white：它在暗色下会变成白字压亮青。 */
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
  --el-button-border-color: var(--color-accent-deep);
  --el-button-text-color: var(--color-accent-deep);
  --el-button-hover-bg-color: var(--color-accent);
  --el-button-hover-border-color: var(--color-accent-deep);
  --el-button-hover-text-color: var(--color-accent-text);
  --el-button-active-bg-color: var(--color-accent-active);
  --el-button-active-border-color: var(--color-accent-active);
  --el-button-active-text-color: var(--color-accent-text);
}

.el-button--primary.is-disabled,
.el-button--primary.is-disabled:hover {
  --el-button-disabled-bg-color: var(--bg-hover);
  --el-button-disabled-border-color: var(--border-light);
  --el-button-disabled-text-color: var(--text-muted);
}

/* 暗色主按钮：**半透明品牌底 + 品牌描边 + 品牌文字档**，hover 才填实 + 发光。
   暗色卡是半透明玻璃，实心亮青压在它上面像一块塑料；底色透出卡与背景图时才「悬浮」。
   ⚠️ 只有暗色这样做，亮色是实心填充：亮色卡底会随背景图漂移，半透明填充上的白字
   在最坏情况下会压在很浅的底上。
   ⚠️ 必须带 html.dark 前缀：EP 把 --el-button-* 声明在 .el-button--primary 元素上，
   只靠「后写者胜」压不住，要同时拿到更高特异性。
   ⚠️ 这里不碰 --el-button-disabled-*，禁用态继续回中性（见上面的 .is-disabled 规则）。 */
html.dark .el-button--primary {
  --el-button-bg-color: var(--color-accent-light);
  --el-button-border-color: var(--color-accent-deep);
  --el-button-text-color: var(--color-accent-deep);
  --el-button-hover-bg-color: var(--color-accent);
  --el-button-hover-border-color: var(--color-accent);
  --el-button-hover-text-color: var(--color-accent-text);
  --el-button-active-bg-color: var(--color-accent-hover);
  --el-button-active-border-color: var(--color-accent-hover);
  --el-button-active-text-color: var(--color-accent-text);
}

/* 悬停才给「外发光」——静态时按钮不该自己发光抢注意力 */
html.dark .el-button--primary:not(.is-disabled):hover {
  box-shadow: 0 0 12px var(--color-accent-light);
}

/* 幽灵按钮（EP link 档）：透明底、行内低强调，hover 加品牌浅底 + 品牌文字档 */
.el-button.is-link {
  --el-button-text-color: var(--color-accent-deep);
  --el-button-hover-text-color: var(--color-accent-deep);
}
.el-button.is-link:hover {
  background: var(--color-accent-light);
}

/* ===== 分段控制器（EP el-radio-button）=====
   EP 默认是「实心填充 + 硬白字」，相邻段之间还靠 -1px 外阴影画分隔线；一屏里
   出现一排实心亮块，会比卡里的主操作还抢眼。这里改成经典分段控制器：
   外层是玻璃胶囊（轨道），选中项是一枚**半透明**品牌色滑块。
   ⚠️ 滑块用 --color-accent-light 而不是 --color-accent：填充档是留给主操作的。
   ⚠️ 选择器一律带 .el-radio-group 前缀：EP 的 first/last-child 规则（0,3,0）比
   单独的 .el-radio-button__inner（0,1,0）更具体，不叠前缀压不住它们的分隔线与方角。 */
.el-radio-group {
  padding: 3px;
  border-radius: 999px;
  background: var(--bg-card);
  box-shadow: inset 0 0 0 1px var(--glass-border);
}

.el-radio-group .el-radio-button .el-radio-button__inner {
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-secondary);
  /* EP 用 -1px 外阴影做相邻段的分隔线，分段落器靠轨道底色区分，不需要它 */
  box-shadow: none;
}

.el-radio-group
  .el-radio-button
  .el-radio-button__original-radio:checked
  + .el-radio-button__inner {
  background: var(--color-accent-light);
  color: var(--color-accent-deep);
  box-shadow: none;
}

/* 悬停只提亮文字：hover 不等于已选中，提前填实会误导 */
.el-radio-group .el-radio-button .el-radio-button__inner:hover {
  color: var(--color-accent-deep);
}

/* ===== 其它「选中态填充」型 EP 组件 =====
   EP 默认用 --el-color-primary 填充 + **硬白字/硬白勾**（如 .el-checkbox 的
   --el-checkbox-checked-icon-color）。硬色不跟主题 → 一律改指
   accent 填充 + --color-accent-text。
   注：--el-color-primary 本身保持**文字档**（见 buildThemeColorCss），
   因为 EP 把 primary 更多地当文字色用（tag / checkbox 标签 / link / 选中项）。 */
.el-checkbox {
  --el-checkbox-checked-bg-color: var(--color-accent);
  --el-checkbox-checked-input-border-color: var(--color-accent);
  --el-checkbox-checked-icon-color: var(--color-accent-text); /* 对勾 */
  --el-checkbox-checked-text-color: var(--color-accent-deep); /* 标签文字 */
  --el-checkbox-input-border-color-hover: var(--color-accent-deep);
}

.el-switch {
  --el-switch-on-color: var(--color-accent);
}

/* 输入框 / 多行文本：底色 --bg-card-solid、描边 --control-border（= 文字/描边档）、
   圆角 8px、focus 加深 —— 与 CommentInput.vue 的 tiptap 富文本框同源。
   ⚠️ 描边一律用 --color-accent-deep（**不能用填充档**：填充档为「真高亮」而生，
   压在浅卡上只有 1.9:1，连非文本 3:1 都不到）。 */
.el-input,
.el-textarea {
  --el-input-text-color: var(--text-primary);
  --el-input-bg-color: var(--control-bg);
  --el-input-border-color: var(--control-border);
  --el-input-hover-border-color: var(--color-accent-deep);
  --el-input-focus-border-color: var(--color-accent-deep);
  --el-input-border-radius: var(--control-radius);
  --el-input-placeholder-color: var(--text-muted);
  --el-input-icon-color: var(--text-muted);
  --el-input-clear-hover-color: var(--text-secondary);
}

/* 聚焦态：默认描边已经是 accent-deep（--control-border），若 focus 仍只是 EP 的
   1px 内边就与默认态完全同色、看不出「现在在哪个框里」。
   改成「2px 实边 + 3px 半透明外环」——靠线宽与外环面积区分，不靠换色，
   所以无论主题色怎么变都不会退化成同色。
   ⚠️ 本规则不写 !important、也不抬高特异性：EP 的超限态是
   .el-input.is-exceed .el-input__wrapper（0,3,0），要让它继续赢。 */
.el-input__wrapper.is-focus {
  box-shadow: 0 0 0 2px var(--color-accent) inset, 0 0 0 3px var(--color-accent-light);
}

.el-textarea__inner:focus {
  box-shadow: 0 0 0 2px var(--color-accent) inset, 0 0 0 3px var(--color-accent-light);
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
