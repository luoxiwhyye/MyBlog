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

  const labelIds = labels.map((label) => label.id);

  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    contentFormat: row.content_format || "html",
    coverImage: row.cover_image,
    viewCount: row.view_count,
    status: row.status,
    isPinned: Boolean(row.is_pinned),
    isFeatured: Boolean(row.is_featured),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    typeId: row.type_id,
    type: row.type_name ? { id: row.type_id, typeName: row.type_name } : null,
    labelIds,
    labels,
  };
};

const getArticles = async (offset, limit, filters = {}) => {
  let query = `
    SELECT a.id, a.title, a.summary, a.content, a.content_format, a.cover_image, a.view_count, a.status,
           a.is_pinned, a.is_featured,
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

  // 排序白名单 — 避免 SQL 插值注入
  const SORT_MAP = {
    created_at: { column: "a.created_at", defaultOrder: "DESC" },
    updated_at: { column: "a.updated_at", defaultOrder: "DESC" },
    view_count: { column: "a.view_count", defaultOrder: "DESC" },
    title: { column: "a.title", defaultOrder: "ASC" },
  };

  const validSort = SORT_MAP[filters.sortBy] || SORT_MAP["created_at"];
  const sortOrder =
    filters.sortOrder === "ASC" || filters.sortOrder === "DESC"
      ? filters.sortOrder
      : validSort.defaultOrder;

  query += ` ORDER BY ${validSort.column} ${sortOrder}`;

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

const getTotalViewCount = async () => {
  const [rows] = await pool.query(
    "SELECT COALESCE(SUM(view_count),0) as totalViews FROM article WHERE deleted_at IS NULL",
  );
  // ⚠️ SQL 的 SUM() 返回 DECIMAL，mysql2 会转成**字符串**（"120"）：
  // admin 的 DashboardStats.totalViews 声明为 number，Spring 侧也是数字
  // → 这里显式转数字，避免双端/双端与服务端契约类型不一致。
  return Number(rows[0].totalViews) || 0;
};

const getArticlePublishTrend = async (days = 30, scope = "published") => {
  let query = `SELECT DATE(created_at) AS publishDate, COUNT(*) AS articleCount
     FROM article
     WHERE deleted_at IS NULL
       AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`;
  const params = [days];

  if (scope !== "all") {
    query += " AND status = 'published'";
  }

  query += " GROUP BY DATE(created_at) ORDER BY publishDate ASC";

  const [rows] = await pool.query(query, params);
  return rows;
};

const getTypeArticleDistribution = async (scope = "published") => {
  let query = `SELECT t.id,
            t.type_name AS typeName,
            COUNT(a.id) AS articleCount
     FROM \`type\` t
     LEFT JOIN article a
       ON a.type_id = t.id
      AND a.deleted_at IS NULL`;

  if (scope !== "all") {
    query += " AND a.status = 'published'";
  }

  query += `
     GROUP BY t.id, t.type_name
     ORDER BY articleCount DESC, t.id ASC`;

  const [rows] = await pool.query(query);
  return rows;
};

