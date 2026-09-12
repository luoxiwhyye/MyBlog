/**
 * Meilisearch 全文搜索服务
 *
 * 对标 F-01：替代 MySQL LIKE 模糊查询，提供高性能全文检索。
 * Meilisearch 不可用时自动降级为 MySQL LIKE 搜索（在 Article 模型中处理）。
 *
 * 环境变量：
 *   MEILI_HOST  — Meilisearch 服务器地址（默认 127.0.0.1）
 *   MEILI_PORT  — Meilisearch API 端口（默认 7700）
 *   MEILI_MASTER_KEY — Meilisearch 主密钥
 */

const MeiliSearch = (() => {
  try {
    return require("meilisearch").MeiliSearch;
  } catch {
    return null;
  }
})();

const INDEX_NAME = "articles";

let client = null;

const getClient = () => {
  if (client) return client;
  if (!MeiliSearch) return null;

  const host = process.env.MEILI_HOST || "127.0.0.1";
  const port = process.env.MEILI_PORT || "7700";
  const apiKey = process.env.MEILI_MASTER_KEY || "";

  try {
    client = new MeiliSearch({
      host: `http://${host}:${port}`,
      apiKey,
    });
  } catch {
    return null;
  }

  return client;
};

/**
 * 检查 Meilisearch 是否可用
 */
const isAvailable = async () => {
  const c = getClient();
  if (!c) return false;

  try {
    const health = await c.health();
    return health.status === "available";
  } catch {
    return false;
  }
};

/** 索引设置是否已在本进程内补齐（避免每次查询都重复提交设置任务） */
let indexEnsured = false;

/**
 * 获取索引（首次调用时创建并补齐索引设置）
 *
 * ⚠️ 不能用 `c.getIndex(NAME).catch(() => null)` 判断索引是否存在：
 * 索引不存在时 `client.getIndex()` 内部请求 `GET /indexes/articles` 得到 404 并抛错，
 * `.catch` 返回 null 后再对 null 解构会抛 `TypeError`，被外层 try 吞掉后本函数恒返回 null
 * —— 结果是「索引不存在就创建」的分支永远执行不到，syncArticle 永不写入、search 永远降级 LIKE。
 * 正确做法是 try/catch 包住 getIndex，失败即视为不存在再创建。
 */
const getIndex = async () => {
  const c = getClient();
  if (!c) return null;

  try {
    if (!indexEnsured) {
      try {
        await c.getIndex(INDEX_NAME);
      } catch {
        await c.createIndex(INDEX_NAME, { primaryKey: "id" });
      }

      // 幂等补齐索引设置（重复提交安全，Meilisearch 按任务顺序处理）
      const index = c.index(INDEX_NAME);
      const tasks = await Promise.all([
        index.updateFilterableAttributes(["status", "typeId", "deletedAt"]),
        index.updateSearchableAttributes(["title", "summary", "content"]),
        index.updateSortableAttributes(["createdAt", "viewCount"]),
      ]);
      // 等任务落地，否则紧接着的 search 可能因属性尚未生效而报错
      const results = await c.waitForTasks(tasks.map((t) => t.taskUid));
      if (results.some((task) => task.status !== "succeeded")) {
        throw new Error("索引设置未生效");
      }

      indexEnsured = true;
    }

    return c.index(INDEX_NAME);
  } catch {
    return null;
  }
};

/**
 * 同步文章到 Meilisearch（创建或更新后调用）
 */
const syncArticle = async (article) => {
  try {
    const index = await getIndex();
    if (!index) return;

    // 仅同步已发布的文章；草稿不索引
    const docs = [
      {
        id: article.id,
        title: article.title,
        summary: article.summary || "",
        content: article.content || "",
        status: article.status,
        typeId: article.typeId,
        coverImage: article.coverImage || "",
        viewCount: article.viewCount || 0,
        createdAt: article.createdAt
          ? new Date(article.createdAt).getTime()
          : Date.now(),
        deletedAt: article.deletedAt || null,
      },
    ];

    await index.addDocuments(docs);
  } catch {
    // Meilisearch 同步失败静默处理
  }
};

/**
 * 从 Meilisearch 删除文章
 */
const deleteArticle = async (id) => {
  try {
    const index = await getIndex();
    if (!index) return;
    await index.deleteDocument(String(id));
  } catch {
    // 静默处理
  }
};

/**
 * 在 Meilisearch 中搜索文章
 * @returns {{ ids: number[], total: number } | null} — null 表示不可用，需降级
 */
const search = async (
  keyword,
  { page = 1, pageSize = 10, typeId, sortBy } = {},
) => {
  try {
    const index = await getIndex();
    if (!index) return null;

    const filter = ["status = published"];

    if (typeId) {
      filter.push(`typeId = ${typeId}`);
    }

    const sort = [];
    if (sortBy === "view_count") {
      sort.push("viewCount:desc");
    }
    // 默认按 Meilisearch 相关度排序

    // 用 limit/offset 而非已废弃的 page/hitsPerPage：
    // 后者返回 totalHits（无 estimatedTotalHits），会让 total 恒为 0、分页错乱
    const result = await index.search(keyword, {
      filter,
      sort: sort.length ? sort : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      attributesToRetrieve: ["id"],
      attributesToHighlight: [],
    });

    return {
      ids: result.hits.map((h) => Number(h.id)),
      total: result.estimatedTotalHits ?? result.totalHits ?? 0,
    };
  } catch {
    return null;
  }
};

module.exports = {
  isAvailable,
  getIndex,
  syncArticle,
  deleteArticle,
  search,
  getClient,
};
