const pool = require("../config/database");

const getComments = async (offset, limit, filters = {}, isAdmin = false) => {
  let query = `
    SELECT c.id, c.article_id AS articleId, c.parent_id AS parentId,
           c.author_name AS authorName, c.author_email AS authorEmail,
           c.author_ip AS authorIp, c.content, c.like_count AS likeCount,
           c.status, c.create_at AS createdAt
    FROM comment c
    WHERE 1=1
  `;

  const params = [];

  if (filters.articleId) {
    query += " AND c.article_id = ?";
    params.push(filters.articleId);
  }

  if (!isAdmin) {
    query += " AND c.status = ?";
    params.push("approved");
  }

  query += " ORDER BY c.create_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

const getCommentsCount = async (filters = {}, isAdmin = false) => {
  let query = "SELECT COUNT(*) as count FROM comment WHERE 1=1";
  const params = [];

  if (filters.articleId) {
    query += " AND article_id = ?";
    params.push(filters.articleId);
  }

  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  } else if (!isAdmin) {
    query += " AND status = ?";
    params.push("approved");
  }

  const [rows] = await pool.query(query, params);
  return rows[0].count;
};

const getCommentById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM comment WHERE id = ?", [id]);
  return rows[0];
};

const getReplies = async (parentId) => {
  const [rows] = await pool.query(
    `SELECT id, article_id AS articleId, parent_id AS parentId,
            author_name AS authorName, author_email AS authorEmail,
            author_ip AS authorIp, content, like_count AS likeCount,
            status, create_at AS createdAt
     FROM comment WHERE parent_id = ? AND status = ?
     ORDER BY create_at ASC`,
    [parentId, "approved"],
  );
  return rows;
};

const createComment = async (commentData) => {
  const [result] = await pool.query(
    `INSERT INTO comment
     (article_id, parent_id, author_name, author_email, author_ip, content, status, create_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      commentData.articleId,
      commentData.parentId || null,
      commentData.authorName,
      commentData.authorEmail,
      commentData.authorIp || "",
      commentData.content,
      "pending",
    ],
  );
  return result.insertId;
};

const deleteComment = async (id) => {
  const [result] = await pool.query("DELETE FROM comment WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

const updateCommentStatus = async (id, status) => {
  const [result] = await pool.query(
    "UPDATE comment SET status = ? WHERE id = ?",
    [status, id],
  );
  return result.affectedRows > 0;
};

const incrementCommentLikes = async (id) => {
  const [result] = await pool.query(
    "UPDATE comment SET like_count = like_count + 1 WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

const getCommentsWithReplies = async (articleId, isAdmin = false) => {
  let query = `
    SELECT id, article_id AS articleId, parent_id AS parentId,
           author_name AS authorName, author_email AS authorEmail,
           author_ip AS authorIp, content, like_count AS likeCount,
           status, create_at AS createdAt
    FROM comment WHERE article_id = ? AND parent_id IS NULL
  `;

  const params = [articleId];

  if (!isAdmin) {
    query += " AND status = ?";
    params.push("approved");
  }

  query += " ORDER BY create_at DESC";

  const [topLevelComments] = await pool.query(query, params);

  for (const comment of topLevelComments) {
    comment.replies = await getReplies(comment.id);
  }

  return topLevelComments;
};

module.exports = {
  getComments,
  getCommentsCount,
  getCommentById,
  getReplies,
  createComment,
  deleteComment,
  updateCommentStatus,
  incrementCommentLikes,
  getCommentsWithReplies,
};