const getArticleById = async (id) => {
  const [rows] = await pool.query(
    `SELECT a.id, a.title, a.summary, a.content, a.content_format, a.cover_image, a.view_count, a.status,
            a.is_pinned, a.is_featured,
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
      (type_id, title, summary, content, content_format, cover_image, view_count, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      articleData.typeId,
      articleData.title,
      articleData.summary || null,
      articleData.content,
      articleData.contentFormat || "html",
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
  if (articleData.contentFormat !== undefined) {
    updates.push("content_format = ?");
    params.push(articleData.contentFormat);
  }
  if (articleData.coverImage !== undefined) {
    updates.push("cover_image = ?");
    params.push(articleData.coverImage);
  }
  if (articleData.status !== undefined) {
    updates.push("status = ?");
    params.push(articleData.status);
  }
  if (articleData.isPinned !== undefined) {
    updates.push("is_pinned = ?");
    params.push(articleData.isPinned);
  }
  if (articleData.isFeatured !== undefined) {
    updates.push("is_featured = ?");
    params.push(articleData.isFeatured);
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

const updateArticlesStatus = async (ids, status) => {
  if (!Array.isArray(ids) || ids.length === 0) return 0;
  const placeholders = ids.map(() => "?").join(", ");
  const [result] = await pool.query(
    `UPDATE article SET status = ?, updated_at = NOW() WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
    [status, ...ids],
  );
  return result.affectedRows;
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

const hardDeleteArticle = async (id) => {
  const [result] = await pool.query(
    "DELETE FROM article WHERE id = ? AND deleted_at IS NOT NULL",
    [id],
  );
  return result.affectedRows > 0;
};

const getTrashArticles = async (offset, limit) => {
  // ⚠️ 必须走 formatArticle 输出 camelCase：这里原先直接返回**原始 snake_case 行集**
  //    （cover_image / created_at / deleted_at / view_count …），与其余所有文章接口
  //    以及 Spring 端的 ArticleDTO 都不一致 → 后台回收站读 scope.row.deletedAt /
  //    coverImage / labels / viewCount 全部 undefined（「删除时间」显示 --、封面走占位图）。
  //    （2026-09-14 双端实测发现。）
  const [rows] = await pool.query(
    `SELECT a.id, a.title, a.summary, a.content, a.content_format, a.cover_image, a.view_count, a.status,
            a.is_pinned, a.is_featured,
            a.type_id, a.created_at, a.updated_at, a.deleted_at,
            t.type_name,
            GROUP_CONCAT(l.id ORDER BY l.id) AS label_ids,
            GROUP_CONCAT(l.label_name ORDER BY l.id) AS label_names
     FROM article a
     LEFT JOIN \`type\` t ON a.type_id = t.id
     LEFT JOIN article_label al ON a.id = al.article_id
     LEFT JOIN \`label\` l ON al.label_id = l.id
     WHERE a.deleted_at IS NOT NULL
     GROUP BY a.id
     ORDER BY a.deleted_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows.map(formatArticle);
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

/**
 * 按 ID 列表查询文章（供 Meilisearch 搜索结果使用）
 */
const getArticlesByIds = async (ids) => {
  if (!ids || ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT a.id, a.title, a.summary, a.content, a.cover_image, a.view_count, a.status,
            a.is_pinned, a.is_featured,
            a.type_id, a.created_at, a.updated_at, a.deleted_at,
            t.type_name,
            GROUP_CONCAT(l.id ORDER BY l.id) AS label_ids,
            GROUP_CONCAT(l.label_name ORDER BY l.id) AS label_names
     FROM article a
     LEFT JOIN \`type\` t ON a.type_id = t.id
     LEFT JOIN article_label al ON a.id = al.article_id
     LEFT JOIN \`label\` l ON al.label_id = l.id
     WHERE a.id IN (${placeholders}) AND a.deleted_at IS NULL
     GROUP BY a.id`,
    ids,
  );

  // 保持原输入 ID 的顺序
  const rowMap = new Map(rows.map((r) => [r.id, formatArticle(r)]));
  return ids.map((id) => rowMap.get(id)).filter(Boolean);
};

/**
 * 轻量文章结构（命令面板搜索用，不含 content / labels 等重字段）
 */
const formatBriefArticle = (row) => ({
  id: row.id,
  title: row.title,
  summary: row.summary || "",
  coverImage: row.cover_image || "",
  createdAt: row.created_at,
  typeName: row.type_name || "",
});

const BRIEF_COLUMNS = `a.id, a.title, a.summary, a.cover_image, a.created_at, t.type_name`;

/**
 * 按 ID 列表查询文章简要信息（供 Meilisearch 命中后回表取展示字段）
 * 保持入参 id 的顺序（Meilisearch 已按相关度排好序）
 */
const getArticleBriefByIds = async (ids) => {
  if (!ids || ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT ${BRIEF_COLUMNS}
     FROM article a
     LEFT JOIN \`type\` t ON a.type_id = t.id
     WHERE a.id IN (${placeholders})
       AND a.deleted_at IS NULL
       AND a.status = 'published'`,
    ids,
  );

  const rowMap = new Map(rows.map((r) => [r.id, formatBriefArticle(r)]));
  return ids.map((id) => rowMap.get(id)).filter(Boolean);
};

/**
 * 关键词模糊匹配简要信息（Meilisearch 不可用时的降级路径）
 *
 * ⚠️ limit 用「已夹紧的整数字面量」插值而非 `LIMIT ?`：
 * 本环境 mysql2 预处理对 LIMIT 占位符会报 Incorrect arguments to mysqld_stmt_execute。
 * limit 已被夹紧为 1~20 的整数，无注入风险。
 */
const searchArticleBriefs = async (keyword, limit) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 20);
  const like = `%${keyword}%`;

  const [rows] = await pool.query(
    `SELECT ${BRIEF_COLUMNS}
     FROM article a
     LEFT JOIN \`type\` t ON a.type_id = t.id
     WHERE a.deleted_at IS NULL
       AND a.status = 'published'
       AND (a.title LIKE ? OR a.summary LIKE ? OR a.content LIKE ?)
     ORDER BY a.created_at DESC
     LIMIT ${safeLimit}`,
    [like, like, like],
  );

  return rows.map(formatBriefArticle);
};

/**
 * 上一篇 / 下一篇（按 id 排序取相邻已发布文章）
 * prev：小于当前 id 的最近一篇；next：大于当前 id 的最近一篇
 */
