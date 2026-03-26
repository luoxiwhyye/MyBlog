const { success, error } = require("../utils/response");
const { uploadToCDN } = require("../utils/upload");

/**
 * 上传图片
 */
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return error(res, "请选择要上传的图片", 400);
    }

    const imageUrl = uploadToCDN(req.file.path);

    success(res, { url: imageUrl }, "图片上传成功");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadImage,
};
