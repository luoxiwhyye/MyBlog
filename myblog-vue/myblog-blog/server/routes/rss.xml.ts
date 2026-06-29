/**
 * RSS 2.0 / Atom Feed 生成
 *
 * 对标 F-02：为博客提供标准 RSS 订阅源。
 * 访问路径：GET /rss.xml
 */

import { fetchAllArticles } from "~/server/utils/backend-api";
import { buildCanonicalUrl } from "~/utils/seo";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toRFC822 = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toUTCString();
};

const toISO = (value?: string) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const siteUrl = runtimeConfig.public.siteUrl || "http://localhost:3001";

  const articles = await fetchAllArticles();

  // 站点信息（硬编码默认值，由 settings 存储驱动）
  const siteTitle = "MyBlog";
  const siteDescription = "个人技术博客";

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${siteUrl}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${toRFC822(articles[0]?.createdAt || new Date().toISOString())}</lastBuildDate>
    <generator>MyBlog Nuxt 3</generator>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${articles
  .slice(0, 50)
  .map(
    (article) => `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${buildCanonicalUrl(siteUrl, `/article/${article.id}`)}</link>
      <guid isPermaLink="true">${buildCanonicalUrl(siteUrl, `/article/${article.id}`)}</guid>
      <description>${escapeXml(article.summary || article.title)}</description>
      <dc:creator>${escapeXml(article.type?.typeName || "")}</dc:creator>
      <pubDate>${toRFC822(article.createdAt)}</pubDate>
      ${toISO(article.updatedAt) ? `<atom:updated>${toISO(article.updatedAt)}</atom:updated>` : ""}
    </item>`,
  )
  .join("\n")}
  </channel>
</rss>`;

  setHeader(event, "content-type", "application/rss+xml; charset=utf-8");
  // 缓存 1 小时
  setHeader(event, "cache-control", "public, max-age=3600");
  return rss;
});
