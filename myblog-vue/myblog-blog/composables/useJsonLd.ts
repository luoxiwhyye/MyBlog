/**
 * JSON-LD 结构化数据 composable
 *
 * 为搜索引擎提供结构化数据（Schema.org），支持：
 * - 文章页: BlogPosting
 * - 首页: WebSite + SearchAction
 */
import type { Article } from "~/types";

/**
 * 获取站点公共信息（用于 JSON-LD 的 publisher / author 等）
 */
const useSiteMeta = () => {
  const settingsStore = useSettingsStore();
  const bloggerStore = useBloggerStore();
  const runtimeConfig = useRuntimeConfig();

  const siteUrl = computed(
    () => runtimeConfig.public.siteUrl || "http://localhost:3001",
  );
  const siteName = computed(
    () => settingsStore.getSetting("site_name") || "MyBlog",
  );
  const siteDescription = computed(
    () =>
      settingsStore.getSetting("site_description") ||
      "一个专注于技术内容、笔记与生活记录的个人博客。",
  );
  const author = computed(() => bloggerStore.nickname());
  const siteLogo = computed(() => {
    const raw =
      settingsStore.getSetting("site_logo") ||
      settingsStore.getSetting("site_favicon") ||
      "/favicon.svg";
    try {
      return new URL(raw, siteUrl.value).toString();
    } catch {
      return raw;
    }
  });

  return { siteUrl, siteName, siteDescription, author, siteLogo };
};

/**
 * 文章页 JSON-LD (BlogPosting)
 * 在文章详情页 useHead 中调用
 */
export const useArticleJsonLd = (article: Ref<Article | null>) => {
  const { siteUrl, siteName, author, siteLogo } = useSiteMeta();

  const jsonLd = computed(() => {
    const a = article.value;
    if (!a) return null;

    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: a.title,
      description:
        a.summary || a.content?.replace(/<[^>]*>/g, "").slice(0, 200) || "",
      image: a.coverImage
        ? (() => {
            try {
              return new URL(a.coverImage, siteUrl.value).toString();
            } catch {
              return a.coverImage;
            }
          })()
        : undefined,
      datePublished: a.createdAt,
      dateModified: a.updatedAt || a.createdAt,
      author: {
        "@type": "Person",
        name: author.value,
      },
      publisher: {
        "@type": "Organization",
        name: siteName.value,
        logo: {
          "@type": "ImageObject",
          url: siteLogo.value,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${siteUrl.value}/article/${a.id}`,
      },
    };
  });

  useHead(() => ({
    script: jsonLd.value
      ? [
          {
            type: "application/ld+json",
            innerHTML: JSON.stringify(jsonLd.value),
          },
        ]
      : [],
  }));
};

/**
 * 面包屑导航 JSON-LD (BreadcrumbList)
 * 在文章详情页调用，提供 Schema.org 结构化数据。
 */
export const useBreadcrumbJsonLd = (
  items: Array<{ name: string; url: string }>,
) => {
  const { siteUrl } = useSiteMeta();

  const jsonLd = computed(() => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@id": item.url.startsWith("http")
          ? item.url
          : `${siteUrl.value}${item.url}`,
        name: item.name,
      },
    })),
  }));

  useHead(() => ({
    script: jsonLd.value
      ? [
          {
            type: "application/ld+json",
            innerHTML: JSON.stringify(jsonLd.value),
          },
        ]
      : [],
  }));
};

/**
 * 首页 JSON-LD (WebSite + SearchAction)
 * 在首页 useHead 中调用
 */
export const useWebsiteJsonLd = () => {
  const { siteUrl, siteName, siteDescription } = useSiteMeta();

  const jsonLd = computed(() => ({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName.value,
    description: siteDescription.value,
    url: siteUrl.value,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl.value}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }));

  useHead(() => ({
    script: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify(jsonLd.value),
      },
    ],
  }));
};
