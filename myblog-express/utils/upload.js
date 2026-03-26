const path = require("path");
const fs = require("fs");

/**
 * 上传文件到CDN（当前实现为本地存储，可后续替换为OSS）
 * @param {string} localPath 本地文件路径
 * @param {string} remotePath 输出路径（相对于 uploads）
 * @returns {string} 文件URL
 */
const uploadToCDN = (localPath, remotePath = "") => {
  try {
    // 当前实现：返回相对URL
    // 真实CDN实现应该上传文件到对象存储服务
    const fileName = path.basename(localPath);
    const relativeUrl = remotePath ? `${remotePath}/${fileName}` : fileName;

    // 返回可访问的URL路径
    const cdnUrl = `/uploads/${relativeUrl}`;

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
