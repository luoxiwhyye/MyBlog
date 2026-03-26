const pool = require("../config/database");

/**
 * 获取所有标签（带分页）
 */
const getLabels = async (offset, limit) => {
  const [rows] = await pool.query(
    "SELECT id, labelName, createdAt FROM labels ORDER BY id DESC LIMIT ? OFFSET ?",
    [limit, offset],
  );
  return rows;
};

/**
 * 获取标签总数
 */
const getLabelsCount = async () => {
  const [rows] = await pool.query("SELECT COUNT(*) as count FROM labels");
  return rows[0].count;
};

/**
 * 获取标签详情
 */
const getLabelById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, labelName, createdAt FROM labels WHERE id = ?",
    [id],
  );
  return rows[0];
};

/**
 * 获取标签下的文章数
 */
const getLabelArticleCount = async (labelId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count FROM article_labels 
     WHERE labelId = ? AND articleId IN 
     (SELECT id FROM articles WHERE deletedAt IS NULL)`,
    [labelId],
  );
  return rows[0].count;
};

/**
 * 创建标签
 */
const createLabel = async (labelName) => {
  const [result] = await pool.query(
    "INSERT INTO labels (labelName, createdAt) VALUES (?, NOW())",
    [labelName],
  );
  return result.insertId;
};

/**
 * 更新标签
 */
const updateLabel = async (id, labelName) => {
  const [result] = await pool.query(
    "UPDATE labels SET labelName = ? WHERE id = ?",
    [labelName, id],
  );
  return result.affectedRows > 0;
};

/**
 * 删除标签
 */
const deleteLabel = async (id) => {
  const [result] = await pool.query("DELETE FROM labels WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

/**
 * 检查标签是否被使用
 */
const isLabelInUse = async (labelId) => {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count FROM article_labels 
     WHERE labelId = ? AND articleId IN 
     (SELECT id FROM articles WHERE deletedAt IS NULL)`,
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
