const pool = require("../config/database");

const getOrderClause = (sortBy = "latest") => {
  if (sortBy === "hottest") {
    return " ORDER BY c.like_count DESC, c.create_at DESC";
  }

  return " ORDER BY c.create_at DESC";
};

const getComments = async (
  offset,
  limit,
  filters = {},
  isAdmin = false,
  options = {},
) => {
  let query = `
    SELECT c.id, c.article_id AS articleId, c.parent_id AS parentId,
           c.author_name AS authorName, c.author_email AS authorEmail,
           c.author_ip AS authorIp, c.content, c.like_count AS likeCount,
           c.status, c.create_at AS createdAt
    FROM comment c
    WHERE 1=1
  `;

  const params = [];
  const { topLevelOnly = false, sortBy = "latest" } = options;

  if (filters.articleId) {
    query += " AND c.article_id = ?";
    params.push(filters.articleId);
  }

  if (topLevelOnly) {
    query += " AND c.parent_id IS NULL";
  }

  if (filters.status) {
    query += " AND c.status = ?";
    params.push(filters.status);
  } else if (filters.excludeDeleted) {
    query += " AND c.status <> ?";
    params.push("deleted");
  }

  if (!isAdmin && !filters.status) {
    query += " AND c.status = ?";
    params.push("approved");
  }

  query += `${getOrderClause(sortBy)} LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await pool.query(query, params);
  return rows;
};

const getCommentsCount = async (
  filters = {},
  isAdmin = false,
  options = {},
) => {
  let query = "SELECT COUNT(*) as count FROM comment WHERE 1=1";
  const params = [];
  const { topLevelOnly = false } = options;

  if (filters.articleId) {
    query += " AND article_id = ?";
    params.push(filters.articleId);
  }

  if (topLevelOnly) {
    query += " AND parent_id IS NULL";
  }

  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  } else if (filters.excludeDeleted) {
    query += " AND status <> ?";
    params.push("deleted");
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

const getDirectReplyIds = async (connection, parentIds) => {
  if (!parentIds.length) return [];

  const placeholders = parentIds.map(() => "?").join(", ");
  const [rows] = await connection.query(
    `SELECT id FROM comment WHERE parent_id IN (${placeholders})`,
    parentIds,
  );

  return rows.map((item) => item.id);
};

const getDescendantCommentIds = async (connection, rootId) => {
  const ids = [rootId];
  let currentLevel = [rootId];

  while (currentLevel.length > 0) {
    const nextLevel = await getDirectReplyIds(connection, currentLevel);
    if (!nextLevel.length) {
      break;
    }

    ids.push(...nextLevel);
    currentLevel = nextLevel;
  }

  return ids;
};

const updateCommentsStatusByIds = async (connection, ids, status) => {
  if (!ids.length) return false;

  const placeholders = ids.map(() => "?").join(", ");
  const [result] = await connection.query(
    `UPDATE comment SET status = ? WHERE id IN (${placeholders})`,
    [status, ...ids],
  );

  return result.affectedRows > 0;
};

const softDeleteComment = async (id) => {
  const connection = await pool.getConnection();

  try {
    const rootId = Number(id);

    await connection.beginTransaction();
    const idsToDelete = await getDescendantCommentIds(connection, rootId);
    const updated = await updateCommentsStatusByIds(
      connection,
      idsToDelete,
      "deleted",
    );
    await connection.commit();

    return updated;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const restoreComment = async (id) => {
  const connection = await pool.getConnection();

  try {
    const rootId = Number(id);

    await connection.beginTransaction();
    const idsToRestore = await getDescendantCommentIds(connection, rootId);
    const updated = await updateCommentsStatusByIds(
      connection,
      idsToRestore,
      "pending",
    );
    await connection.commit();

    return updated;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const deleteComment = async (id) => {
  const connection = await pool.getConnection();

  try {
    const rootId = Number(id);

    await connection.beginTransaction();

    const idsToDelete = await getDescendantCommentIds(connection, rootId);
    const placeholders = idsToDelete.map(() => "?").join(", ");
    const [result] = await connection.query(
      `DELETE FROM comment WHERE id IN (${placeholders})`,
      idsToDelete,
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
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
  getOrderClause,
  getComments,
  getCommentsCount,
  getCommentById,
  getReplies,
  createComment,
  softDeleteComment,
  restoreComment,
  deleteComment,
  updateCommentStatus,
  incrementCommentLikes,
  getCommentsWithReplies,
};
