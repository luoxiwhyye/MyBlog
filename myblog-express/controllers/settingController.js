const settingModel = require("../models/Setting");
const { success, error } = require("../utils/response");
const {
  uploadToCDN,
  deleteUploadedUrl,
  getUploadAssetKey,
} = require("../utils/upload");
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
  if (!SETTING_KEY_PATTERN.test(key))
    return "配置键只能包含字母、数字、下划线、点、连字符";
  return null;
};

const validateType = (type) =>
  type && !SETTING_TYPES.has(type) ? "配置类型非法" : null;

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

  if (
    body?.settings &&
    typeof body.settings === "object" &&
    !Array.isArray(body.settings)
  ) {
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
            description:
              typeof value.description === "string" ? value.description : "",
          });
        } else if (typeof value === "string") {
          result.push({
            key: sanitizeKey(key),
            value,
            type: "text",
            description: "",
          });
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
      description:
        typeof item?.description === "string" ? item.description : "",
    }));
  }

  return result;
};

/* ------------------------------------------------------------------ */
/* 图片配置的清理策略                                                 */
/* ------------------------------------------------------------------ */

/**
 * 引用保护：判断某个上传资源是否仍被「其它配置键」引用。
 *
 * 历史缺陷：原实现只比较字符串是否相等就删旧文件。两个键共用同一张图时
 * （例如把移动端背景图填成与桌面同一张），改其中一个就会把另一个仍在用的
 * 文件删掉 → 另一个键变成「DB 有值、磁盘无文件」。
 *
 * @param {object} currentSettings 当前全部配置（key → { value, type, description }）
 * @param {object} nextImageValues 本请求内所有 image 键的「变更后取值」
 * @param {string} excludeKey 正在变更的键（自身不算引用）
 * @param {string} assetKey 目标资源键（同基名的原图 / webp / 缩略图视为同一张图）
 * @returns {boolean} 仍有其它键引用时为 true（此时不得删文件）
 */
const isAssetStillReferenced = (
  currentSettings,
  nextImageValues,
  excludeKey,
  assetKey,
) => {
  if (!assetKey) return false;

  return Object.entries(currentSettings || {}).some(([key, config]) => {
    if (key === excludeKey || config?.type !== "image") return false;

    const value = Object.prototype.hasOwnProperty.call(nextImageValues, key)
      ? nextImageValues[key]
      : config.value;

    return !!value && getUploadAssetKey(value) === assetKey;
  });
};

/**
 * 计算本请求内「所有 image 键的变更后取值」，供引用保护判断使用。
 *
 * 必须把待写入的值提前算出来，才能同时覆盖两种情况：
 *   ① 其它键当前仍指向同一张图 → 不能删；
 *   ② 其它键在本请求里刚好也要改走 → 可以删。
 */
const buildNextImageValues = (
  currentSettings,
  imageSettings,
  structuredSettings,
  uploadedImageValues,
) => {
  const nextImageValues = {};

  for (const [key, config] of Object.entries(currentSettings || {})) {
    if (config?.type === "image") {
      nextImageValues[key] = config.value || "";
    }
  }

  Object.assign(nextImageValues, imageSettings);

  for (const item of structuredSettings) {
    if (item.type === "image") {
      nextImageValues[item.key] = item.value;
    }
  }

  Object.assign(nextImageValues, uploadedImageValues);

  return nextImageValues;
};

/**
 * 应用一次图片配置变更：在「需要且安全」时清理旧文件，然后写入新值。
 *
 * 清理需同时满足三个条件：
 *   ① 旧值确实指向一个本地上传资源（外链/空值不处理）；
 *   ② 新值与旧值不是同一张图 —— 用资源键比较而非字符串比较，否则
 *      「DB 存绝对 URL、前端回传归一化相对路径」这种同图不同串的情况会
 *      先删文件、再把同一个路径写回去，造成「DB 有值、文件已丢」；
 *   ③ 该资源没有被其它配置键引用（引用保护）。
 *
 * 删除动作本身会连带清理 sharp 生成的 .webp / _thumb.webp 变体，
 * 避免留下孤儿文件（详见 utils/upload.js 的 deleteUploadedUrl）。
 */
