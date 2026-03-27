const pool = require("../config/database");

const formatArticle = (row) => {
  if (!row) return null;

  const labels = [];
  if (row.label_ids && row.label_names) {
    const ids = row.label_ids.split(",");
    const names = row.label_names.split(",");
    for (let i = 0; i < ids.length; i++) {
      if (ids[i]) {
        labels.push({ id: Number(ids[i]), labelName: names[i] || "" });
      }
    }
  }

  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    coverImage: row.cover_image,
    viewCount: row.view_count,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    type: row.type_name ? { id: row.type_id, typeName: row.type_name } : null,
    labels,
  };
};

const getArticles = async (offset, limit, filters = {}) => {
  let query = `
    SELECT a.id, a.title, a.summary, a.content, a.cover_image, a.view_count, a.status,
           a.type_id, a.created_at, a.updated_at, a.deleted_at,
           t.type_name,
           GROUP_CONCAT(l.id ORDER BY l.id) AS label_ids,
           GROUP_CONCAT(l.label_name ORDER BY l.id) AS label_names
    FROM article a
    LEFT JOIN \`type\` t ON a.type_id = t.id
    LEFT JOIN article_label al ON a.id = al.article_id
    LEFT JOIN \`label\` l ON al.label_id = l.id
    WHERE a.deleted_at IS NULL
  `;

  const params = [];

  if (filters.typeId) {
    query += " AND a.type_id = ?";
    params.push(filters.typeId);
  }

  if (filters.labelId) {
    query +=
      " AND a.id IN (SELECT article_id FROM article_label WHERE label_id = ?)";
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

  query += " GROUP BY a.id";

  const sortBy = filters.sortBy || "created_at";
  const sortOrder = filters.sortOrder || "DESC";

  if (sortBy === "view_count") {
    query += ` ORDER BY a.view_count ${sortOrder}`;
  } else {
    query += ` ORDER BY a.created_at ${sortOrder}`;
  }

  query += " LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows.map(formatArticle);
};

const getArticlesCount = async (filters = {}) => {
  let query =
    "SELECT COUNT(*) as count FROM article a WHERE a.deleted_at IS NULL";
  const params = [];

  if (filters.typeId) {
    query += " AND a.type_id = ?";
    params.push(filters.typeId);
  }

  if (filters.labelId) {
    query +=
      " AND a.id IN (SELECT article_id FROM article_label WHERE label_id = ?)";
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

const getArticleById = async (id) => {
  const [rows] = await pool.query(
    `SELECT a.id, a.title, a.summary, a.content, a.cover_image, a.view_count, a.status,
            a.type_id, a.created_at, a.updated_at, a.deleted_at,
            t.type_name,
            GROUP_CONCAT(l.id ORDER BY l.id) AS label_ids,
            GROUP_CONCAT(l.label_name ORDER BY l.id) AS label_names
     FROM article a
     LEFT JOIN \`type\` t ON a.type_id = t.id
     LEFT JOIN article_label al ON a.id = al.article_id
     LEFT JOIN \`label\` l ON al.label_id = l.id
     WHERE a.id = ? AND a.deleted_at IS NULL
     GROUP BY a.id`,
    [id],
  );

  return rows.length > 0 ? formatArticle(rows[0]) : null;
};

const createArticle = async (articleData) => {
  const [result] = await pool.query(
    `INSERT INTO article
      (type_id, title, summary, content, cover_image, view_count, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      articleData.typeId,
      articleData.title,
      articleData.summary || null,
      articleData.content,
      articleData.coverImage || null,
      articleData.viewCount || 0,
      articleData.status || "draft",
    ],
  );

  return result.insertId;
};

const updateArticle = async (id, articleData) => {
  const updates = [];
  const params = [];

  if (articleData.typeId !== undefined) {
    updates.push("type_id = ?");
    params.push(articleData.typeId);
  }
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
    updates.push("cover_image = ?");
    params.push(articleData.coverImage);
  }
  if (articleData.status !== undefined) {
    updates.push("status = ?");
    params.push(articleData.status);
  }

  if (updates.length === 0) return false;

  updates.push("updated_at = NOW()");
  params.push(id);

  const [result] = await pool.query(
    `UPDATE article SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );

  return result.affectedRows > 0;
};

const softDeleteArticle = async (id) => {
  const [result] = await pool.query(
    "UPDATE article SET deleted_at = NOW() WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

const restoreArticle = async (id) => {
  const [result] = await pool.query(
    "UPDATE article SET deleted_at = NULL WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

const getTrashArticles = async (offset, limit) => {
  const [rows] = await pool.query(
    `SELECT a.id, a.title, a.summary, a.cover_image, a.view_count, a.status,
            a.type_id, a.created_at, a.deleted_at,
            t.type_name
     FROM article a
     LEFT JOIN \`type\` t ON a.type_id = t.id
     WHERE a.deleted_at IS NOT NULL
     ORDER BY a.deleted_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows.map((row) => ({
    ...row,
    type: row.type_name ? { id: row.type_id, typeName: row.type_name } : null,
  }));
};

const getTrashArticlesCount = async () => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) as count FROM article WHERE deleted_at IS NOT NULL",
  );
  return rows[0].count;
};

const incrementViewCount = async (id) => {
  const [result] = await pool.query(
    "UPDATE article SET view_count = view_count + 1 WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

const addArticleLabels = async (articleId, labelIds) => {
  if (!labelIds || labelIds.length === 0) return true;

  const values = labelIds.map((labelId) => [articleId, labelId]);
  const [result] = await pool.query(
    "INSERT INTO article_label (article_id, label_id) VALUES ?",
    [values],
  );
  return result.affectedRows > 0;
};

const clearArticleLabels = async (articleId) => {
  await pool.query("DELETE FROM article_label WHERE article_id = ?", [
    articleId,
  ]);
  return true;
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
