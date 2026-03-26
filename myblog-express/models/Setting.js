const pool = require("../config/database");

/**
 * 获取所有配置
 */
const getSettings = async () => {
  const [rows] = await pool.query(
    "SELECT settingKey, settingValue, settingType FROM settings",
  );

  const result = {};
  rows.forEach((row) => {
    result[row.settingKey] = row.settingValue;
  });
  return result;
};

/**
 * 获取单个配置
 */
const getSettingByKey = async (key) => {
  const [rows] = await pool.query(
    "SELECT settingKey, settingValue, settingType FROM settings WHERE settingKey = ?",
    [key],
  );
  return rows[0] || null;
};

/**
 * 创建或更新配置
 */
const upsertSetting = async (key, value, type = "text", description = "") => {
  const [existing] = await pool.query(
    "SELECT id FROM settings WHERE settingKey = ?",
    [key],
  );

  if (existing.length > 0) {
    const [result] = await pool.query(
      "UPDATE settings SET settingValue = ?, settingType = ?, description = ? WHERE settingKey = ?",
      [value, type, description, key],
    );
    return result.affectedRows > 0;
  } else {
    const [result] = await pool.query(
      "INSERT INTO settings (settingKey, settingValue, settingType, description) VALUES (?, ?, ?, ?)",
      [key, value, type, description],
    );
    return result.insertId;
  }
};

/**
 * 删除配置
 */
const deleteSetting = async (key) => {
  const [result] = await pool.query(
    "DELETE FROM settings WHERE settingKey = ?",
    [key],
  );
  return result.affectedRows > 0;
};

/**
 * 批量更新配置
 */
const updateSettings = async (settingsData) => {
  for (const [key, value] of Object.entries(settingsData)) {
    await upsertSetting(key, value, "text");
  }
  return true;
};

module.exports = {
  getSettings,
  getSettingByKey,
  upsertSetting,
  deleteSetting,
  updateSettings,
};