const applyImageChange = async (
  currentSettings,
  nextImageValues,
  { key, value, description },
) => {
  const previousValue = currentSettings[key]?.value || "";
  const previousAssetKey = getUploadAssetKey(previousValue);

  const shouldCleanup =
    !!previousAssetKey &&
    previousAssetKey !== getUploadAssetKey(value) &&
    !isAssetStillReferenced(
      currentSettings,
      nextImageValues,
      key,
      previousAssetKey,
    );

  if (shouldCleanup) {
    deleteUploadedUrl(previousValue);
  }

  await settingModel.upsertSetting(
    key,
    value,
    "image",
    description || currentSettings[key]?.description || "",
  );
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
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    if (
      Object.keys(textSettings).length === 0 &&
      Object.keys(imageSettings).length === 0 &&
      structuredSettings.length === 0 &&
      uploadedFiles.length === 0
    ) {
      return error(res, "配置数据格式错误", 400);
    }

    // 先整体校验，避免写到一半才发现非法键/类型
    for (const key of Object.keys(textSettings)) {
      const keyError = validateKey(key);
      if (keyError) return error(res, keyError, 400);
    }
    for (const item of structuredSettings) {
      const keyError = validateKey(item.key);
      if (keyError) return error(res, keyError, 400);
      const typeError = validateType(item.type);
      if (typeError) return error(res, typeError, 400);
      const descError = validateDescription(item.description);
      if (descError) return error(res, descError, 400);
    }

    // 上传文件先算出 URL（uploadToCDN 是纯函数），让引用保护能一并看到这些新值
    const uploadedImageValues = {};
    for (const file of uploadedFiles) {
      uploadedImageValues[file.fieldname] = uploadToCDN(file.path);
    }

    const nextImageValues = buildNextImageValues(
      currentSettings,
      imageSettings,
      structuredSettings,
      uploadedImageValues,
    );

    // 处理文本配置
    for (const [key, value] of Object.entries(textSettings)) {
      await settingModel.upsertSetting(
        key,
        value,
        "text",
        currentSettings[key]?.description || "",
      );
    }

    // 处理图片配置：前端已上传完成的 URL、图片清空、multipart 文件上传三种入口，
    // 共用同一套「引用保护 + 连带清理派生变体」逻辑。
    for (const [key, value] of Object.entries(imageSettings)) {
      await applyImageChange(currentSettings, nextImageValues, { key, value });
    }

    for (const file of uploadedFiles) {
      await applyImageChange(currentSettings, nextImageValues, {
        key: file.fieldname,
        value: uploadedImageValues[file.fieldname],
      });
    }

    // 处理自定义配置（结构化 Key-Value，可带 type / description）
    for (const item of structuredSettings) {
      if (item.type === "image") {
        await applyImageChange(currentSettings, nextImageValues, {
          key: item.key,
          value: item.value,
          description: item.description,
        });
      } else {
        await settingModel.upsertSetting(
          item.key,
          item.value,
          item.type,
          item.description || currentSettings[item.key]?.description || "",
        );
      }
    }

    // 清除 settings 缓存
    await cache.invalidate("settings");

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
    const description =
      typeof req.body?.description === "string" ? req.body.description : "";

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
    await cache.invalidate("settings");

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
      req.body?.value != null
        ? String(req.body.value)
        : existing.settingValue || "";
    const type = req.body?.type || existing.settingType || "text";
    const description =
      typeof req.body?.description === "string"
        ? req.body.description
        : existing.description || "";

    const typeError = validateType(type);
    if (typeError) return error(res, typeError, 400);
    const descError = validateDescription(description);
    if (descError) return error(res, descError, 400);

    if (type === "image") {
      // 引用保护需要看到全部配置（判断是否还有别的键指向同一张图）
      const currentSettings = await settingModel.getSettings();
      await applyImageChange(
        currentSettings,
        { [key]: value },
        {
          key,
          value,
          description,
        },
      );
    } else {
      await settingModel.upsertSetting(key, value, type, description);
    }

    await cache.invalidate("settings");

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
      const currentSettings = await settingModel.getSettings();
      const assetKey = getUploadAssetKey(existing.settingValue);
      // 本键即将被删除 → 相当于置空，再看是否还有别的键引用同一张图
      const stillReferenced = isAssetStillReferenced(
        currentSettings,
        { [key]: "" },
        key,
        assetKey,
      );

      if (!stillReferenced) {
        deleteUploadedUrl(existing.settingValue);
      }
    }

    await settingModel.deleteSetting(key);
    await cache.invalidate("settings");

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
