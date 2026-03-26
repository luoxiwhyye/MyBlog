const pool = require("../config/database");

/**
 * 分页查询评论
 */
const getComments = async (offset, limit, filters = {}, isAdmin = false) => {
  let query = `
    SELECT c.id, c.articleId, c.parentId, c.authorName, c.authorEmail, 
           c.content, c.likeCount, c.status, c.createdAt
    FROM comments c
    WHERE 1=1
  `;

  const params = [];

  if (filters.articleId) {
    query += " AND c.articleId = ?";
    params.push(filters.articleId);
  }

  // 非管理员只能看已批准的评论
  if (!isAdmin) {
    query += " AND c.status = ?";
    params.push("approved");
  }

  query += " ORDER BY c.createdAt DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

/**
 * 获取评论总数
 */
const getCommentsCount = async (filters = {}, isAdmin = false) => {
  let query = "SELECT COUNT(*) as count FROM comments WHERE 1=1";
  const params = [];

  if (filters.articleId) {
    query += " AND articleId = ?";
    params.push(filters.articleId);
  }

  if (!isAdmin) {
    query += " AND status = ?";
    params.push("approved");
  }

  const [rows] = await pool.query(query, params);
  return rows[0].count;
};

/**
 * 获取评论详情
 */
const getCommentById = async (id) => {
  const [rows] = await pool.query("SELECT * FROM comments WHERE id = ?", [id]);
  return rows[0];
};

/**
 * 获取评论的回复
 */
const getReplies = async (parentId) => {
  const [rows] = await pool.query(
    `SELECT id, articleId, parentId, authorName, authorEmail, 
            content, likeCount, status, createdAt
     FROM comments WHERE parentId = ? AND status = ?
     ORDER BY createdAt ASC`,
    [parentId, "approved"],
  );
  return rows;
};

/**
 * 创建评论
 */
const createComment = async (commentData) => {
  const [result] = await pool.query(
    `INSERT INTO comments 
     (articleId, parentId, authorName, authorEmail, content, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      commentData.articleId,
      commentData.parentId || null,
      commentData.authorName,
      commentData.authorEmail,
      commentData.content,
      "pending", // 默认待审核
    ],
  );
  return result.insertId;
};

/**
 * 删除评论
 */
const deleteComment = async (id) => {
  const [result] = await pool.query("DELETE FROM comments WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

/**
 * 更新评论状态
 */
const updateCommentStatus = async (id, status) => {
  const [result] = await pool.query(
    "UPDATE comments SET status = ? WHERE id = ?",
    [status, id],
  );
  return result.affectedRows > 0;
};

/**
 * 增加评论点赞数
 */
const incrementCommentLikes = async (id) => {
  const [result] = await pool.query(
    "UPDATE comments SET likeCount = likeCount + 1 WHERE id = ?",
    [id],
  );
  return result.affectedRows > 0;
};

/**
 * 获取文章的所有评论及回复（树形结构）
 */
const getCommentsWithReplies = async (articleId, isAdmin = false) => {
  // 获取顶级评论
  let query = `
    SELECT id, articleId, parentId, authorName, authorEmail, 
           content, likeCount, status, createdAt
    FROM comments WHERE articleId = ? AND parentId IS NULL
  `;

  const params = [articleId];

  if (!isAdmin) {
    query += " AND status = ?";
    params.push("approved");
  }

  query += " ORDER BY createdAt DESC";

  const [topLevelComments] = await pool.query(query, params);

  // 为每个顶级评论获取回复
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
