const pool = require("../config/database");

/**
 * 行 -> 前端字段映射
 */
const formatFriendLink = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    avatar: row.avatar,
    description: row.description,
    email: row.email,
    // 数据库 TINYINT -> 布尔
    status: Boolean(row.status),
    isSticky: Boolean(row.is_sticky),
    clickCount: row.click_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/**
 * 获取友链列表（支持分页 + 状态过滤）
 * @param {number} offset
 * @param {number} limit
 * @param {{ onlyEnabled?: boolean }} [filters] onlyEnabled=true 仅取启用的
 * @returns 排序：置顶优先，其次点击次数
 */
const getFriendLinks = async (offset, limit, filters = {}) => {
  let where = "WHERE 1 = 1";
  const params = [];
  if (filters.onlyEnabled) {
    where += " AND status = 1";
  }
  const [rows] = await pool.query(
    `SELECT * FROM friend_link ${where}
     ORDER BY is_sticky DESC, click_count DESC, id ASC
     LIMIT ? OFFSET ?;`,
    [...params, limit, offset],
  );
  return rows.map(formatFriendLink);
};

/**
 * 获取友链总数
 */
const getFriendLinksCount = async (filters = {}) => {
  let where = "WHERE 1 = 1";
  const params = [];
  if (filters.onlyEnabled) {
    where += " AND status = 1";
  }
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count FROM friend_link ${where};`,
    params,
  );
  return rows[0].count;
};

/**
 * 获取友链详情
 */
const getFriendLinkById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM friend_link WHERE id = ?;", [
    id,
  ]);
  return rows.length > 0 ? formatFriendLink(rows[0]) : null;
};

/**
 * 创建友链
 */
const createFriendLink = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO friend_link (name, url, avatar, description, email, status, is_sticky)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      data.name,
      data.url,
      data.avatar || null,
      data.description || null,
      data.email || null,
      data.status === false ? 0 : 1,
      data.isSticky ? 1 : 0,
    ],
  );
  return result.insertId;
};

/**
 * 更新友链
 */
const updateFriendLink = async (id, data) => {
  const updates = [];
  const params = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    params.push(data.name);
  }
  if (data.url !== undefined) {
    updates.push("url = ?");
    params.push(data.url);
  }
  if (data.avatar !== undefined) {
    updates.push("avatar = ?");
    params.push(data.avatar || null);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    params.push(data.description || null);
  }
  if (data.email !== undefined) {
    updates.push("email = ?");
    params.push(data.email || null);
  }
  if (data.status !== undefined) {
    updates.push("status = ?");
    params.push(data.status === false ? 0 : 1);
  }
  if (data.isSticky !== undefined) {
    updates.push("is_sticky = ?");
    params.push(data.isSticky ? 1 : 0);
  }

  if (updates.length === 0) return false;

  params.push(id);
  const [result] = await pool.query(
    `UPDATE friend_link SET ${updates.join(", ")} WHERE id = ?;`,
    params,
  );
  return result.affectedRows > 0;
};

/**
 * 删除友链
 */
const deleteFriendLink = async (id) => {
  const [result] = await pool.query("DELETE FROM friend_link WHERE id = ?;", [
    id,
  ]);
  return result.affectedRows > 0;
};

/**
 * 增加点击次数
 */
const incrementClickCount = async (id) => {
  const [result] = await pool.query(
    "UPDATE friend_link SET click_count = click_count + 1 WHERE id = ?;",
    [id],
  );
  return result.affectedRows > 0;
};

module.exports = {
  getFriendLinks,
  getFriendLinksCount,
  getFriendLinkById,
  createFriendLink,
  updateFriendLink,
  deleteFriendLink,
  incrementClickCount,
};
