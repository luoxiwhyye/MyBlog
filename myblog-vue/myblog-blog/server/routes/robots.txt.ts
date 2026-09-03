/**
 * robots.txt — 动态生成
 *
 * 依赖站点公开 URL（siteUrl）输出绝对路径 Sitemap；
 * 支持通过 settings 中的 `site_robots_disallow`（可选，分号/换行分隔的路径）追加
 * 禁止爬取的路径。未配置时默认允许全站，仅禁止后台/敏感路径。
 *
 * 访问路径：GET /robots.txt
 */

const normalizeDisallow = (raw?: string): string[] => {
  if (!raw) return [];
  return raw
    .split(/[;\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
};

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const siteUrl = runtimeConfig.public.siteUrl || "http://localhost:3001";

  // 从后端拉取站点信息（容错：失败则回退默认）
  let siteName = "MyBlog";
  let extraDisallow = "";
  try {
    const apiBase = (
      runtimeConfig.apiBase || "http://localhost:3000/api/v1"
    ).replace(/\/$/, "");
    const settingsResponse = await $fetch<{
      code: number;
      data: Record<string, { value: string }>;
    }>(`${apiBase}/settings`);
    const data = settingsResponse.data || {};
    siteName = data.site_name?.value || "MyBlog";
    extraDisallow = data.site_robots_disallow?.value || "";
  } catch {
    // 后端不可用时使用默认值
  }

  // 默认禁止后台登录与敏感路径
  const disallowPaths = [
    "/admin/",
    "/api/",
    "/login",
    ...normalizeDisallow(extraDisallow),
  ];

  const lines: string[] = [];
  lines.push(`# ${siteName} robots.txt`);
  lines.push("# Sitemap 由服务端动态生成");
  lines.push("User-agent: *");
  for (const path of disallowPaths) {
    lines.push(`Disallow: ${path}`);
  }
  lines.push("");
  lines.push(`Sitemap: ${siteUrl}/sitemap.xml`);

  const text = lines.join("\n");

  setHeader(event, "content-type", "text/plain; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=3600");
  return text;
});
