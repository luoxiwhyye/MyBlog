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
  /** --color-accent */
  accent: string;
  /** --color-accent-light（柔和背景/徽标底） */
  accentLight: string;
  /** --color-accent-deep（强调深色文字/描边） */
  accentDeep: string;
  /** --color-link */
  link: string;
  /** --color-category（分类徽标/强调） */
  category: string;
  /** --color-category-soft（徽标底） */
  categorySoft: string;
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

// 预设：当前博客设计（石墨青/动漫极简）—— 图A 日间 / 图B 夜间
const SLATE_LIGHT: ThemeColorVariant = {
  accent: "#475569",
  accentLight: "rgba(241, 245, 249, 0.9)",
  accentDeep: "#1e293b",
  link: "#475569",
  category: "#2e9aad",
  categorySoft: "rgba(14, 116, 144, 0.12)",
  fav: "#f59e0b",
  favSoft: "rgba(245, 158, 11, 0.22)",
  gradientBrand: "linear-gradient(135deg, #75e1f1, #bff4fa)",
  gradientBrandText: "#2e9aaa",
  hotRankGradient: "linear-gradient(135deg, #75e1f1, #aeeef8)",
  hotRankText: "#2e9aad",
  decoA: "rgba(143, 224, 232, 0.16)",
  decoB: "rgba(74, 155, 232, 0.14)",
  shadowGlow:
    "0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 30px rgba(120, 190, 240, 0.25)",
  textGlow: "0 2px 12px rgba(255, 255, 255, 0.45)",
};

const SLATE_DARK: ThemeColorVariant = {
  accent: "#cbd5e1",
  accentLight: "rgba(51, 65, 85, 0.9)",
  accentDeep: "#f1f5f9",
  link: "#94a3b8",
  category: "#2dd4bf",
  categorySoft: "rgba(45, 212, 191, 0.14)",
  fav: "#fbbf24",
  favSoft: "rgba(251, 191, 36, 0.2)",
  gradientBrand: "linear-gradient(135deg, #34d0c2, #4fc3f7)",
  gradientBrandText: "#04303a",
  hotRankGradient: "linear-gradient(135deg, #34d0c2, #4fc3f7)",
  hotRankText: "#04303a",
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
  accentDeep: "#115e59",
  link: "#0d9488",
  category: "#0f766e",
  categorySoft: "rgba(15, 118, 110, 0.12)",
  gradientBrand: "linear-gradient(135deg, #5eead4, #99f6e4)",
  gradientBrandText: "#115e59",
  hotRankGradient: "linear-gradient(135deg, #2dd4bf, #4fc3f7)",
  hotRankText: "#04303a",
  decoA: "rgba(45, 212, 191, 0.16)",
  decoB: "rgba(20, 184, 166, 0.14)",
  shadowGlow:
    "0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 30px rgba(45, 212, 191, 0.25)",
};
const MINT_DARK: ThemeColorVariant = {
  ...SLATE_DARK,
  accent: "#2dd4bf",
  accentLight: "rgba(45, 212, 191, 0.16)",
  accentDeep: "#042f2e",
  link: "#5eead4",
  category: "#5eead4",
  categorySoft: "rgba(94, 234, 212, 0.16)",
  gradientBrand: "linear-gradient(135deg, #2dd4bf, #4fc3f7)",
  gradientBrandText: "#022c27",
  hotRankGradient: "linear-gradient(135deg, #2dd4bf, #4fc3f7)",
  hotRankText: "#022c27",
  decoA: "rgba(45, 212, 191, 0.22)",
  decoB: "rgba(20, 184, 166, 0.18)",
  shadowGlow:
    "0 0 0 1px rgba(45, 212, 191, 0.25), 0 8px 30px rgba(4, 47, 46, 0.55)",
};

const AZURE_LIGHT: ThemeColorVariant = {
  ...SLATE_LIGHT,
  accent: "#2563eb",
  accentLight: "rgba(37, 99, 235, 0.12)",
  accentDeep: "#1e40af",
  link: "#2563eb",
  category: "#1d4ed8",
  categorySoft: "rgba(29, 78, 216, 0.12)",
  gradientBrand: "linear-gradient(135deg, #93c5fd, #bfdbfe)",
  gradientBrandText: "#1e3a8a",
  hotRankGradient: "linear-gradient(135deg, #60a5fa, #93c5fd)",
  hotRankText: "#1e3a8a",
  decoA: "rgba(96, 165, 250, 0.16)",
  decoB: "rgba(59, 130, 246, 0.14)",
  shadowGlow:
    "0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 30px rgba(96, 165, 250, 0.25)",
};
const AZURE_DARK: ThemeColorVariant = {
  ...SLATE_DARK,
  accent: "#60a5fa",
  accentLight: "rgba(96, 165, 250, 0.16)",
  accentDeep: "#172554",
  link: "#93c5fd",
  category: "#93c5fd",
  categorySoft: "rgba(147, 197, 253, 0.16)",
  gradientBrand: "linear-gradient(135deg, #3b82f6, #60a5fa)",
  gradientBrandText: "#0b2545",
  hotRankGradient: "linear-gradient(135deg, #3b82f6, #60a5fa)",
  hotRankText: "#0b2545",
  decoA: "rgba(96, 165, 250, 0.22)",
  decoB: "rgba(59, 130, 246, 0.18)",
  shadowGlow:
    "0 0 0 1px rgba(96, 165, 250, 0.25), 0 8px 30px rgba(23, 37, 84, 0.55)",
};

