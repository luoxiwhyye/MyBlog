/**
 * 表情包体系重做 · 数据迁移脚本
 *
 * 用途（幂等，可重复执行）：
 *   1. 新建 `emoji_group` 表（名称 + 标识 + 排序）。
 *   2. 为 `emoji` 表新增 `group_id` 列 + 索引 + 外键（ON DELETE SET NULL）。
 *   3. 将 `emoji.type` 枚举扩为 ('emoji','kaomoji','image')。
 *   4. 存量回填：`type=emoji` 但内容是 http(s) URL 的记录 → 改为 `image`。
 *
 * 运行方式：node scripts/migrateEmojiGroup.js
 * 全新部署直接导入 myblog-1.1.sql 即可，无需本脚本。
 *
 * 注意：`emoji_group` 必须先于 `emoji` 的外键建立；本脚本已按此顺序处理。
 */

const pool = require("../config/database");

const tableExists = async (conn, table) => {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table],
  );
  return rows.length > 0;
};

const columnExists = async (conn, table, column) => {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return rows.length > 0;
};

const indexExists = async (conn, table, index) => {
  const [rows] = await conn.query(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, index],
  );
  return rows.length > 0;
};

const foreignKeyExists = async (conn, table, constraint) => {
  const [rows] = await conn.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ?`,
    [table, constraint],
  );
  return rows.length > 0;
};

const columnType = async (conn, table, column) => {
  const [rows] = await conn.query(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return rows[0]?.COLUMN_TYPE || "";
};

const up = async () => {
  const conn = await pool.getConnection();
  try {
    // 1. emoji_group 表
    if (!(await tableExists(conn, "emoji_group"))) {
      console.log("[migrateEmojiGroup] 创建 emoji_group 表 ...");
      await conn.query(`
        CREATE TABLE \`emoji_group\` (
          \`id\` int NOT NULL AUTO_INCREMENT COMMENT '分组ID',
          \`name\` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分组名称',
          \`cover\` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT '分组标识（Emoji 文本或图片URL）',
          \`sort_order\` int NOT NULL DEFAULT 0 COMMENT '排序',
          \`create_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          PRIMARY KEY (\`id\`) USING BTREE,
          INDEX \`idx_emoji_group_sort\`(\`sort_order\` ASC) USING BTREE
        ) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci COMMENT = '表情分组（名称 + 标识 + 排序）' ROW_FORMAT = Dynamic
      `);
    } else {
      console.log("[migrateEmojiGroup] emoji_group 表已存在，跳过");
    }

    // 2. emoji.group_id 列
    if (!(await columnExists(conn, "emoji", "group_id"))) {
      console.log("[migrateEmojiGroup] 新增 emoji.group_id 列 ...");
      await conn.query(
        `ALTER TABLE emoji
         ADD COLUMN group_id int NULL DEFAULT NULL COMMENT '所属分组ID（NULL=未分组）' AFTER type`,
      );
    } else {
      console.log("[migrateEmojiGroup] emoji.group_id 列已存在，跳过");
    }

    // 3. 索引
    if (!(await indexExists(conn, "emoji", "idx_emoji_group"))) {
      console.log("[migrateEmojiGroup] 新增 idx_emoji_group 索引 ...");
      await conn.query(
        "ALTER TABLE emoji ADD INDEX `idx_emoji_group`(`group_id` ASC)",
      );
    }

    // 4. 外键（删分组不删表情 → SET NULL）
    if (!(await foreignKeyExists(conn, "emoji", "fk_emoji_group"))) {
      console.log("[migrateEmojiGroup] 新增 fk_emoji_group 外键 ...");
      await conn.query(
        `ALTER TABLE emoji
         ADD CONSTRAINT \`fk_emoji_group\` FOREIGN KEY (\`group_id\`)
         REFERENCES \`emoji_group\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE`,
      );
    }

    // 5. type 枚举扩展（仅当缺少 image 时修改）
    const typeCol = await columnType(conn, "emoji", "type");
    if (typeCol && !typeCol.includes("image")) {
      console.log("[migrateEmojiGroup] 扩展 emoji.type 枚举，加入 image ...");
      await conn.query(
        `ALTER TABLE emoji
         MODIFY COLUMN \`type\` enum('emoji','kaomoji','image')
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'emoji'
         COMMENT '类型：emoji/颜文字/图片'`,
      );
    } else if (typeCol) {
      console.log("[migrateEmojiGroup] emoji.type 已含 image，跳过");
    }

    // 6. 存量回填：内容为 http(s) URL 的 emoji → image
    const [result] = await conn.query(
      `UPDATE emoji SET type = 'image'
       WHERE type = 'emoji' AND content REGEXP '^https?://'`,
    );
    console.log(
      `[migrateEmojiGroup] 存量回填完成，图片表情改判 ${result.affectedRows} 条`,
    );

    console.log("[migrateEmojiGroup] 迁移完成");
  } finally {
    conn.release();
    await pool.end();
  }
};

up().catch((err) => {
  console.error("[migrateEmojiGroup] 迁移失败：", err);
  process.exit(1);
});
