const pool = require("../config/database");

/**
 * 获取所有分类（带分页）
 */
const getTypes = async (offset, limit) => {
  const [rows] = await pool.query(
    "SELECT id, type_name AS typeName FROM `type` ORDER BY id DESC LIMIT ? OFFSET ?",
    [limit, offset],
  );
  return rows;
};

/**
 * 获取分类总数
 */
const getTypesCount = async () => {
  const [rows] = await pool.query("SELECT COUNT(*) as count FROM `type`");
  return rows[0].count;
};

/**
 * 获取分类详情
 */
const getTypeById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, type_name AS typeName FROM `type` WHERE id = ?",
    [id],
  );
  return rows[0];
};

/**
 * 按名称查重（用于禁止重名）
 * 列 collation 为 utf8mb4_unicode_ci，故比较天然大小写不敏感、忽略尾部空格。
 * @param {string} typeName 已 trim 的名称
 * @param {number} [excludeId] 更新时排除自身
 */
const getTypeByName = async (typeName, excludeId) => {
  let query =
    "SELECT id, type_name AS typeName FROM `type` WHERE type_name = ?";
  const params = [typeName];

  if (excludeId) {
    query += " AND id <> ?";
    params.push(excludeId);
  }

  query += " LIMIT 1";
  const [rows] = await pool.query(query, params);
  return rows[0];
};

/**
 * 获取分类下的文章数（仅统计已发布）
 *
 * 必须与前台列表的口径一致：前台按 status='published' 拉取文章，
 * 若这里把草稿也算进去，就会出现「分类显示 N 篇、点进去是空列表」。
 * 删除保护另用 isTypeInUse（含草稿），两者不要合并。
 */
const getTypeArticleCount = async (typeId) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM `article` WHERE type_id = ? AND status = 'published' AND deleted_at IS NULL",
    [typeId],
  );
  return rows[0].count;
};

/**
 * 创建分类
 */
const createType = async (typeName) => {
  const [result] = await pool.query(
    "INSERT INTO `type` (type_name) VALUES (?)",
    [typeName],
  );
  return result.insertId;
};

/**
 * 更新分类
 */
const updateType = async (id, typeName) => {
  const [result] = await pool.query(
    "UPDATE `type` SET type_name = ? WHERE id = ?",
    [typeName, id],
  );
  return result.affectedRows > 0;
};

/**
 * 删除分类
 */
const deleteType = async (id) => {
  const [result] = await pool.query("DELETE FROM `type` WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

/**
 * 检查分类是否被使用（删除保护）
 *
 * 刻意把草稿也算在内：某分类只要有草稿就不应被删除，否则草稿会失去归属。
 * 与展示用的 getTypeArticleCount（仅已发布）口径不同是特意为之。
 */
const isTypeInUse = async (typeId) => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM `article` WHERE type_id = ? AND deleted_at IS NULL",
    [typeId],
  );
  return rows[0].count > 0;
};

module.exports = {
  getTypes,
  getTypesCount,
  getTypeById,
  getTypeByName,
  getTypeArticleCount,
  createType,
  updateType,
  deleteType,
  isTypeInUse,
};
