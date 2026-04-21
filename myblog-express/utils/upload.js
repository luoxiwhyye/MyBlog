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
};
