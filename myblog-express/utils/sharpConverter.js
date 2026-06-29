/**
 * Sharp 图片处理工具 — WebP/AVIF 格式转换 + 缩略图生成
 *
 * 对标 S-02：上传时自动生成 WebP 格式和多尺寸缩略图。
 * Sharp 不可用时静默跳过（不影响正常上传流程）。
 */
const path = require("path");
const fs = require("fs");

let sharp = null;
try {
  sharp = require("sharp");
} catch {
  // sharp 是可选依赖，未安装则跳过格式转换
}

/**
 * 将上传的图片转换为 WebP 格式，同时生成缩略图。
 * 处理成功后在原路径旁生成 .webp 文件和 _thumb.webp 文件。
 *
 * @param {string} filePath 原始上传文件路径
 * @returns {Promise<{ webpPath: string | null, thumbPath: string | null }>}
 */
const convertToWebP = async (filePath) => {
  if (!sharp) return { webpPath: null, thumbPath: null };

  try {
    const ext = path.extname(filePath).toLowerCase();
    // 跳过已是 webp 的文件和非图片
    if (ext === ".webp" || ext === ".avif") {
      return { webpPath: null, thumbPath: null };
    }

    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, ext);
    const webpPath = path.join(dir, `${baseName}.webp`);
    const thumbPath = path.join(dir, `${baseName}_thumb.webp`);

    // 主图 WebP 转换 (宽度最大 1200px)
    await sharp(filePath)
      .resize(1200, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(webpPath);

    // 缩略图 (宽度 400px)
    await sharp(filePath)
      .resize(400, null, { withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(thumbPath);

    return { webpPath, thumbPath };
  } catch (err) {
    console.error("WebP 转换失败:", err.message);
    return { webpPath: null, thumbPath: null };
  }
};

/**
 * 构建 WebP URL（基于原图 URL 替换扩展名）。
 * 若 WebP 文件不存在（sharp 不可用），返回原 URL。
 *
 * @param {string} originalUrl 原图访问 URL
 * @param {string} originalFilePath 原图本地路径
 * @returns {string} WebP URL 或原 URL
 */
const getWebPUrl = (originalUrl, originalFilePath) => {
  if (!sharp || !originalFilePath) return originalUrl;

  try {
    const ext = path.extname(originalFilePath);
    if (ext === ".webp" || ext === ".avif") return originalUrl;

    const webpPath = originalFilePath.replace(ext, ".webp");
    if (fs.existsSync(webpPath)) {
      return originalUrl.replace(ext, ".webp");
    }
  } catch {
    // fallback
  }

  return originalUrl;
};

module.exports = {
  convertToWebP,
  getWebPUrl,
  isSharpAvailable: () => !!sharp,
};