const WISTERIA_LIGHT: ThemeColorVariant = {
  ...SLATE_LIGHT,
  accent: "#7c3aed",
  accentLight: "rgba(124, 58, 237, 0.12)",
  accentDeep: "#5b21b6",
  link: "#7c3aed",
  category: "#8b5cf6",
  categorySoft: "rgba(139, 92, 246, 0.12)",
  gradientBrand: "linear-gradient(135deg, #c4b5fd, #ddd6fe)",
  gradientBrandText: "#4c1d95",
  hotRankGradient: "linear-gradient(135deg, #a78bfa, #c4b5fd)",
  hotRankText: "#4c1d95",
  decoA: "rgba(196, 181, 253, 0.16)",
  decoB: "rgba(167, 139, 250, 0.14)",
  shadowGlow:
    "0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 30px rgba(167, 139, 250, 0.25)",
};
const WISTERIA_DARK: ThemeColorVariant = {
  ...SLATE_DARK,
  accent: "#a78bfa",
  accentLight: "rgba(167, 139, 250, 0.16)",
  accentDeep: "#2e1065",
  link: "#c4b5fd",
  category: "#c4b5fd",
  categorySoft: "rgba(196, 181, 253, 0.16)",
  gradientBrand: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
  gradientBrandText: "#241349",
  hotRankGradient: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
  hotRankText: "#241349",
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
  accentDeep: "#92400e",
  link: "#d97706",
  category: "#b45309",
  categorySoft: "rgba(180, 83, 9, 0.12)",
  gradientBrand: "linear-gradient(135deg, #fbbf24, #fde68a)",
  gradientBrandText: "#78350f",
  hotRankGradient: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  hotRankText: "#78350f",
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
  accentDeep: "#451a03",
  link: "#fcd34d",
  category: "#f59e0b",
  categorySoft: "rgba(245, 158, 11, 0.16)",
  gradientBrand: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  gradientBrandText: "#451a03",
  hotRankGradient: "linear-gradient(135deg, #f59e0b, #fbbf24)",
  hotRankText: "#451a03",
  decoA: "rgba(251, 191, 36, 0.22)",
  decoB: "rgba(217, 119, 6, 0.18)",
  shadowGlow:
    "0 0 0 1px rgba(251, 191, 36, 0.25), 0 8px 30px rgba(69, 26, 3, 0.55)",
};

// 预设主题色：当前博客设计（石墨青 Slate）作为默认预设，其余贴合动漫极简风格
export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  {
    key: "slate",
    name: "石墨青（当前/默认）",
    value: "#475569",
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

const toRgba = (c: Rgb, alpha: number): string =>
  `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`;

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
  return {
    accent: baseHex,
    accentLight: isDark ? toRgba(darken(c, 0.35), 0.9) : toRgba(c, 0.1),
    accentDeep: rgbToHex(darken(c, isDark ? 0.15 : 0.4)),
    link: isDark ? rgbToHex(lighten(c, 0.35)) : baseHex,
  };
};

/** 分类徽标维度：category / category-soft（主色 = 传入 hex） */
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
  const text = isDark ? "#03211c" : rgbToHex(darken(c, 0.4));
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

const variantToBlock = (
  selector: string,
  v: ThemeColorVariant,
  el: ElementPlusLevels,
): string => `
${selector} {
  --color-accent: ${v.accent};
  --color-accent-light: ${v.accentLight};
  --color-accent-deep: ${v.accentDeep};
  --color-link: ${v.link};
  --color-category: ${v.category};
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
}`;

/**
 * 生成完整的主题色覆盖 CSS（注入 <style> 用）。
 * 区分亮/暗两套变量，并同步 Element Plus 主色与 ::selection 高亮。
 * 覆盖前台所有视觉相关变量，确保切换主题色时各组件联动。
 *
 * @param input 各维度主题色（每维一个 hex，可选）
 */
export const buildThemeColorCss = (input?: ThemeColorInput): string => {
  const { light, dark } = resolveThemeColor(input);
  const elLight = computeElementPlusLevels(light.accent);
  const elDark = computeElementPlusLevels(dark.accent);
  const lightSelection = hexToRgb(light.accent);
  const darkSelection = hexToRgb(dark.accent);

  return `
${variantToBlock(":root", light, elLight)}
${variantToBlock("html.dark", dark, elDark)}
${lightSelection ? `::selection { background: ${toRgba(lightSelection, 0.3)}; }` : ""}
${darkSelection ? `html.dark ::selection { background: ${toRgba(darkSelection, 0.3)}; }` : ""}
`;
};
