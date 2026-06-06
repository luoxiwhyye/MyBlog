import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { buildCanonicalUrl, normalizeUrl, truncateText } from "~/utils/seo";

interface PageSeoOptions {
  title?: MaybeRefOrGetter<string | undefined>;
  description?: MaybeRefOrGetter<string | undefined>;
  image?: MaybeRefOrGetter<string | undefined>;
  type?: MaybeRefOrGetter<"website" | "article">;
  keywords?: MaybeRefOrGetter<string | undefined>;
  publishedTime?: MaybeRefOrGetter<string | undefined>;
  modifiedTime?: MaybeRefOrGetter<string | undefined>;
  articleTags?: MaybeRefOrGetter<string[] | undefined>;
}

export const usePageSeo = (options: PageSeoOptions = {}) => {
  const route = useRoute();
  const runtimeConfig = useRuntimeConfig();
  const settingsStore = useSettingsStore();
  const bloggerStore = useBloggerStore();

  // 触发加载（不阻塞），computed 会随数据到达自动更新
  bloggerStore.ensureProfile();

  const siteUrl = computed(
    () => runtimeConfig.public.siteUrl || "http://localhost:3001",
  );
  const siteName = computed(
    () => settingsStore.getSetting("site_name") || "MyBlog",
  );
  const defaultDescription = computed(
    () =>
      settingsStore.getSetting("site_description") ||
      "一个专注于技术内容、笔记与生活记录的个人博客。",
  );
  const author = computed(() => bloggerStore.nickname());
  const favicon = computed(
    () =>
      normalizeUrl(
        settingsStore.getSetting("site_favicon") || "/favicon.svg",
        siteUrl.value,
      ) || `${siteUrl.value}/favicon.svg`,
  );
  const canonical = computed(() =>
    buildCanonicalUrl(siteUrl.value, route.fullPath || "/"),
  );
  const title = computed(() => toValue(options.title));
  const description = computed(() =>
    truncateText(toValue(options.description) || defaultDescription.value, 160),
  );
  const image = computed(() =>
    normalizeUrl(
      toValue(options.image) ||
        settingsStore.getSetting("site_logo") ||
        settingsStore.getSetting("site_favicon") ||
        "/favicon.svg",
      siteUrl.value,
    ),
  );
  const type = computed(() => toValue(options.type) || "website");
  const keywords = computed(() => toValue(options.keywords));
  const publishedTime = computed(() => toValue(options.publishedTime));
  const modifiedTime = computed(() => toValue(options.modifiedTime));
  const articleTags = computed(() => toValue(options.articleTags) || []);

  useHead(() => ({
    link: [
      { rel: "canonical", href: canonical.value },
      { rel: "icon", type: "image/svg+xml", href: favicon.value },
    ],
    meta: [
      ...(publishedTime.value
        ? [
            {
              property: "article:published_time",
              content: publishedTime.value,
            },
          ]
        : []),
      ...(modifiedTime.value
        ? [
            {
              property: "article:modified_time",
              content: modifiedTime.value,
            },
          ]
        : []),
      ...articleTags.value.map((tag) => ({
        property: "article:tag",
        content: tag,
      })),
    ],
  }));

  useSeoMeta({
    title: () => title.value,
    description: () => description.value,
    author: () => author.value,
    keywords: () => keywords.value,
    ogType: () => type.value,
    ogSiteName: () => siteName.value,
    ogTitle: () => title.value || siteName.value,
    ogDescription: () => description.value,
    ogUrl: () => canonical.value,
    ogImage: () => image.value || undefined,
    twitterCard: () => (image.value ? "summary_large_image" : "summary"),
    twitterTitle: () => title.value || siteName.value,
    twitterDescription: () => description.value,
    twitterImage: () => image.value || undefined,
  });
};
