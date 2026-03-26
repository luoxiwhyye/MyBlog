const settingModel = require("../models/Setting");
const { success, error } = require("../utils/response");
const { uploadToCDN } = require("../utils/upload");

/**
 * 获取所有配置
 */
const getSettings = async (req, res, next) => {
  try {
    const settings = await settingModel.getSettings();
    success(res, settings);
  } catch (err) {
    next(err);
  }
};

/**
 * 获取单个配置
 */
const getSettingByKey = async (req, res, next) => {
  try {
    const { key } = req.params;

    const setting = await settingModel.getSettingByKey(key);
    if (!setting) {
      return error(res, "配置不存在", 404);
    }

    success(res, { key: setting.settingKey, value: setting.settingValue });
  } catch (err) {
    next(err);
  }
};

/**
 * 更新配置
 */
const updateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== "object") {
      return error(res, "配置数据格式错误", 400);
    }

    // 处理文本配置
    for (const [key, value] of Object.entries(settings)) {
      await settingModel.upsertSetting(key, value, "text");
    }

    // 处理图片配置
    if (req.files && typeof req.files === "object") {
      for (const [key, files] of Object.entries(req.files)) {
        if (Array.isArray(files) && files.length > 0) {
          const file = files[0];
          const imageUrl = uploadToCDN(file.path);
          await settingModel.upsertSetting(key, imageUrl, "image");
        }
      }
    }

    success(res, null, "配置更新成功");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  getSettingByKey,
  updateSettings,
};
