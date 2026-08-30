const settingModel = require("../models/Setting");
const { success, error } = require("../utils/response");
const { uploadToCDN, deleteUploadedUrl } = require("../utils/upload");
const cache = require("../middleware/cache");

const extractTextSettings = (body) => {
  const result = {};

  if (body?.settings && typeof body.settings === "object") {
    for (const [key, value] of Object.entries(body.settings)) {
      // 仅保留扁平字符串值；对象/列表形式交给 extractStructuredSettings 处理
      if (typeof value === "string") {
        result[key] = value;
      }
    }
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

/* ------------------------------------------------------------------ */
/* 自定义键值对配置的校验与归一化                                     */
/* ------------------------------------------------------------------ */

const SETTING_TYPES = new Set(["text", "image", "html", "boolean"]);

const SETTING_KEY_PATTERN = /^[\p{L}\p{N}_.-]{1,100}$/u;

const sanitizeKey = (key) => (typeof key === "string" ? key.trim() : "");

const validateKey = (key) => {
  if (!key) return "配置键不能为空";
  if (key.length > 100) return "配置键长度不能超过 100";
  if (!SETTING_KEY_PATTERN.test(key)) return "配置键只能包含字母、数字、下划线、点、连字符";
  return null;
};

const validateType = (type) => (type && !SETTING_TYPES.has(type) ? "配置类型非法" : null);

const validateDescription = (description) =>
  description && description.length > 255 ? "配置描述长度不能超过 255" : null;

/**
 * 从 JSON 请求体中抽取“结构化”自定义配置列表（带 type / description）。
 * 兼容两种写法：
 *   - { settings: { key: { value, type?, description? }, ... } }
 *   - { configs: [{ key, value, type?, description? }, ...] }
 */
const extractStructuredSettings = (body) => {
  const result = [];

  if (body?.settings && typeof body.settings === "object" && !Array.isArray(body.settings)) {
    // 仅当存在对象值时才视为“结构化”；纯字符串仍走旧版扁平路径，避免重复处理
    const hasObjectValue = Object.values(body.settings).some(
      (v) => v && typeof v === "object",
    );
    if (hasObjectValue) {
      for (const [key, value] of Object.entries(body.settings)) {
        if (value && typeof value === "object") {
          result.push({
            key: sanitizeKey(key),
            value: value.value != null ? String(value.value) : "",
            type: value.type || "text",
            description: typeof value.description === "string" ? value.description : "",
          });
        } else if (typeof value === "string") {
          result.push({ key: sanitizeKey(key), value, type: "text", description: "" });
        }
      }
      return result;
    }
  }

  if (Array.isArray(body?.configs)) {
    return body.configs.map((item) => ({
      key: sanitizeKey(item?.key),
      value: item?.value != null ? String(item.value) : "",
      type: item?.type || "text",
      description: typeof item?.description === "string" ? item.description : "",
    }));
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
    const structuredSettings = extractStructuredSettings(req.body);

    if (
      Object.keys(textSettings).length === 0 &&
      Object.keys(imageSettings).length === 0 &&
      structuredSettings.length === 0 &&
      (!req.files || req.files.length === 0)
    ) {
      return error(res, "配置数据格式错误", 400);
    }

    // 处理文本配置
    for (const [key, value] of Object.entries(textSettings)) {
      const keyError = validateKey(key);
      if (keyError) return error(res, keyError, 400);
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

    // 处理自定义配置（结构化 Key-Value，可带 type / description）
    for (const item of structuredSettings) {
      const keyError = validateKey(item.key);
      if (keyError) return error(res, keyError, 400);
      const typeError = validateType(item.type);
      if (typeError) return error(res, typeError, 400);
      const descError = validateDescription(item.description);
      if (descError) return error(res, descError, 400);

      const previousValue = currentSettings[item.key]?.value || "";
      const description =
        item.description || currentSettings[item.key]?.description || "";

      if (item.type === "image" && previousValue && previousValue !== item.value) {
        deleteUploadedUrl(previousValue);
      }

      await settingModel.upsertSetting(
        item.key,
        item.value,
        item.type,
        description,
      );
    }

    // 清除 settings 缓存
    cache.invalidate("settings");

    success(res, null, "配置更新成功");
  } catch (err) {
    next(err);
  }
};

/**
 * 新增单个自定义配置（POST /settings）
 * body: { key, value, type?, description? }
 */
const createSetting = async (req, res, next) => {
  try {
    const key = sanitizeKey(req.body?.key);
    const value = req.body?.value != null ? String(req.body.value) : "";
    const type = req.body?.type || "text";
    const description = typeof req.body?.description === "string" ? req.body.description : "";

    const keyError = validateKey(key);
    if (keyError) return error(res, keyError, 400);
    const typeError = validateType(type);
    if (typeError) return error(res, typeError, 400);
    const descError = validateDescription(description);
    if (descError) return error(res, descError, 400);

    const existing = await settingModel.getSettingByKey(key);
    if (existing) {
      return error(res, `配置键 ${key} 已存在`, 409);
    }

    await settingModel.upsertSetting(key, value, type, description);
    cache.invalidate("settings");

    success(res, { key, value, type, description }, "配置创建成功", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * 更新单个自定义配置（PUT /settings/:key）
 * body: { value?, type?, description? }
 * 未传的字段保留原值。
 */
const updateSettingByKey = async (req, res, next) => {
  try {
    const key = sanitizeKey(req.params.key);
    const keyError = validateKey(key);
    if (keyError) return error(res, keyError, 400);

    const existing = await settingModel.getSettingByKey(key);
    if (!existing) {
      return error(res, "配置不存在", 404);
    }

    const value =
      req.body?.value != null ? String(req.body.value) : existing.settingValue || "";
    const type = req.body?.type || existing.settingType || "text";
    const description =
      typeof req.body?.description === "string"
        ? req.body.description
        : existing.description || "";

    const typeError = validateType(type);
    if (typeError) return error(res, typeError, 400);
    const descError = validateDescription(description);
    if (descError) return error(res, descError, 400);

    if (type === "image" && existing.settingValue && existing.settingValue !== value) {
      deleteUploadedUrl(existing.settingValue);
    }

    await settingModel.upsertSetting(key, value, type, description);
    cache.invalidate("settings");

    success(res, { key, value, type, description }, "配置更新成功");
  } catch (err) {
    next(err);
  }
};

/**
 * 删除单个自定义配置（DELETE /settings/:key）
 */
const deleteSetting = async (req, res, next) => {
  try {
    const key = sanitizeKey(req.params.key);
    const keyError = validateKey(key);
    if (keyError) return error(res, keyError, 400);

    const existing = await settingModel.getSettingByKey(key);
    if (!existing) {
      return error(res, "配置不存在", 404);
    }

    if (existing.settingType === "image" && existing.settingValue) {
      deleteUploadedUrl(existing.settingValue);
    }

    await settingModel.deleteSetting(key);
    cache.invalidate("settings");

    success(res, null, "配置删除成功");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  getSettingByKey,
  updateSettings,
  createSetting,
  updateSettingByKey,
  deleteSetting,
};
