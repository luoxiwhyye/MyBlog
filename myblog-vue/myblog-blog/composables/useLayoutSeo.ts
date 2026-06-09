import { normalizeUrl } from "~/utils/seo";

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
      settingsStore.getSetting("site_logo") ||
        settingsStore.getSetting("site_favicon") ||
        "/favicon.svg",
      runtimeConfig.public.siteUrl,
    ),
  );
  const siteFavicon = computed(
    () =>
      normalizeUrl(
        settingsStore.getSetting("site_favicon") || "/favicon.svg",
        runtimeConfig.public.siteUrl,
      ) || "/favicon.svg",
  );

  const bgLight = computed(() => settingsStore.getSetting("site_bg_light"));
  const bgDark = computed(() => settingsStore.getSetting("site_bg_dark"));

  const setBgVar = (name: string, url: string) => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty(
      name,
      url ? `url(${url})` : "none",
    );
  };

  watchEffect(() => {
    setBgVar("--site-bg-light", bgLight.value);
    setBgVar("--site-bg-dark", bgDark.value);
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
