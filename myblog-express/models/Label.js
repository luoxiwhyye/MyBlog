const pool = require("../config/database");

/**
 * 获取所有标签（带分页，支持按名称模糊检索）
 * @param {number} offset
 * @param {number} limit
 * @param {string} [keyword] 名称关键词（可选，空则不过滤）
 */
const getLabels = async (offset, limit, keyword = "") => {
  const params = [];
  let query = "SELECT id, label_name AS labelName FROM `label` WHERE 1=1";

  const kw = typeof keyword === "string" ? keyword.trim() : "";
  if (kw) {
    query += " AND label_name LIKE ?";
    params.push(`%${kw}%`);
  }

  query += " ORDER BY id DESC LIMIT ? OFFSET ?;";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

/**
 * 获取标签总数（与 getLabels 用同一过滤条件，否则分页总数与列表不匹配）
 * @param {string} [keyword] 名称关键词（可选）
 */
const getLabelsCount = async (keyword = "") => {
  const params = [];
  let query = "SELECT COUNT(*) as count FROM `label` WHERE 1=1";

  const kw = typeof keyword === "string" ? keyword.trim() : "";
  if (kw) {
    query += " AND label_name LIKE ?";
    params.push(`%${kw}%`);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].count;
};

/**
 * 获取标签详情
 */
const getLabelById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, label_name AS labelName FROM `label` WHERE id = ?;",
    [id],
  );
  return rows[0];
};

/**
 * 按名称查重（用于禁止重名）
 * 列 collation 为 utf8mb4_unicode_ci，故比较天然大小写不敏感、忽略尾部空格。
 * @param {string} labelName 已 trim 的名称
 * @param {number} [excludeId] 更新时排除自身
 */
const getLabelByName = async (labelName, excludeId) => {
  let query =
    "SELECT id, label_name AS labelName FROM `label` WHERE label_name = ?";
  const params = [labelName];

  if (excludeId) {
    query += " AND id <> ?";
    params.push(excludeId);
  }

  query += " LIMIT 1";
  const [rows] = await pool.query(query, params);
  return rows[0];
};

/**
 * 获取标签下的文章数
 */
const getLabelArticleCount = async (labelId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count FROM article_label al
     JOIN article a ON al.article_id = a.id
     WHERE al.label_id = ? AND a.deleted_at IS NULL;`,
    [labelId],
  );
  return rows[0].count;
};

/**
 * 创建标签
 */
const createLabel = async (labelName) => {
  const [result] = await pool.query(
    "INSERT INTO `label` (label_name) VALUES (?);",
    [labelName],
  );
  return result.insertId;
};

/**
 * 更新标签
 */
const updateLabel = async (id, labelName) => {
  const [result] = await pool.query(
    "UPDATE `label` SET label_name = ? WHERE id = ?;",
    [labelName, id],
  );
  return result.affectedRows > 0;
};

/**
 * 删除标签
 */
const deleteLabel = async (id) => {
  const [result] = await pool.query("DELETE FROM `label` WHERE id = ?;", [id]);
  return result.affectedRows > 0;
};

/**
 * 检查标签是否被使用
 */
const isLabelInUse = async (labelId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count FROM article_label al
     WHERE al.label_id = ?;`,
    [labelId],
  );
  return rows[0].count > 0;
};

module.exports = {
  getLabels,
  getLabelsCount,
  getLabelById,
  getLabelByName,
  getLabelArticleCount,
  createLabel,
  updateLabel,
  deleteLabel,
  isLabelInUse,
};
