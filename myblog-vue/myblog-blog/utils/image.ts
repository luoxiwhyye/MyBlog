// ============================================
// utils/image.ts - 图片 URL 处理工具
// 与后端 sharpConverter 生成的 WebP 变体配合：
//   xxx.webp        主图（1200px, q80）
//   xxx_thumb.webp  缩略图（400px, q70）
// ============================================

// 开发环境后端返回的完整 URL 基于 localhost（如 http://localhost:3000/uploads/...）。
// 手机/局域网访问时，浏览器会把 localhost 解析到访客自身导致图片加载失败，
// 因此统一归一化为相对路径，由 Nuxt 的 /uploads/** 代理转发到后端。
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;

/**
 * 将本地回环地址前缀的图片 URL 归一化为相对路径（其他 URL 原样返回）
 */
export const normalizeAssetUrl = (url?: string) => {
  if (!url) return "";
  if (LOCAL_ORIGIN_PATTERN.test(url)) {
    return url.replace(LOCAL_ORIGIN_PATTERN, "");
  }
  return url;
};

/**
 * 归一化富文本正文中的图片 URL（v-html 渲染前调用）
 */
export const normalizeContentUrls = (content?: string) => {
  if (!content) return "";
  return content.replace(
    /src=(["'])https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//gi,
    "src=$1/",
  );
};

/** 上传资源路径（`nuxt.config.ts` 的 routeRules 把它代理到后端）；保留查询串、丢掉锚点 */
const UPLOADS_PATH = /\/uploads\/[^\s#]*/;

/**
 * 转成「站点域名下的绝对地址」，供 SEO 元数据使用（`og:image` / `twitter:image` / JSON-LD）。
 *
 * ⚠️ 不能直接用 `new URL(图片地址, siteUrl)`：库里的图片地址是**后端拼的绝对地址**
 * （`APP_BASE_URL` + `/uploads/...`），值已是绝对时 `siteUrl` 完全不生效 ——
 * 分享卡片与结构化数据就会指到后端源（那是另一个域名，且未必对外可达）。
 * 而 `/uploads/**` 由前台站点自己代理，所以这类地址一律**取路径再拼 siteUrl**。
 *
 * 其他地址（外链 / 站点内相对路径 / favicon）保持原语义：先归一化 localhost 前缀，再按 siteUrl 解析。
 */
export const toSiteAbsoluteUrl = (url?: string, siteUrl?: string) => {
  if (!url) return "";
  const base = siteUrl || "/";
  const uploadsPath = url.match(UPLOADS_PATH)?.[0];
  try {
    return new URL(uploadsPath || normalizeAssetUrl(url), base).toString();
  } catch {
    return url;
  }
};

/**
 * 后端（sharp / webp-imageio）**会**为其生成 WebP 变体的原图扩展名。
 *
 * 不在此列的都不推导：
 *   - `.svg` 等矢量图：后端不生成变体，推导出来必然 404（favicon 就是 svg）；
 *   - `.webp` / `.avif`：本身就是目标格式，后端不重复转换。
 */
const DERIVABLE_RASTER = /\.(jpe?g|png|gif|bmp|tiff?|heic|heif)(\?.*)?$/i;

/** 把「最后一个扩展名」换成变体名；不可派生时原样返回 */
const toVariantUrl = (url: string, variant: string) =>
  DERIVABLE_RASTER.test(url)
    ? url.replace(DERIVABLE_RASTER, `${variant}$2`)
    : url;

/**
 * 由原图 URL 推导缩略图 WebP URL（不可派生的图原样返回）。
 *
 * ⚠️ 即使可派生，变体也可能不存在（sharp 未安装 / 变体文件被删）——
 * **页面里不要直接绑这个函数**，用 `useSmartImage()`（推导 + `@error` 回退原图）。
 */
export const getThumbWebpUrl = (url?: string) =>
  url ? toVariantUrl(url, "_thumb.webp") : "";

/**
 * 由原图 URL 推导主图 WebP URL（不可派生的图原样返回）。
 *
 * ⚠️ 同 {@link getThumbWebpUrl}：请配合 `useSmartImage()` 使用。
 */
export const getWebpUrl = (url?: string) =>
  url ? toVariantUrl(url, ".webp") : "";

/**
 * 响应式图片：基于后端的两种 WebP 变体（400px 缩略图 / 1200px 主图）生成 srcset。
 * 供 <img :src :srcset :sizes> 使用，让浏览器按容器宽度自动选图，避免固定载入大图。
 *
 * 派生不出第二个尺寸时（原图本身是 .webp / .avif，或 svg 这类矢量图）退化为
 * 单一来源，`srcset` 为空 —— 否则会在 srcset 里放一个必然 404 的候选。
 */
export const buildSrcSet = (
  url?: string,
  sizes = "100vw",
): { src: string; srcset: string; sizes: string } => {
  const raw = normalizeAssetUrl(url);
  if (!raw) return { src: "", srcset: "", sizes };
  const thumb = getThumbWebpUrl(raw);
  const full = getWebpUrl(raw);
  if (thumb === raw && full === raw) return { src: raw, srcset: "", sizes };
  return {
    src: full,
    srcset: `${thumb} 400w, ${full} 1200w`,
    sizes,
  };
};
