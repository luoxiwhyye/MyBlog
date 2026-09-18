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
  // 「接收通知」只对管理端返回：公开列表没必要把访客的订阅偏好也发出去
  const notifyColumn = isAdmin ? ", c.notify_email AS notifyEmail" : "";
  // 父评论状态也只在管理端返回 —— 界面用它提示「父评论未通过审核」
  // ⚠️ 新增键一律追加在最后，且要与 Spring 的 toMap 保持同样的追加顺序
  const parentColumn = isAdmin ? ", p.status AS parentStatus" : "";

  let query = `
    SELECT c.id, c.article_id AS articleId, c.parent_id AS parentId,
           c.author_name AS authorName, c.author_email AS authorEmail,
           c.author_url AS authorUrl, c.author_ip AS authorIp,
           c.content, c.like_count AS likeCount,
           c.status, c.create_at AS createdAt${notifyColumn}${parentColumn}
    FROM comment c
    LEFT JOIN comment p ON p.id = c.parent_id
    WHERE 1=1
  `;

  const params = [];
  const { topLevelOnly = false, sortBy = "latest", level = "all" } = options;

  if (filters.articleId) {
    query += " AND c.article_id = ?";
    params.push(filters.articleId);
  }

  // 层级筛选：top = 仅父评论、reply = 仅回复（topLevelOnly 是前台详情页的等价旧参数）
  if (topLevelOnly || level === "top") {
    query += " AND c.parent_id IS NULL";
  } else if (level === "reply") {
    query += " AND c.parent_id IS NOT NULL";
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
  const { topLevelOnly = false, level = "all" } = options;

  if (filters.articleId) {
    query += " AND article_id = ?";
    params.push(filters.articleId);
  }

  if (topLevelOnly || level === "top") {
    query += " AND parent_id IS NULL";
  } else if (level === "reply") {
    query += " AND parent_id IS NOT NULL";
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
            author_url AS authorUrl, author_ip AS authorIp,
            content, like_count AS likeCount,
            status, create_at AS createdAt
     FROM comment WHERE parent_id = ? AND status = ?
     ORDER BY create_at ASC`,
    [parentId, "approved"],
  );
  return rows;
};

/**
 * 批量获取多个父评论的所有回复 — 消除 N+1 查询
 * @param {number[]} parentIds
 * @returns {Promise<Record<number, Array>>} parentId → replies[] 映射
 */
const getRepliesBatch = async (parentIds) => {
  if (!parentIds.length) return {};

  const placeholders = parentIds.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `SELECT id, article_id AS articleId, parent_id AS parentId,
            author_name AS authorName, author_email AS authorEmail,
            author_url AS authorUrl, author_ip AS authorIp,
            content, like_count AS likeCount,
            status, create_at AS createdAt
     FROM comment
     WHERE parent_id IN (${placeholders}) AND status = ?
     ORDER BY create_at ASC`,
    [...parentIds, "approved"],
  );

  const map = {};
  for (const row of rows) {
    const pid = row.parentId;
    if (!map[pid]) map[pid] = [];
    map[pid].push(row);
  }
  return map;
};

const createComment = async (commentData) => {
  const [result] = await pool.query(
    `INSERT INTO comment
     (article_id, parent_id, reply_to_id, author_name, author_email, author_url, author_ip, content, status, notify_email, create_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      commentData.articleId,
      commentData.parentId || null,
      // 被回复的**具体**评论（回复二级评论时与 parentId 不同）：仅用于定位通知收件人
      commentData.replyToId || null,
      commentData.authorName,
      commentData.authorEmail,
      commentData.authorUrl || null,
      commentData.authorIp || "",
      commentData.content,
      "pending",
      // 访客显式勾选才为 1；未勾选 / 未传 = 0（不接收）
      commentData.notifyEmail ? 1 : 0,
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

/**
 * 展开「根评论 + 其全部后代」。
 *
 * 评论是两级结构（回复的回复会被规整挂到顶层父级下），正常只需一层；
 * 仍按逐层展开实现，兼顾历史数据里可能存在的更深父链。
 *
 * ⚠️ 用 Set 记录已纳入的 id：一来自带去重（多个根共享同一后代时只取一次），
 * 二来**防自环死循环**（`parent_id` 指向自己时，旧的递归实现会永不终止）。
 */
const getDescendantCommentIds = async (connection, rootIds) => {
  const roots = Array.isArray(rootIds) ? rootIds : [rootIds];
  const all = new Set(roots);
  let currentLevel = [...all];

  while (currentLevel.length > 0) {
    const nextLevel = await getDirectReplyIds(connection, currentLevel);
    const fresh = nextLevel.filter((id) => !all.has(id));
    if (!fresh.length) {
      break;
    }

    fresh.forEach((id) => all.add(id));
    currentLevel = fresh;
  }

  return [...all];
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

/**
 * 批量更新评论状态（含全部后代）。
 *
 * 对象语义与单条删除 / 恢复一致：传入顶层评论即连带其后代，避免出现「父已移入回收站、
 * 子还在前台露着」。
 *
 * ⚠️ **必须先读旧状态再改**：回复通知延后到「审核通过」才发，只发一条 UPDATE 就判不出
 * 「哪些回复是本次才变成 approved 的」，会静默漏掉全部回复邮件。
 *
 * @returns {{ affected, requested, newlyApprovedReplyIds } | { blocked: object }}
 *   affected = 实际纳入范围的行数（含后代）；requested = 传入的根 id 数；
 *   newlyApprovedReplyIds = 由「非 approved」变为 approved 的回复（待发通知）；
 *   blocked = 命中审核守卫时直接返回，不做任何写入
 */
const batchUpdateCommentsStatus = async (rootIds, status) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { targets, blocker } = await planStatusChange(
      connection,
      rootIds,
      status,
      { cascadeApproved: true },
    );
    if (blocker) {
      await connection.rollback();
      return { blocked: blocker };
    }

    const rows = await selectStatusRows(connection, targets);
    if (rows.length) {
      await updateCommentsStatusByIds(connection, targets, status);
    }
    await connection.commit();

    const newlyApprovedReplyIds =
      status === "approved"
        ? rows
            .filter((row) => row.status !== "approved" && row.parent_id != null)
            .map((row) => row.id)
        : [];

    return {
      affected: rows.length,
      requested: new Set(rootIds).size,
      newlyApprovedReplyIds,
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
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

/** 评论状态的中文名（与后台筛选下拉一致，用于审核守卫的提示文案） */
const STATUS_LABELS = Object.freeze({
  pending: "待审核",
  approved: "已审核",
  deleted: "已删除",
});

const statusLabel = (status) => STATUS_LABELS[status] || String(status);

/** 取若干行当前状态（`ORDER BY id` 保证遍历顺序稳定，提示文案才可预期） */
const selectStatusRows = async (connection, ids) => {
  if (!ids.length) return [];

  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await connection.query(
    `SELECT id, parent_id, status FROM comment WHERE id IN (${placeholders}) ORDER BY id`,
    ids,
  );

  return rows;
};

/**
 * 审核守卫：不允许出现「子回复已审核、父评论未通过」。
 *
 * ⚠️ 判定依据是**改完之后**的状态：同一批里如果父评论也会变成 approved，
 * 子回复就不算违规（否则批量勾选「父 + 子」会被自己拦下）。
 *
 * @returns {null | { childId, parentId, parentStatus?, parentMissing? }} 违规时返回被拦下的那一条
 */
const findApproveBlocker = async (connection, affectedIds) => {
  const rows = await selectStatusRows(connection, affectedIds);
  const affected = new Set(affectedIds);

  const outsideParentIds = [
    ...new Set(
      rows
        .map((row) => row.parent_id)
        .filter((parentId) => parentId != null && !affected.has(parentId)),
    ),
  ];
  if (!outsideParentIds.length) {
    return null;
  }

  const parents = await selectStatusRows(connection, outsideParentIds);
  const statusById = new Map(
    parents.map((parent) => [parent.id, parent.status]),
  );

  for (const row of rows) {
    const parentId = row.parent_id;
    if (parentId == null || affected.has(parentId)) {
      continue;
    }

    const parentStatus = statusById.get(parentId);
    if (parentStatus === undefined) {
      return { childId: row.id, parentId, parentMissing: true };
    }
    if (parentStatus !== "approved") {
      return { childId: row.id, parentId, parentStatus };
    }
  }

  return null;
};

/** 审核守卫的提示文案（与 Spring 的 CommentService.approveBlockerMessage 逐字一致） */
const approveBlockerMessage = (blocker) =>
  blocker.parentMissing
    ? `父评论 #${blocker.parentId} 不存在，无法审核本条评论`
    : `父评论 #${blocker.parentId} 未通过审核（当前：${statusLabel(blocker.parentStatus)}），请先处理父评论后再审核本条`;

/**
 * 计算「把 rootIds 设为 status」实际要影响哪些行。
 *
 * 级联规则按目标状态区分 —— 三者都服务同一条不变式
 * 「已审核的子回复，其父评论必须存在且已审核」：
 *   - approved：连带后代中**非回收站**的行（不静默把回收站里的评论放出来）；
 *     单条端点不连带（cascadeApproved = false），避免顺手通过没审过的回复
 *   - pending ：连带后代中**已审核**的行（否则会出现「父待审核、子已审核」）
 *   - deleted ：连带**全部**后代（与单条删除同语义）
 */
const planStatusChange = async (
  connection,
  rootIds,
  status,
  { cascadeApproved },
) => {
  const all = await getDescendantCommentIds(connection, rootIds);
  const rows = await selectStatusRows(connection, all);
  const roots = new Set(rootIds);

  if (status === "approved") {
    const targets = cascadeApproved
      ? rows
          .filter((row) => row.status !== "deleted" || roots.has(row.id))
          .map((row) => row.id)
      : [...roots];

    return { targets, blocker: await findApproveBlocker(connection, targets) };
  }

  if (status === "deleted") {
    return { targets: rows.map((row) => row.id), blocker: null };
  }

  return {
    targets: rows
      .filter((row) => row.status === "approved" || roots.has(row.id))
      .map((row) => row.id),
    blocker: null,
  };
};

/**
 * 单条状态变更（审核 / 打回待审核 / 移入回收站）：先做审核守卫，再按目标状态级联。
 *
 * @returns {{ found: boolean, blocker?: object, previous?: object, targets?: number }}
 */
const applyCommentStatus = async (id, status) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const previous = (await selectStatusRows(connection, [id]))[0];
    if (!previous) {
      await connection.rollback();
      return { found: false };
    }

    const { targets, blocker } = await planStatusChange(
      connection,
      [id],
      status,
      {
        cascadeApproved: false,
      },
    );
    if (blocker) {
      await connection.rollback();
      return { found: true, blocker };
    }

    await updateCommentsStatusByIds(connection, targets, status);
    await connection.commit();

    return { found: true, previous, targets: targets.length };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
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
           author_url AS authorUrl, author_ip AS authorIp,
           content, like_count AS likeCount,
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

  // 批量加载回复 — 消除 N+1 查询（两级结构）
  const parentIds = topLevelComments.map((c) => c.id);
  if (parentIds.length > 0) {
    const repliesMap = await getRepliesBatch(parentIds);
    for (const comment of topLevelComments) {
      comment.replies = repliesMap[comment.id] || [];
    }
  }

  return topLevelComments;
};

module.exports = {
  getOrderClause,
  getComments,
  getCommentsCount,
  getCommentById,
  getReplies,
  getRepliesBatch,
  createComment,
  softDeleteComment,
  restoreComment,
  deleteComment,
  applyCommentStatus,
  approveBlockerMessage,
  batchUpdateCommentsStatus,
  incrementCommentLikes,
  getCommentsWithReplies,
};
