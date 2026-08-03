import { fetchAllArticles, fetchAllCategories, fetchAllTags } from "~/server/utils/backend-api";
import { buildCanonicalUrl } from "~/utils/seo";

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

const toUrlEntry = (
  siteUrl: string,
  path: string,
  options: Omit<SitemapEntry, "loc"> = {},
): SitemapEntry => ({
  loc: buildCanonicalUrl(siteUrl, path),
  ...options,
});

const formatLastmod = (value?: string) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
};

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const siteUrl = runtimeConfig.public.siteUrl || "http://localhost:3001";

  const [articles, categories, tags] = await Promise.all([
    fetchAllArticles(),
    fetchAllCategories(),
    fetchAllTags(),
  ]);

  const entries: SitemapEntry[] = [
    toUrlEntry(siteUrl, "/", { changefreq: "daily", priority: "1.0" }),
    toUrlEntry(siteUrl, "/category", { changefreq: "weekly", priority: "0.8" }),
    toUrlEntry(siteUrl, "/tag", { changefreq: "weekly", priority: "0.8" }),
    toUrlEntry(siteUrl, "/archive", { changefreq: "weekly", priority: "0.7" }),
    toUrlEntry(siteUrl, "/about", { changefreq: "monthly", priority: "0.6" }),
    toUrlEntry(siteUrl, "/search", { changefreq: "weekly", priority: "0.4" }),
    ...categories.map((category) =>
      toUrlEntry(siteUrl, `/category/${category.id}`, {
        changefreq: "weekly",
        priority: "0.7",
      }),
    ),
    ...tags.map((tag) =>
      toUrlEntry(siteUrl, `/tag/${tag.id}`, {
        changefreq: "weekly",
        priority: "0.6",
      }),
    ),
    ...articles.map((article) =>
      toUrlEntry(siteUrl, `/article/${article.id}`, {
        lastmod: article.updatedAt || article.createdAt,
        changefreq: "monthly",
        priority: "0.9",
      }),
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) => `  <url>
    <loc>${entry.loc}</loc>
    ${formatLastmod(entry.lastmod) ? `<lastmod>${formatLastmod(entry.lastmod)}</lastmod>` : ""}
    ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : ""}
    ${entry.priority ? `<priority>${entry.priority}</priority>` : ""}
  </url>`,
  )
  .join("\n")}
</urlset>`;

  setHeader(event, "content-type", "application/xml; charset=utf-8");
  return xml;
});
