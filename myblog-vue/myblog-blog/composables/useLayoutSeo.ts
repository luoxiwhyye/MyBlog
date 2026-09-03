import { normalizeUrl } from "~/utils/seo";
import { normalizeAssetUrl } from "~/utils/image";
import {
  resolveThemeColor,
  buildThemeColorCss,
  type ThemeColorDimKey,
  type ThemeColorMode,
} from "~/utils/themeColor";

// 主题色各维度对应的设置键（前台按维度 + 模式独立读取）
// 键规则：site_theme_{dim}_{mode}，如 site_theme_accent_light
const THEME_COLOR_DIM_MODES: ThemeColorMode[] = ["light", "dark"];
const THEME_COLOR_DIM_KEYS: { dim: ThemeColorDimKey; key: string }[] = [
  { dim: "accent", key: "site_theme_accent" },
  { dim: "category", key: "site_theme_category" },
  { dim: "fav", key: "site_theme_fav" },
  { dim: "gradient", key: "site_theme_gradient" },
  { dim: "deco", key: "site_theme_deco" },
];

const themeColorKey = (dim: ThemeColorDimKey, mode: ThemeColorMode) =>
  `site_theme_${dim}_${mode}`;

/**
 * 布局级 SEO 共享 composable
 *
 * 从 default.vue / tools.vue 抽取，消除 ~150 行重复的 SEO 配置逻辑。
 * 所有布局只需调用 useLayoutSeo() 即可获得统一的 meta / link / bg 配置。
 */
export const useLayoutSeo = () => {
  const settingsStore = useSettingsStore();
  const bloggerStore = useBloggerStore();
  const runtimeConfig = useRuntimeConfig();

  const siteName = computed(
    () => settingsStore.getSetting("site_name") || "MyBlog",
  );
  const siteDescription = computed(
    () =>
      settingsStore.getSetting("site_description") ||
      "一个专注于技术内容、笔记与生活记录的个人博客。",
  );
  const siteAuthor = computed(() => bloggerStore.nickname());
  const siteLogo = computed(() =>
    normalizeUrl(
      normalizeAssetUrl(
        settingsStore.getSetting("site_logo") ||
          settingsStore.getSetting("site_favicon") ||
          "/favicon.svg",
      ),
      runtimeConfig.public.siteUrl,
    ),
  );
  const siteFavicon = computed(
    () =>
      normalizeUrl(
        normalizeAssetUrl(
          settingsStore.getSetting("site_favicon") || "/favicon.svg",
        ),
        runtimeConfig.public.siteUrl,
      ) || "/favicon.svg",
  );

  // 背景图归一化：localhost 前缀转相对路径，手机/局域网访问可正常加载
  const bgLight = computed(() =>
    normalizeAssetUrl(settingsStore.getSetting("site_bg_light")),
  );
  const bgDark = computed(() =>
    normalizeAssetUrl(settingsStore.getSetting("site_bg_dark")),
  );

  const setBgVar = (name: string, url: string) => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty(
      name,
      url ? `url(${url})` : "none",
    );
  };

  // 品牌主色：按 5 个维度 × 亮/暗模式独立读取，未配置回退默认预设（当前设计）。
  // 通过注入 <style> 以区分亮/暗两套变量。
  const themeColorInput = computed(() => {
    const input: Record<ThemeColorDimKey, { light: string; dark: string }> = {
      accent: { light: "", dark: "" },
      category: { light: "", dark: "" },
      fav: { light: "", dark: "" },
      gradient: { light: "", dark: "" },
      deco: { light: "", dark: "" },
    };
    for (const { dim } of THEME_COLOR_DIM_KEYS) {
      for (const mode of THEME_COLOR_DIM_MODES) {
        input[dim][mode] = settingsStore.getSetting(themeColorKey(dim, mode));
      }
    }
    return input;
  });
  const resolvedTheme = computed(() =>
    resolveThemeColor(themeColorInput.value),
  );
  const themeColorLight = computed(() => resolvedTheme.value.light.accent);
  const themeColorDark = computed(() => resolvedTheme.value.dark.accent);

  const applyThemeColor = () => {
    if (typeof document === "undefined") return;
    let styleEl = document.getElementById(
      "__blog_theme_color",
    ) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "__blog_theme_color";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = buildThemeColorCss(themeColorInput.value);
  };

  watchEffect(() => {
    setBgVar("--site-bg-light", bgLight.value);
    setBgVar("--site-bg-dark", bgDark.value);
    applyThemeColor();
  });

  useHead(() => ({
    titleTemplate: (titleChunk: string | undefined) =>
      titleChunk ? `${titleChunk} | ${siteName.value}` : siteName.value,
    meta: [
      { name: "description", content: siteDescription.value },
      { property: "og:locale", content: "zh_CN" },
      { property: "og:site_name", content: siteName.value },
      { property: "og:title", content: siteName.value },
      { property: "og:description", content: siteDescription.value },
      { property: "og:type", content: "website" },
      ...(siteLogo.value
        ? [{ property: "og:image", content: siteLogo.value }]
        : []),
      {
        name: "twitter:card",
        content: siteLogo.value ? "summary_large_image" : "summary",
      },
      { name: "twitter:title", content: siteName.value },
      { name: "twitter:description", content: siteDescription.value },
      ...(siteLogo.value
        ? [{ name: "twitter:image", content: siteLogo.value }]
        : []),
      { name: "author", content: siteAuthor.value },
      { name: "theme-color", content: themeColorLight.value },
      {
        name: "theme-color",
        media: "(prefers-color-scheme: dark)",
        content: themeColorDark.value,
      },
    ],
    link: [{ rel: "icon", href: siteFavicon.value }],
  }));

  return {
    siteName,
    siteDescription,
    siteAuthor,
    siteLogo,
    siteFavicon,
    bgLight,
    bgDark,
  };
};
