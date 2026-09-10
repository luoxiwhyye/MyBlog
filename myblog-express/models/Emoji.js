const pool = require("../config/database");

/**
 * 表情模型 — 支持文本表情（emoji/颜文字）与自定义图片表情（URL）
 * content：文本表情内容，或自定义图片表情的 URL
 * type：'emoji' | 'kaomoji' | 'image'
 * groupId：所属分组 id（NULL = 未分组，前台归「默认」分组）
 * isCustom：是否博主自定义（0=内置默认，1=自定义）
 * enabled：是否启用（0=停用，1=启用）
 * sortOrder：排序
 */

// 表情列表通用字段（含分组信息）
const EMOJI_FIELDS = `
  e.id, e.content, e.type, e.is_custom AS isCustom,
  e.enabled, e.sort_order AS sortOrder, e.group_id AS groupId,
  g.name AS groupName, e.create_at AS createdAt
`;

// 分组筛选条件解析：
//   '' | undefined  → 全部（不加条件）
//   0 | 'null' | 'none' | 'default' → 未分组（IS NULL）
//   正整数 → 指定分组
const resolveGroupFilter = (groupId) => {
  if (groupId === undefined || groupId === null || groupId === "") {
    return { mode: "all" };
  }
  const raw = String(groupId).trim().toLowerCase();
  if (raw === "0" || raw === "null" || raw === "none" || raw === "default") {
    return { mode: "none" };
  }
  const id = Number(groupId);
  if (!Number.isInteger(id) || id <= 0) {
    return { mode: "all" };
  }
  return { mode: "group", id };
};

const getEmojis = async (offset, limit, filters = {}, isAdmin = false) => {
  let query = `
    SELECT ${EMOJI_FIELDS}
    FROM emoji e
    LEFT JOIN emoji_group g ON g.id = e.group_id
    WHERE 1=1
  `;
  const params = [];

  if (!isAdmin) {
    query += " AND e.enabled = ?";
    params.push(1);
  } else if (filters.enabled !== undefined) {
    query += " AND e.enabled = ?";
    params.push(filters.enabled ? 1 : 0);
  }

  if (filters.type) {
    query += " AND e.type = ?";
    params.push(filters.type);
  }

  const groupFilter = resolveGroupFilter(filters.groupId);
  if (groupFilter.mode === "none") {
    query += " AND e.group_id IS NULL";
  } else if (groupFilter.mode === "group") {
    query += " AND e.group_id = ?";
    params.push(groupFilter.id);
  }

  query += " ORDER BY e.sort_order ASC, e.id ASC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

const getEmojisCount = async (filters = {}, isAdmin = false) => {
  let query = "SELECT COUNT(*) as count FROM emoji e WHERE 1=1";
  const params = [];

  if (!isAdmin) {
    query += " AND e.enabled = ?";
    params.push(1);
  } else if (filters.enabled !== undefined) {
    query += " AND e.enabled = ?";
    params.push(filters.enabled ? 1 : 0);
  }

  if (filters.type) {
    query += " AND e.type = ?";
    params.push(filters.type);
  }

  const groupFilter = resolveGroupFilter(filters.groupId);
  if (groupFilter.mode === "none") {
    query += " AND e.group_id IS NULL";
  } else if (groupFilter.mode === "group") {
    query += " AND e.group_id = ?";
    params.push(groupFilter.id);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].count;
};

const getEmojiById = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${EMOJI_FIELDS}
     FROM emoji e
     LEFT JOIN emoji_group g ON g.id = e.group_id
     WHERE e.id = ?`,
    [id],
  );
  return rows[0];
};

const createEmoji = async (emojiData) => {
  const [result] = await pool.query(
    `INSERT INTO emoji (content, type, group_id, is_custom, enabled, sort_order, create_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      emojiData.content,
      emojiData.type || "emoji",
      emojiData.groupId || null,
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
  // groupId：undefined = 不动；null / 0 = 移出分组
  if (emojiData.groupId !== undefined) {
    updates.push("group_id = ?");
    params.push(emojiData.groupId || null);
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
    `SELECT e.id, e.content, e.type, e.is_custom AS isCustom,
            e.group_id AS groupId, e.sort_order AS sortOrder
     FROM emoji e
     LEFT JOIN emoji_group g ON g.id = e.group_id
     WHERE e.enabled = ?
     ORDER BY e.sort_order ASC, e.id ASC`,
    [1],
  );
  return rows;
};

/**
 * 公开：按分组返回启用表情（前台 picker 用）
 * 返回 [{ id, name, cover, sortOrder, emojis: [...] }]
 * 未归属分组的表情归入默认分组（id=0, name='默认'）。
 */
const getEnabledGrouped = async () => {
  const [groupRows] = await pool.query(
    `SELECT id, name, cover, sort_order AS sortOrder
     FROM emoji_group
     ORDER BY sort_order ASC, id ASC`,
  );
  const [emojiRows] = await pool.query(
    `SELECT id, content, type, group_id AS groupId, sort_order AS sortOrder
     FROM emoji
     WHERE enabled = ?
     ORDER BY sort_order ASC, id ASC`,
    [1],
  );

  const groups = groupRows.map((group) => ({
    id: group.id,
    name: group.name,
    cover: group.cover,
    sortOrder: group.sortOrder,
    emojis: [],
  }));
  const groupMap = new Map(groups.map((group) => [group.id, group]));

  // 未分组（含分组已被删除的兜底）统一进默认分组
  let defaultGroup = null;
  const ensureDefaultGroup = () => {
    if (!defaultGroup) {
      defaultGroup = {
        id: 0,
        name: "默认",
        cover: "",
        sortOrder: Number.MAX_SAFE_INTEGER,
        emojis: [],
      };
      groups.push(defaultGroup);
    }
    return defaultGroup;
  };

  for (const emoji of emojiRows) {
    const target =
      emoji.groupId != null
        ? groupMap.get(emoji.groupId)
        : ensureDefaultGroup();
    const bucket = target || ensureDefaultGroup();
    bucket.emojis.push({
      id: emoji.id,
      content: emoji.content,
      type: emoji.type,
    });
  }

  return groups.filter((group) => group.emojis.length > 0);
};

module.exports = {
  getEmojis,
  getEmojisCount,
  getEmojiById,
  createEmoji,
  updateEmoji,
  deleteEmoji,
  getEnabledEmojis,
  getEnabledGrouped,
  resolveGroupFilter,
};
