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

const deleteUploadedUrl = (fileUrl) => {
  const relativePath = getUploadRelativePathFromUrl(fileUrl);
  if (!relativePath) {
    return false;
  }

  const fullPath = path.join(uploadsRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    return false;
  }

  fs.unlinkSync(fullPath);
  removeEmptyParentDirs(path.dirname(fullPath));
  return true;
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
};
