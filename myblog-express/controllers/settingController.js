const settingModel = require("../models/Setting");
const { success, error } = require("../utils/response");
const { uploadToCDN, deleteUploadedUrl } = require("../utils/upload");
const cache = require("../middleware/cache");

const extractTextSettings = (body) => {
  const result = {};

  if (body?.settings && typeof body.settings === "object") {
    Object.assign(result, body.settings);
  }

  for (const [key, value] of Object.entries(body || {})) {
    const match = key.match(/^settings\[(.+)\]$/);
    if (match) {
      result[match[1]] = value;
    }
  }

  return result;
};

const extractImageSettings = (body, currentSettings) => {
  const result = {};

  for (const [key, config] of Object.entries(currentSettings || {})) {
    if (
      config?.type === "image" &&
      Object.prototype.hasOwnProperty.call(body || {}, key)
    ) {
      result[key] = body[key] || "";
    }
  }

  return result;
};

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
    const currentSettings = await settingModel.getSettings();
    const textSettings = extractTextSettings(req.body);
    const imageSettings = extractImageSettings(req.body, currentSettings);

    if (
      Object.keys(textSettings).length === 0 &&
      Object.keys(imageSettings).length === 0 &&
      (!req.files || req.files.length === 0)
    ) {
      return error(res, "配置数据格式错误", 400);
    }

    // 处理文本配置
    for (const [key, value] of Object.entries(textSettings)) {
      const description = currentSettings[key]?.description || "";
      await settingModel.upsertSetting(key, value, "text", description);
    }

    // 处理前端已上传完成的图片 URL 或图片清空
    for (const [key, value] of Object.entries(imageSettings)) {
      const previousValue = currentSettings[key]?.value || "";
      const description = currentSettings[key]?.description || "";

      if (previousValue && previousValue !== value) {
        deleteUploadedUrl(previousValue);
      }

      await settingModel.upsertSetting(key, value, "image", description);
    }

    // 处理图片配置
    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        const key = file.fieldname;
        const previousValue = currentSettings[key]?.value || "";
        const description = currentSettings[key]?.description || "";
        const imageUrl = uploadToCDN(file.path);

        if (previousValue && previousValue !== imageUrl) {
          deleteUploadedUrl(previousValue);
        }

        await settingModel.upsertSetting(key, imageUrl, "image", description);
      }
    }

    // 清除 settings 缓存
    cache.invalidate("settings");

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
