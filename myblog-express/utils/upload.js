const path = require("path");
const fs = require("fs");

const uploadsRoot = path.resolve(__dirname, "../uploads");

/**
 * 上传文件到CDN（当前实现为本地存储，可后续替换为OSS）
 * @param {string} localPath 本地文件路径
 * @param {string} remotePath 输出路径（相对于 uploads）
 * @returns {string} 文件URL
 */
const uploadToCDN = (localPath, remotePath = "") => {
  try {
    // 当前实现：本地存储 + 返回完整访问URL
    // 真实场景：上传到 CDN/OSS 再返回公网 URL
    const appBaseUrl =
      process.env.APP_BASE_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    const fileName = path.basename(localPath);
    let relativeUrl = fileName;

    if (remotePath) {
      relativeUrl = `${remotePath}/${fileName}`;
    } else {
      const relativePath = path.relative(uploadsRoot, path.resolve(localPath));
      if (relativePath && !relativePath.startsWith("..")) {
        relativeUrl = relativePath;
      }
    }

    relativeUrl = relativeUrl.replace(/\\/g, "/");

    // 返回可访问的完整 URL
    const cdnUrl = `${appBaseUrl}/uploads/${relativeUrl}`.replace(
      /([^:]\/\/)\/+/,
      "$1",
    );

    return cdnUrl;
  } catch (err) {
    throw new Error("文件上传失败: " + err.message);
  }
};

const getUploadRelativePathFromUrl = (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== "string") {
    return "";
  }

  try {
    const parsedUrl = new URL(fileUrl);
    const marker = "/uploads/";
    const index = parsedUrl.pathname.indexOf(marker);
    if (index === -1) {
      return "";
    }

    return decodeURIComponent(parsedUrl.pathname.slice(index + marker.length));
  } catch (err) {
    const normalized = fileUrl.replace(/\\/g, "/");
    const marker = "/uploads/";
    const index = normalized.indexOf(marker);
    if (index === -1) {
      return "";
    }
    return normalized.slice(index + marker.length);
  }
};

const removeEmptyParentDirs = (dirPath) => {
  let currentDir = dirPath;

  while (
    currentDir &&
    currentDir.startsWith(uploadsRoot) &&
    currentDir !== uploadsRoot
  ) {
    if (!fs.existsSync(currentDir)) {
      currentDir = path.dirname(currentDir);
      continue;
    }

    const entries = fs.readdirSync(currentDir);
    if (entries.length > 0) {
      break;
    }

    fs.rmdirSync(currentDir);
    currentDir = path.dirname(currentDir);
  }
};

/**
 * 缩略图后缀 —— 与 utils/sharpConverter.js 的 `_thumb.webp` 输出保持一致。
 * 只认 `.webp` 结尾的 `_thumb`：命名为 `xxx_thumb.jpg` 的原图会被当作独立原图，
 * 不做基名回溯，避免误删同目录下的另一张图。
 */
const THUMB_SUFFIX = "_thumb";
const THUMB_VARIANT_PATTERN = /_thumb\.webp$/i;

/**
 * 取「不含扩展名」的文件名，并把 `xxx_thumb.webp` 回溯成 `xxx`。
 * 这样同一张图的三种形态（原图 / 主图 webp / 缩略图 webp）会得到同一个基名。
 */
const getUploadBaseName = (fileName) => {
  const ext = path.extname(fileName);
  const baseName = ext ? fileName.slice(0, -ext.length) : fileName;
  return THUMB_VARIANT_PATTERN.test(fileName)
    ? baseName.slice(0, -THUMB_SUFFIX.length)
    : baseName;
};

/**
 * 资源键：把同一张图的「原图 + .webp 主图 + _thumb.webp 缩略图」归为一组。
 *
 * 返回形如 `setting/image/site_bg_light/1789059822140_7912`；非本地上传
 * （外链、data:、空值）返回空串，调用方据此跳过清理。
 *
 * 用途：判断两个 URL 是否指向「同一张图」。这里不能用字符串直接比较——
 * 同一条记录的形态可能是 DB 里的绝对 URL，也可能是前端回传的归一化相对路径。
 */