const getAdjacentArticles = async (id) => {
  const selectBase = `
    SELECT a.id, a.title, a.summary, a.cover_image, a.created_at,
           t.id AS type_id, t.type_name
    FROM article a
    LEFT JOIN \`type\` t ON a.type_id = t.id
    WHERE a.deleted_at IS NULL AND a.status = 'published'
  `;
  const [prevRows] = await pool.query(
    `${selectBase} AND a.id < ? ORDER BY a.id DESC LIMIT 1`,
    [id],
  );
  const [nextRows] = await pool.query(
    `${selectBase} AND a.id > ? ORDER BY a.id ASC LIMIT 1`,
    [id],
  );

  const formatNav = (row) =>
    row
      ? {
          id: row.id,
          title: row.title,
          summary: row.summary,
          coverImage: row.cover_image,
          createdAt: row.created_at,
          type: row.type_id
            ? { id: row.type_id, typeName: row.type_name }
            : null,
        }
      : null;

  return {
    prev: formatNav(prevRows[0]),
    next: formatNav(nextRows[0]),
  };
};

/**
 * 相关推荐：按 共享标签 + 同分类 聚合评分（标签权重 2、分类权重 1）取前 limit 篇
 *
 * 只返回 relevance_score > 0 的候选：0 分项（既无共享标签也不同分类）靠排序兜底
 * 混进列表，会让「相关文章」名不副实。
 * 同时回传 relevanceScore 与命中的共享标签名，让「为什么相关」在前台可见。
 * LIMIT 使用已裁剪的整数字面量插值，避免 mysql2 对 LIMIT ? 预编译报错
 */
const getRelatedArticles = async (id, limit = 4) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 4, 1), 12);

  const [currentRows] = await pool.query(
    `SELECT a.type_id, GROUP_CONCAT(al.label_id) AS label_ids
     FROM article a
     LEFT JOIN article_label al ON a.id = al.article_id
     WHERE a.id = ? AND a.deleted_at IS NULL
     GROUP BY a.id`,
    [id],
  );
  if (!currentRows.length) return [];

  const current = currentRows[0];
  const currentLabelIds = (current.label_ids || "")
    .split(",")
    .map((v) => parseInt(v, 10))
    .filter((v) => Number.isInteger(v) && v > 0);
  const hasLabels = currentLabelIds.length > 0;

  const labelPlaceholders = currentLabelIds.map(() => "?").join(",");
  // 共享标签名：label_name 有唯一约束，同一文章不会重复命中同一标签，无需 DISTINCT
  const sharedLabelsExpr = hasLabels
    ? `GROUP_CONCAT(CASE WHEN al.label_id IN (${labelPlaceholders}) THEN l.label_name END ORDER BY l.id)`
    : "NULL";
  const labelScore = hasLabels
    ? `SUM(CASE WHEN al.label_id IN (${labelPlaceholders}) THEN 1 ELSE 0 END)`
    : "0";
  const typeScore = current.type_id
    ? "+ (CASE WHEN a.type_id = ? THEN 1 ELSE 0 END)"
    : "";

  // 占位符顺序：评分用标签列表 → 分类 → 共享标签名用标签列表 → 当前文章 id
  // （必须与 SELECT 中出现占位符的先后完全一致）
  const params = [];
  if (hasLabels) params.push(...currentLabelIds);
  if (current.type_id) params.push(current.type_id);
  if (hasLabels) params.push(...currentLabelIds);
  params.push(id);

  const [rows] = await pool.query(
    `SELECT a.id, a.title, a.summary, a.cover_image, a.view_count, a.created_at,
            t.id AS type_id, t.type_name,
            (${labelScore} * 2 ${typeScore}) AS relevance_score,
            ${sharedLabelsExpr} AS shared_labels
     FROM article a
     LEFT JOIN \`type\` t ON a.type_id = t.id
     LEFT JOIN article_label al ON a.id = al.article_id
     LEFT JOIN \`label\` l ON al.label_id = l.id
     WHERE a.deleted_at IS NULL
       AND a.status = 'published'
       AND a.id != ?
     GROUP BY a.id
     HAVING relevance_score > 0
     ORDER BY relevance_score DESC, a.view_count DESC, a.created_at DESC, a.id DESC
     LIMIT ${safeLimit}`,
    params,
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    coverImage: row.cover_image,
    viewCount: row.view_count,
    createdAt: row.created_at,
    type: row.type_id ? { id: row.type_id, typeName: row.type_name } : null,
    relevanceScore: Number(row.relevance_score) || 0,
    sharedLabels: (row.shared_labels || "").split(",").filter(Boolean),
  }));
};

module.exports = {
  getArticles,
  getArticlesCount,
  getArticleById,
  getAdjacentArticles,
  getRelatedArticles,
  getArticlesByIds,
  getArticleBriefByIds,
  searchArticleBriefs,
  createArticle,
  updateArticle,
  updateArticlesStatus,
  softDeleteArticle,
  restoreArticle,
  hardDeleteArticle,
  getTrashArticles,
  getTrashArticlesCount,
  incrementViewCount,
  getTotalViewCount,
  getArticlePublishTrend,
  getTypeArticleDistribution,
  addArticleLabels,
  clearArticleLabels,
};
