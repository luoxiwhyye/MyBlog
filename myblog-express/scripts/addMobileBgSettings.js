/**
 * 背景图拆分「桌面端 / 移动端」迁移脚本
 *
 * 用途（幂等，可重复执行）：
 *   1. 补齐两个新配置键 `site_bg_light_mobile` / `site_bg_dark_mobile`（image 类型，空值）。
 *   2. 把既有 `site_bg_light` / `site_bg_dark` 的描述改为「桌面端」语义（键名保留不变）。
 *
 * 运行方式：node scripts/addMobileBgSettings.js
 * 全新部署直接导入 myblog-1.1.sql 即可（建表 + 记录已含两项新键），无需本脚本。
 *
 * 说明：
 *   - setting 是键值表，无 schema 变更，仅补记录；已有值不会被覆盖（用 INSERT ... ON DUPLICATE
 *     只更新 description，不动 setting_value）。
 */

const pool = require("../config/database");

const NEW_KEYS = [
  {
    key: "site_bg_light_mobile",
    description: "移动端亮色模式背景图片（留空则沿用桌面端）",
  },
  {
    key: "site_bg_dark_mobile",
    description: "移动端暗色模式背景图片（留空则沿用桌面端）",
  },
];

const RENAMED_DESCRIPTIONS = [
  { key: "site_bg_light", description: "桌面端亮色模式背景图片" },
  { key: "site_bg_dark", description: "桌面端暗色模式背景图片" },
];

const up = async () => {
  const conn = await pool.getConnection();
  try {
    // 1. 补齐新键（存在则只同步描述，不覆盖用户已配置的值）
    for (const { key, description } of NEW_KEYS) {
      const [result] = await conn.query(
        `INSERT INTO setting (setting_key, setting_value, setting_type, description)
         VALUES (?, '', 'image', ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [key, description],
      );
      const created = result.affectedRows === 1;
      console.log(
        `[addMobileBgSettings] ${key}：${created ? "已新增" : "已存在（仅同步描述）"}`,
      );
    }

    // 2. 既有两键语义改为「桌面端」（键名与值均不动）
    for (const { key, description } of RENAMED_DESCRIPTIONS) {
      const [result] = await conn.query(
        "UPDATE setting SET description = ? WHERE setting_key = ? AND description <> ?",
        [description, key, description],
      );
      console.log(
        `[addMobileBgSettings] ${key}：描述${result.affectedRows ? "已更新" : "无需更新"}`,
      );
    }

    // 复核
    const [rows] = await conn.query(
      `SELECT setting_key, setting_value, setting_type, description
       FROM setting
       WHERE setting_key IN ('site_bg_light','site_bg_dark','site_bg_light_mobile','site_bg_dark_mobile')
       ORDER BY setting_key`,
    );
    console.log("[addMobileBgSettings] 当前背景图配置：");
    for (const row of rows) {
      console.log(
        `  ${row.setting_key} = ${row.setting_value ? `"${row.setting_value}"` : "(空)"} [${row.setting_type}] ${row.description}`,
      );
    }
    console.log("[addMobileBgSettings] 迁移完成");
  } finally {
    conn.release();
    await pool.end();
  }
};

up().catch((err) => {
  console.error("[addMobileBgSettings] 迁移失败：", err.message);
  process.exit(1);
});
