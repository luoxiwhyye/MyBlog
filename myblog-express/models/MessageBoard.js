const pool = require("../config/database");

/**
 * 留言板模型 — 单层平铺留言（访客免登录，无回复嵌套、无点赞）
 */

const getMessages = async (offset, limit, filters = {}, isAdmin = false) => {
  let query = `
    SELECT id,
           author_name AS authorName, author_email AS authorEmail,
           author_url AS authorUrl, author_ip AS authorIp,
           content, status, create_at AS createdAt
    FROM message_board
    WHERE 1=1
  `;
  const params = [];

  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  } else if (filters.excludeDeleted) {
    query += " AND status <> ?";
    params.push("deleted");
  } else if (!isAdmin) {
    query += " AND status = ?";
    params.push("approved");
  }

  query += " ORDER BY create_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

const getMessagesCount = async (filters = {}, isAdmin = false) => {
  let query = "SELECT COUNT(*) as count FROM message_board WHERE 1=1";
  const params = [];

  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  } else if (filters.excludeDeleted) {
    query += " AND status <> ?";
    params.push("deleted");
  } else if (!isAdmin) {
    query += " AND status = ?";
    params.push("approved");
  }

  const [rows] = await pool.query(query, params);
  return rows[0].count;
};

const getMessageById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM message_board WHERE id = ?", [
    id,
  ]);
  return rows[0];
};

const createMessage = async (messageData) => {
  const [result] = await pool.query(
    `INSERT INTO message_board
     (author_name, author_email, author_url, author_ip, content, status, create_at)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      messageData.authorName,
      messageData.authorEmail,
      messageData.authorUrl || null,
      messageData.authorIp || "",
      messageData.content,
      "pending",
    ],
  );
  return result.insertId;
};

const updateStatus = async (id, status) => {
  const [result] = await pool.query(
    "UPDATE message_board SET status = ? WHERE id = ?",
    [status, id],
  );
  return result.affectedRows > 0;
};

const softDelete = async (id) => {
  return updateStatus(id, "deleted");
};

const hardDelete = async (id) => {
  const [result] = await pool.query("DELETE FROM message_board WHERE id = ?", [
    id,
  ]);
  return result.affectedRows > 0;
};

const countPending = async () => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM message_board WHERE status = ?",
    ["pending"],
  );
  return rows[0].count;
};

module.exports = {
  getMessages,
  getMessagesCount,
  getMessageById,
  createMessage,
  updateStatus,
  softDelete,
  hardDelete,
  countPending,
};