const getUploadAssetKey = (fileUrl) => {
  const relativePath = getUploadRelativePathFromUrl(fileUrl);
  if (!relativePath) return "";

  const normalized = relativePath.replace(/\\/g, "/");
  const slashIndex = normalized.lastIndexOf("/");
  const dir = slashIndex === -1 ? "" : normalized.slice(0, slashIndex);
  const fileName =
    slashIndex === -1 ? normalized : normalized.slice(slashIndex + 1);
  if (!fileName) return "";

  const baseName = getUploadBaseName(fileName);
  return dir ? `${dir}/${baseName}` : baseName;
};

/**
 * 收集某个上传资源在磁盘上的全部同名文件（原图 + 主图 webp + 缩略图 webp）。
 *
 * 采用「按目录扫描」而非「猜扩展名」：sharp 的产物扩展名固定，但原图可能是
 * .jpg/.jpeg/.png/.gif/.avif 等，扫描目录才不会漏。
 *
 * @param {string} fileUrl 上传文件 URL（绝对 URL 或 /uploads/ 相对路径均可）
 * @returns {string[]} 命中的文件绝对路径；无可删文件时返回空数组
 */
const collectUploadFiles = (fileUrl) => {
  const relativePath = getUploadRelativePathFromUrl(fileUrl);
  if (!relativePath) return [];

  const normalized = relativePath.replace(/\\/g, "/");
  const slashIndex = normalized.lastIndexOf("/");
  const dirRelative = slashIndex === -1 ? "" : normalized.slice(0, slashIndex);
  const fileName =
    slashIndex === -1 ? normalized : normalized.slice(slashIndex + 1);
  if (!fileName) return [];

  const baseName = getUploadBaseName(fileName);
  const dir = dirRelative ? path.join(uploadsRoot, dirRelative) : uploadsRoot;
  const singleFile = path.join(uploadsRoot, normalized);

  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    // 目录不存在（可能已被清理）→ 退化为只针对该文件本身
    return fs.existsSync(singleFile) ? [singleFile] : [];
  }

  return entries
    .filter(
      (entry) => entry.isFile() && getUploadBaseName(entry.name) === baseName,
    )
    .map((entry) => path.join(dir, entry.name));
};

/**
 * 删除上传文件（连带清理它的全部派生变体）。
 *
 * 历史遗留：早期实现只 unlink 单个文件，sharp 生成的 `xxx.webp` / `xxx_thumb.webp`
 * 会残留成孤儿；而原图一旦被删，磁盘就只剩 webp，前端按原图推导的缩略图 URL
 * 随之全部失联（背景图 404 的直接成因）。
 *
 * @param {string} fileUrl 上传文件 URL
 * @returns {string[]} 实际删除的文件（uploads 下的相对路径）；未删任何文件时为空数组
 */
const deleteUploadedUrl = (fileUrl) => {
  const files = collectUploadFiles(fileUrl);
  if (files.length === 0) return [];

  const deleted = [];
  for (const fullPath of files) {
    try {
      fs.unlinkSync(fullPath);
      deleted.push(path.relative(uploadsRoot, fullPath).replace(/\\/g, "/"));
    } catch (err) {
      console.error("文件删除失败:", fullPath, err.message);
    }
  }

  if (deleted.length > 0) {
    removeEmptyParentDirs(path.dirname(path.join(uploadsRoot, deleted[0])));
  }

  return deleted;
};

/**
 * 删除本地文件
 * @param {string} filePath 文件路径（相对于 uploads）
 */
const deleteFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, "../uploads", filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error("文件删除失败:", err);
  }
};

module.exports = {
  uploadToCDN,
  deleteFile,
  getUploadRelativePathFromUrl,
  deleteUploadedUrl,
  // 资源组工具：判断「是否同一张图」/ 列出它的全部派生文件
  getUploadAssetKey,
  collectUploadFiles,
};
