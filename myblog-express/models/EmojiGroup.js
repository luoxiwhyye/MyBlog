const pool = require("../config/database");

/**
 * 表情分组模型
 * - name：分组名称
 * - cover：分组标识（Emoji 文本或图片 URL，可为空）
 * - sortOrder：排序
 *
 * 表情通过 emoji.group_id 归属分组；删除分组时 FG `ON DELETE SET NULL`，
 * 组内表情自动退回「未分组」（前台归入默认分组）。
 */

const GROUP_FIELDS = `
  g.id,
  g.name,
  g.cover,
  g.sort_order AS sortOrder,
  g.create_at AS createdAt
`;

const getGroups = async () => {
  const [rows] = await pool.query(
    `SELECT ${GROUP_FIELDS},
            (SELECT COUNT(*) FROM emoji e WHERE e.group_id = g.id) AS emojiCount
     FROM emoji_group g
     ORDER BY g.sort_order ASC, g.id ASC`,
  );
  return rows.map((row) => ({
    ...row,
    emojiCount: Number(row.emojiCount) || 0,
  }));
};

const getGroupById = async (id) => {
  const [rows] = await pool.query(
    `SELECT ${GROUP_FIELDS} FROM emoji_group g WHERE g.id = ?`,
    [id],
  );
  return rows[0];
};

const createGroup = async (groupData) => {
  const [result] = await pool.query(
    `INSERT INTO emoji_group (name, cover, sort_order, create_at)
     VALUES (?, ?, ?, NOW())`,
    [groupData.name, groupData.cover || null, groupData.sortOrder || 0],
  );
  return result.insertId;
};

const updateGroup = async (id, groupData) => {
  const updates = [];
  const params = [];

  if (groupData.name !== undefined) {
    updates.push("name = ?");
    params.push(groupData.name);
  }
  // cover 允许显式置空：undefined = 不动，null / '' = 清空
  if (groupData.cover !== undefined) {
    updates.push("cover = ?");
    params.push(groupData.cover === null ? null : groupData.cover);
  }
  if (groupData.sortOrder !== undefined) {
    updates.push("sort_order = ?");
    params.push(groupData.sortOrder);
  }

  if (updates.length === 0) return false;

  params.push(id);
  const [result] = await pool.query(
    `UPDATE emoji_group SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );
  return result.affectedRows > 0;
};

const deleteGroup = async (id) => {
  const [result] = await pool.query("DELETE FROM emoji_group WHERE id = ?", [
    id,
  ]);
  return result.affectedRows > 0;
};

module.exports = {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
};
