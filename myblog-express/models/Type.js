const pool = require("../config/database");

/**
 * 获取所有分类（带分页）
 */
const getTypes = async (offset, limit) => {
  const [rows] = await pool.query(
    `SELECT id, typeName, createdAt FROM types ORDER BY id DESC LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows;
};

/**
 * 获取分类总数
 */
const getTypesCount = async () => {
  const [rows] = await pool.query("SELECT COUNT(*) as count FROM types");
  return rows[0].count;
};

/**
 * 获取分类详情
 */
const getTypeById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, typeName, createdAt FROM types WHERE id = ?",
    [id],
  );
  return rows[0];
};

/**
 * 获取分类下的文章数
 */
const getTypeArticleCount = async (typeId) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM articles WHERE typeId = ? AND deletedAt IS NULL",
    [typeId],
  );
  return rows[0].count;
};

/**
 * 创建分类
 */
const createType = async (typeName) => {
  const [result] = await pool.query(
    "INSERT INTO types (typeName, createdAt) VALUES (?, NOW())",
    [typeName],
  );
  return result.insertId;
};

/**
 * 更新分类
 */
const updateType = async (id, typeName) => {
  const [result] = await pool.query(
    "UPDATE types SET typeName = ? WHERE id = ?",
    [typeName, id],
  );
  return result.affectedRows > 0;
};

/**
 * 删除分类
 */
const deleteType = async (id) => {
  const [result] = await pool.query("DELETE FROM types WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

/**
 * 检查分类是否被使用
 */
const isTypeInUse = async (typeId) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM articles WHERE typeId = ? AND deletedAt IS NULL",
    [typeId],
  );
  return rows[0].count > 0;
};

module.exports = {
  getTypes,
  getTypesCount,
  getTypeById,
  getTypeArticleCount,
  createType,
  updateType,
  deleteType,
  isTypeInUse,
};
