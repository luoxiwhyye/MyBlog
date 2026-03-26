const pool = require("../config/database");

/**
 * 分页查询文章
 */
const getArticles = async (offset, limit, filters = {}) => {
  let query = `
    SELECT a.id, a.title, a.summary, a.coverImage, a.viewCount, a.status, 
           a.typeId, a.createdAt, a.updatedAt,
           t.typeName,
           GROUP_CONCAT(JSON_OBJECT('id', l.id, 'labelName', l.labelName)) as labels
    FROM articles a
    LEFT JOIN types t ON a.typeId = t.id
    LEFT JOIN article_labels al ON a.id = al.articleId
    LEFT JOIN labels l ON al.labelId = l.id
    WHERE a.deletedAt IS NULL
  `;

  const params = [];

  // 按分类过滤
  if (filters.typeId) {
    query += " AND a.typeId = ?";
    params.push(filters.typeId);
  }

  // 按标签过滤
  if (filters.labelId) {
    query +=
      " AND a.id IN (SELECT articleId FROM article_labels WHERE labelId = ?)";
    params.push(filters.labelId);
  }

  // 按状态过滤
  if (filters.status) {
    query += " AND a.status = ?";
    params.push(filters.status);
  }

  // 按关键词搜索
  if (filters.keyword) {
    query += " AND (a.title LIKE ? OR a.content LIKE ?)";
    const keyword = `%${filters.keyword}%`;
    params.push(keyword, keyword);
  }

  query += " GROUP BY a.id";

  // 排序
  const sortBy = filters.sortBy || "created_at";
  const sortOrder = filters.sortOrder || "DESC";
  if (sortBy === "view_count") {
    query += ` ORDER BY a.viewCount ${sortOrder}`;
  } else {
    query += ` ORDER BY a.createdAt ${sortOrder}`;
  }

  query += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows.map(formatArticle);
};

/**
 * 获取文章总数
 */
const getArticlesCount = async (filters = {}) => {
  let query =
    "SELECT COUNT(DISTINCT a.id) as count FROM articles a WHERE a.deletedAt IS NULL";
  const params = [];

  if (filters.typeId) {
    query += " AND a.typeId = ?";
    params.push(filters.typeId);
  }

  if (filters.labelId) {
    query +=
      " AND a.id IN (SELECT articleId FROM article_labels WHERE labelId = ?)";
    params.push(filters.labelId);
  }

  if (filters.status) {
    query += " AND a.status = ?";
    params.push(filters.status);
  }

  if (filters.keyword) {
    query += " AND (a.title LIKE ? OR a.content LIKE ?)";
    const keyword = `%${filters.keyword}%`;
    params.push(keyword, keyword);
  }

  const [rows] = await pool.query(query, params);
  return rows[0].count;
};

/**
 * 获取文章详情
 */
const getArticleById = async (id) => {
  const [rows] = await pool.query(
    `SELECT a.id, a.title, a.summary, a.content, a.coverImage, a.viewCount, 
            a.status, a.typeId, a.createdAt, a.updatedAt, a.deletedAt,
            t.typeName,
            GROUP_CONCAT(JSON_OBJECT('id', l.id, 'labelName', l.labelName)) as labels
     FROM articles a
     LEFT JOIN types t ON a.typeId = t.id
     LEFT JOIN article_labels al ON a.id = al.articleId
     LEFT JOIN labels l ON al.labelId = l.id
     WHERE a.id = ? AND a.deletedAt IS NULL
     GROUP BY a.id`,
    [id],
  );
  return rows.length > 0 ? formatArticle(rows[0]) : null;
};

/**
 * 创建文章
 */
const createArticle = async (articleData) => {
  const [result] = await pool.query(
    `INSERT INTO articles 
     (title, summary, content, coverImage, typeId, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      articleData.title,
      articleData.summary,
      articleData.content,
      articleData.coverImage,
      articleData.typeId,
      articleData.status || "draft",
    ],
  );
  return result.insertId;
};

/**
 * 更新文章
 */
const updateArticle = async (id, articleData) => {
  const updates = [];
  const params = [];

  if (articleData.title !== undefined) {
    updates.push("title = ?");
    params.push(articleData.title);
  }
  if (articleData.summary !== undefined) {
    updates.push("summary = ?");
    params.push(articleData.summary);
  }
  if (articleData.content !== undefined) {
    updates.push("content = ?");
    params.push(articleData.content);
  }
  if (articleData.coverImage !== undefined) {
    updates.push("coverImage = ?");
    params.push(articleData.coverImage);
  }
  if (articleData.typeId !== undefined) {
    updates.push("typeId = ?");
    params.push(articleData.typeId);
  }
  if (articleData.status !== undefined) {
    updates.push("status = ?");
    params.push(articleData.status);
  }

  if (updates.length === 0) return false;

  updates.push("updatedAt = NOW()");
  params.push(id);

  const [result] = await pool.query(
    `UPDATE articles SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );
  return result.affectedRows > 0;
};

/**
 * 软删除文章
 */
const softDeleteArticle = async (id) => {
  const [result] = await pool.query(
    "UPDATE articles SET deletedAt = NOW() WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

/**
 * 恢复软删除的文章
 */
const restoreArticle = async (id) => {
  const [result] = await pool.query(
    "UPDATE articles SET deletedAt = NULL WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

/**
 * 获取已删除文章列表
 */
const getTrashArticles = async (offset, limit) => {
  const [rows] = await pool.query(
    `SELECT a.id, a.title, a.summary, a.coverImage, a.viewCount, a.status, 
            a.typeId, a.createdAt, a.deletedAt,
            t.typeName
     FROM articles a
     LEFT JOIN types t ON a.typeId = t.id
     WHERE a.deletedAt IS NOT NULL
     ORDER BY a.deletedAt DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows;
};

/**
 * 获取软删除文章总数
 */
const getTrashArticlesCount = async () => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM articles WHERE deletedAt IS NOT NULL",
  );
  return rows[0].count;
};

/**
 * 增加浏览次数
 */
const incrementViewCount = async (id) => {
  const [result] = await pool.query(
    "UPDATE articles SET viewCount = viewCount + 1 WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

/**
 * 添加标签关联
 */
const addArticleLabels = async (articleId, labelIds) => {
  if (!labelIds || labelIds.length === 0) return true;

  const values = labelIds.map((labelId) => [articleId, labelId]);
  const [result] = await pool.query(
    "INSERT INTO article_labels (articleId, labelId) VALUES ?",
    [values],
  );
  return result.affectedRows > 0;
};

/**
 * 删除文章的所有标签关联
 */
const clearArticleLabels = async (articleId) => {
  const [result] = await pool.query(
    "DELETE FROM article_labels WHERE articleId = ?",
    [articleId],
  );
  return true;
};

/**
 * 格式化文章数据
 */
const formatArticle = (row) => {
  if (!row) return null;

  const article = {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    coverImage: row.coverImage,
    viewCount: row.viewCount,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    type: row.typeName ? { id: row.typeId, typeName: row.typeName } : null,
    labels: [],
  };

  if (row.labels && row.labels !== "null") {
    try {
      const labelsJson = `[${row.labels}]`;
      article.labels = JSON.parse(labelsJson);
    } catch (e) {
      article.labels = [];
    }
  }

  return article;
};

module.exports = {
  getArticles,
  getArticlesCount,
  getArticleById,
  createArticle,
  updateArticle,
  softDeleteArticle,
  restoreArticle,
  getTrashArticles,
  getTrashArticlesCount,
  incrementViewCount,
  addArticleLabels,
  clearArticleLabels,
};
