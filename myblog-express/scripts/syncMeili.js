/**
 * Meilisearch 索引回填脚本
 *
 * 背景：`syncArticle()` 只在文章**创建 / 更新 / 发布**时被调用，历史文章不会自动进入索引。
 * 另外 `services/meilisearch.js` 的 `getIndex()` 曾有一个缺陷（索引不存在时对 null 解构抛错，
 * 被外层 try 吞掉后恒返回 null），导致「索引不存在就创建」的分支永远执行不到 ——
 * 表现为 `/health` 显示 meilisearch: ok（它只探测 client.health()，不经过 getIndex），
 * 但文章从未入索引、搜索永远降级为 MySQL LIKE。
 *
 * 用法（在 myblog-express 目录执行）：
 *   node scripts/syncMeili.js            # 增量回填（只提交，不重建索引）
 *   REBUILD=1 node scripts/syncMeili.js  # 先删除索引再重建（结构变更时使用）
 *
 * 幂等：重复执行安全（同一 id 覆盖写入）。
 */

require("dotenv").config();

const pool = require("../config/database");
const meili = require("../services/meilisearch");

const INDEX_NAME = "articles";
const BATCH_SIZE = 50;

const rebuild = process.env.REBUILD === "1";

const fetchPublishedArticles = async () => {
  const [rows] = await pool.query(
    `SELECT a.id, a.title, a.summary, a.content, a.status,
            a.type_id     AS typeId,
            a.cover_image AS coverImage,
            a.view_count  AS viewCount,
            a.created_at  AS createdAt,
            a.deleted_at  AS deletedAt
       FROM article a
      WHERE a.status = 'published' AND a.deleted_at IS NULL
      ORDER BY a.id ASC`,
  );
  return rows;
};

(async () => {
  const client = meili.getClient();
  if (!client) {
    console.error("✗ Meilisearch 客户端创建失败，请检查 .env 的 MEILI_* 配置");
    process.exit(1);
  }

  // 连不上 / 主密钥不被接受都在这里暴露出来。
  // ⚠️ 不要改用 client.health()：Meili 的 /health 是公开端点，密钥错也返回 200，
  //    脚本会一路跑到“索引初始化失败”才报错，看不出真正原因。
  const status = await meili.getStatus();
  if (status.status !== "ok") {
    console.error(`✗ Meilisearch 不可用（${status.status}）：${status.reason}`);
    process.exit(1);
  }

  if (rebuild) {
    console.log(`重新构建：删除索引 ${INDEX_NAME}`);
    const task = await client.deleteIndex(INDEX_NAME).catch(() => null);
    if (task) await client.waitForTask(task.taskUid);
  }

  // 用服务里的 getIndex()：它会创建索引并补齐 filterable / searchable / sortable 设置
  const index = await meili.getIndex();
  if (!index) {
    console.error("✗ 索引初始化失败（getIndex 返回 null），请检查容器日志");
    process.exit(1);
  }

  const rows = await fetchPublishedArticles();
  console.log(`查询到 ${rows.length} 篇已发布文章`);

  if (rows.length === 0) {
    console.log("没有需要同步的文章");
    process.exit(0);
  }

  const docs = rows.map((r) => ({
    id: r.id,
    title: r.title,
    summary: r.summary || "",
    content: r.content || "",
    status: r.status,
    typeId: r.typeId,
    coverImage: r.coverImage || "",
    viewCount: r.viewCount || 0,
    createdAt: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
    deletedAt: r.deletedAt || null,
  }));

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);
    const task = await index.addDocuments(batch);
    const result = await client.waitForTask(task.taskUid);
    if (result.status !== "succeeded") {
      console.error(`✗ 第 ${i / BATCH_SIZE + 1} 批同步失败：`, result.error);
      process.exit(1);
    }
    console.log(
      `✓ 已同步 ${Math.min(i + BATCH_SIZE, docs.length)}/${docs.length}`,
    );
  }

  const stats = await index.getStats();
  console.log(`完成：索引 ${INDEX_NAME} 文档数 = ${stats.numberOfDocuments}`);
  process.exit(0);
})().catch((err) => {
  console.error("✗ 回填失败：", err.message);
  process.exit(1);
});
