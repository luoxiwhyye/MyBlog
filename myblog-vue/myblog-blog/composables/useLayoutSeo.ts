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

// ────────────────────────────────────────────────────────────────
// 背景图存在性预检（模块级共享）
//
// 背景图 URL 存在数据库里，文件却可能已经不在磁盘上了（历史缺陷：替换图片时
// 只比字符串就删旧文件，会误删仍被其它配置键引用的图）。此时若照常注入 CSS
// 变量，浏览器会持续请求一个 404，而布局的 `background-image:
// var(--site-bg-light)` 又没有回退值 → 页面背景直接失效。
//
// 解法：用 `new Image()` 预检，确认失联则不注入变量，由布局自身的
// `background-color: var(--bg-primary)` 兜底：不留白，也不再重复请求。
//
// 探测结果按 URL 缓存在模块级（同一 URL 只探测一次，多个布局、多次导航共用）；
// 尚未出结果的 URL 按“可用”处理（乐观），否则正常图片会在首帧被白白推迟。
type BgProbeState = "ok" | "bad";
const bgProbeResults = ref<Record<string, BgProbeState | undefined>>({});
const bgProbePending = new Set<string>();

const probeBgUrl = (url: string) => {
  // 已出结果或正在探测 → 不重复发请求
  if (!url || bgProbePending.has(url) || url in bgProbeResults.value) return;
  if (typeof window === "undefined" || typeof Image === "undefined") return;

  bgProbePending.add(url);

  const settle = (state: BgProbeState) => {
    bgProbePending.delete(url);
    // 整体替换对象以触发响应式更新，让 watchEffect 重新注入变量
    bgProbeResults.value = { ...bgProbeResults.value, [url]: state };
  };

  const probe = new Image();
  probe.onload = () => settle("ok");
  probe.onerror = () => settle("bad");
  probe.src = url;
};

/**
 * 取「已验证可用」的背景图 URL。
 * 未配置、或已确认失联时返回空串，由调用方移除 CSS 变量，
 * 使 `var()` 回退链与布局兜底色生效。
 */
const resolveBgUrl = (url: string) => {
  if (!url) return "";
  probeBgUrl(url);
  return bgProbeResults.value[url] === "bad" ? "" : url;
};

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
  // 移动端背景图（可选）：键不存在时 getSetting 返回 ''，由 CSS 回退到桌面图
  const bgLightMobile = computed(() =>
    normalizeAssetUrl(settingsStore.getSetting("site_bg_light_mobile")),
  );
  const bgDarkMobile = computed(() =>
    normalizeAssetUrl(settingsStore.getSetting("site_bg_dark_mobile")),
  );

  /**
   * 注入背景图 CSS 变量：未配置或图片不可用时**移除变量**，而不是写 `none`。
   *
   * 原因：`none` 是合法的 background-image 值，一旦写入，
   * `var(--site-bg-dark, var(--site-bg-light))` 这类回退链就不会生效——
   * 例如暗色背景图缺失时，本来应该回退到亮色图，写 `none` 就变成什么都没有了。
   * 移除属性后，`var()` 的第二个参数（桌面图 / 亮色图）才能真正生效。
   */
  const setBgVar = (name: string, url: string) => {
    if (typeof document === "undefined") return;
    if (url) {
      document.documentElement.style.setProperty(name, `url(${url})`);
    } else {
      document.documentElement.style.removeProperty(name);
    }
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
    // 先过一遍存在性预检：确认失联的图不注入，交给布局兜底色
    setBgVar("--site-bg-light", resolveBgUrl(bgLight.value));
    setBgVar("--site-bg-dark", resolveBgUrl(bgDark.value));
    setBgVar("--site-bg-light-mobile", resolveBgUrl(bgLightMobile.value));
    setBgVar("--site-bg-dark-mobile", resolveBgUrl(bgDarkMobile.value));
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
    bgLightMobile,
    bgDarkMobile,
  };
};
