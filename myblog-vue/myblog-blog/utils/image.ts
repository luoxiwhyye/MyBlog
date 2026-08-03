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

/**
 * 由原图 URL 推导缩略图 WebP URL。
 * 注意：上传时若原图本身是 .webp，后端不会生成 _thumb 变体，
 * 因此调用方需配合 @error 回退到原图。
 */
export const getThumbWebpUrl = (url?: string) => {
  if (!url) return "";
  // 已是 webp，无法再生成缩略图
  if (/\.webp($|\?)/i.test(url)) return url;
  // 去掉扩展名（保留 query），追加 _thumb.webp
  return url.replace(/\.([a-zA-Z0-9]+)(\?.*)?$/, "_thumb.webp$2");
};

/**
 * 由原图 URL 推导主图 WebP URL（用于详情页大图）
 */
export const getWebpUrl = (url?: string) => {
  if (!url) return "";
  if (/\.webp($|\?)/i.test(url)) return url;
  return url.replace(/\.([a-zA-Z0-9]+)(\?.*)?$/, ".webp$2");
};
