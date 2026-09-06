const pool = require("../config/database");

/**
 * 前端错误监控上报 — 客户端错误日志表
 * 接收浏览器端未捕获错误/Vue 错误，供后台查看回溯。
 */

const create = async (data) => {
  const [result] = await pool.query(
    `INSERT INTO client_error_log
     (title, message, source, line, col, url, component, ua, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.title || "",
      data.message || "",
      data.source || "",
      data.line !== undefined && data.line !== null ? data.line : null,
      data.col !== undefined && data.col !== null ? data.col : null,
      data.url || "",
      data.component || "",
      data.ua || "",
    ],
  );
  return result.insertId;
};

const getList = async (offset, limit, filters = {}) => {
  let query = `
    SELECT id, title, message, source, line, col,
           url, component, ua, occurred_at AS occurredAt
    FROM client_error_log
    WHERE 1=1
  `;
  const params = [];

  if (filters.type) {
    query += " AND title = ?";
    params.push(filters.type);
  }

  query += " ORDER BY occurred_at DESC, id DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

const getListCount = async (filters = {}) => {
  let query = "SELECT COUNT(*) as count FROM client_error_log WHERE 1=1";
  const params = [];
  if (filters.type) {
    query += " AND title = ?";
    params.push(filters.type);
  }
  const [rows] = await pool.query(query, params);
  return rows[0].count;
};

const clearAll = async () => {
  const [result] = await pool.query("DELETE FROM client_error_log");
  return result.affectedRows;
};

module.exports = {
  create,
  getList,
  getListCount,
  clearAll,
};
