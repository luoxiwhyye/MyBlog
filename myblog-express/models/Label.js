const pool = require("../config/database");

/**
 * 获取所有标签（带分页）
 */
const getLabels = async (offset, limit) => {
  const [rows] = await pool.query(
    "SELECT id, label_name AS labelName FROM `label` ORDER BY id DESC LIMIT ? OFFSET ?;",
    [limit, offset],
  );
  return rows;
};

/**
 * 获取标签总数
 */
const getLabelsCount = async () => {
  const [rows] = await pool.query("SELECT COUNT(*) as count FROM `label`;");
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
  getLabelArticleCount,
  createLabel,
  updateLabel,
  deleteLabel,
  isLabelInUse,
};
