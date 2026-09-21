/**
 * 公安联网备案号配置键迁移脚本
 *
 * 用途（幂等，可重复执行）：
 *   补齐配置键 `site_police_icp`（text 类型，空值），供后台「基本设置」填写、
 *   前台页脚 / 欢迎页与后台登录页展示。
 *
 * 运行方式：node scripts/addPoliceIcpSetting.js
 * 全新部署直接导入 myblog-1.1.sql 即可（记录已含该键），无需本脚本。
 *
 * 说明：
 *   - setting 是键值表，无 schema 变更，仅补记录；已有值不会被覆盖
 *     （用 INSERT ... ON DUPLICATE KEY 只同步 description，不动 setting_value）。
 *   - 两个后端共用同一份数据库，本脚本直连 MySQL，不依赖后端进程，
 *     用 Spring Boot 部署时同样可以在 myblog-express/ 下执行。
 */

const pool = require("../config/database");

const NEW_KEY = {
  key: "site_police_icp",
  description: "公安联网备案号",
};

const up = async () => {
  const conn = await pool.getConnection();
  try {
    const [result] = await conn.query(
      `INSERT INTO setting (setting_key, setting_value, setting_type, description)
       VALUES (?, '', 'text', ?)
       ON DUPLICATE KEY UPDATE description = VALUES(description)`,
      [NEW_KEY.key, NEW_KEY.description],
    );
    const created = result.affectedRows === 1;
    console.log(
      `[addPoliceIcpSetting] ${NEW_KEY.key}：${created ? "已新增" : "已存在（仅同步描述）"}`,
    );

    // 复核
    const [rows] = await conn.query(
      `SELECT setting_key, setting_value, setting_type, description
       FROM setting
       WHERE setting_key IN ('site_icp','site_police_icp')
       ORDER BY setting_key`,
    );
    console.log("[addPoliceIcpSetting] 当前备案配置：");
    for (const row of rows) {
      console.log(
        `  ${row.setting_key} = ${row.setting_value ? `"${row.setting_value}"` : "(空)"} [${row.setting_type}] ${row.description}`,
      );
    }
    console.log("[addPoliceIcpSetting] 迁移完成");
  } finally {
    conn.release();
    await pool.end();
  }
};

up().catch((err) => {
  console.error("[addPoliceIcpSetting] 迁移失败：", err.message);
  process.exit(1);
});
