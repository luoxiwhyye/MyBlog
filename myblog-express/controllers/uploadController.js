const { success, error } = require("../utils/response");
const { uploadToCDN } = require("../utils/upload");
const { convertToWebP } = require("../utils/sharpConverter");

/**
 * 上传图片（自动 WebP 转换 + 缩略图）
 */
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, "请选择要上传的图片", 400);
    }

    // S-02: 异步生成 WebP + 缩略图（不阻塞上传响应）
    convertToWebP(req.file.path).catch(() => {});

    const imageUrl = uploadToCDN(req.file.path);

    success(res, { url: imageUrl }, "图片上传成功");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadImage,
};
