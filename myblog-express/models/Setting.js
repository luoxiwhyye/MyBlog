const pool = require("../config/database");

const getSettings = async () => {
  const [rows] = await pool.query(
    "SELECT setting_key AS settingKey, setting_value AS settingValue, setting_type AS settingType, description FROM setting",
  );

  const result = {};
  rows.forEach((row) => {
    result[row.settingKey] = {
      value: row.settingValue,
      type: row.settingType,
      description: row.description || "",
    };
  });
  return result;
};

const getSettingByKey = async (key) => {
  const [rows] = await pool.query(
    "SELECT setting_key AS settingKey, setting_value AS settingValue, setting_type AS settingType FROM setting WHERE setting_key = ?",
    [key],
  );
  return rows[0] || null;
};

const upsertSetting = async (key, value, type = "text", description) => {
  const [existing] = await pool.query(
    "SELECT setting_key, description FROM setting WHERE setting_key = ?",
    [key],
  );

  const nextDescription =
    description !== undefined
      ? description
      : existing.length > 0
        ? existing[0].description || ""
        : "";

  if (existing.length > 0) {
    const [result] = await pool.query(
      "UPDATE setting SET setting_value = ?, setting_type = ?, description = ? WHERE setting_key = ?",
      [value, type, nextDescription, key],
    );
    return result.affectedRows > 0;
  } else {
    const [result] = await pool.query(
      "INSERT INTO setting (setting_key, setting_value, setting_type, description) VALUES (?, ?, ?, ?)",
      [key, value, type, nextDescription],
    );
    return result.insertId;
  }
};

/**
 * 删除配置
 */
const deleteSetting = async (key) => {
  const [result] = await pool.query(
    "DELETE FROM setting WHERE setting_key = ?",
    [key],
  );
  return result.affectedRows > 0;
};

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
