const pool = require("../config/database");

/**
 * 表情模型 — 支持文本表情（emoji/颜文字）与自定义图片表情（URL）
 * content：文本表情内容，或自定义图片表情的 URL
 * type：'emoji' | 'kaomoji'  (图片表情归为 emoji)
 * isCustom：是否博主自定义（0=内置默认，1=自定义）
 * enabled：是否启用（0=停用，1=启用）
 * sortOrder：排序
 */

const getEmojis = async (offset, limit, filters = {}, isAdmin = false) => {
  let query = `
    SELECT id,
           content, type, is_custom AS isCustom,
           enabled, sort_order AS sortOrder,
           create_at AS createdAt
    FROM emoji
    WHERE 1=1
  `;
  const params = [];

  if (!isAdmin) {
    query += " AND enabled = ?";
    params.push(1);
  } else if (filters.enabled !== undefined) {
    query += " AND enabled = ?";
    params.push(filters.enabled ? 1 : 0);
  }

  if (filters.type) {
    query += " AND type = ?";
    params.push(filters.type);
  }

  query += " ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

const getEmojisCount = async (filters = {}, isAdmin = false) => {
  let query = "SELECT COUNT(*) as count FROM emoji WHERE 1=1";
  const params = [];

  if (!isAdmin) {
    query += " AND enabled = ?";
    params.push(1);
  } else if (filters.enabled !== undefined) {
    query += " AND enabled = ?";
    params.push(filters.enabled ? 1 : 0);
  }

  if (filters.type) {
    query += " AND type = ?";
    params.push(filters.type);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].count;
};

const getEmojiById = async (id) => {
  const [rows] = await pool.query(
    `SELECT id, content, type, is_custom AS isCustom,
            enabled, sort_order AS sortOrder, create_at AS createdAt
     FROM emoji WHERE id = ?`,
    [id],
  );
  return rows[0];
};

const createEmoji = async (emojiData) => {
  const [result] = await pool.query(
    `INSERT INTO emoji (content, type, is_custom, enabled, sort_order, create_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [
      emojiData.content,
      emojiData.type || "emoji",
      emojiData.isCustom ? 1 : 0,
      emojiData.enabled !== undefined ? (emojiData.enabled ? 1 : 0) : 1,
      emojiData.sortOrder || 0,
    ],
  );
  return result.insertId;
};

const updateEmoji = async (id, emojiData) => {
  const updates = [];
  const params = [];

  if (emojiData.content !== undefined) {
    updates.push("content = ?");
    params.push(emojiData.content);
  }
  if (emojiData.type !== undefined) {
    updates.push("type = ?");
    params.push(emojiData.type);
  }
  if (emojiData.isCustom !== undefined) {
    updates.push("is_custom = ?");
    params.push(emojiData.isCustom ? 1 : 0);
  }
  if (emojiData.enabled !== undefined) {
    updates.push("enabled = ?");
    params.push(emojiData.enabled ? 1 : 0);
  }
  if (emojiData.sortOrder !== undefined) {
    updates.push("sort_order = ?");
    params.push(emojiData.sortOrder);
  }

  if (updates.length === 0) return false;

  params.push(id);
  const [result] = await pool.query(
    `UPDATE emoji SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );
  return result.affectedRows > 0;
};

const deleteEmoji = async (id) => {
  const [result] = await pool.query("DELETE FROM emoji WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

/**
 * 公开的启用表情（供前台动态拉取，合并内置默认）
 */
const getEnabledEmojis = async () => {
  const [rows] = await pool.query(
    `SELECT id, content, type, is_custom AS isCustom
     FROM emoji
     WHERE enabled = ?
     ORDER BY sort_order ASC, id ASC`,
    [1],
  );
  return rows;
};

module.exports = {
  getEmojis,
  getEmojisCount,
  getEmojiById,
  createEmoji,
  updateEmoji,
  deleteEmoji,
  getEnabledEmojis,
};
