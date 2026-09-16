/**
 * 数据层体检脚本（只读）
 *
 * 与 `verifyUploads.js`（文件层：DB 引用 vs 磁盘文件）互补 —— 本脚本只看数据库内部
 * 的一致性与完整性，不碰任何文件。
 *
 * 为什么需要它：项目里已有 `verifyUploads.js` 与一批迁移脚本，但**没有**一个「随时
 * 可跑、只读、能自查数据是否仍然自洽」的入口。改过口径（如第七轮统一 articleCount
 * 的统计口径）、手工改过库、或导入过旧数据之后，都需要一条标准路径来确认。
 *
 * 检查项的取舍原则：**只查 DB 约束管不到的东西**。
 *   - 引用存在性（article_label→label、comment.parent_id→comment、emoji.group_id→
 *     emoji_group、article.type_id→type）**已由外键保证**，单独再查一遍只会永远输出
 *     「正常」；本脚本改为**校验这些约束本身是否还在**（结构漂移才是真风险，
 *     例如库是旧版 schema、外键曾被人手工删掉）。
 *   - 真正查的是：FK 不覆盖的**语义**约束（跨文章父评论、三级嵌套）、**取值**越界
 *     （varchar 列不受枚举保护）、**计数漂移**、以及会静默影响前台展示的**异常值**。
 *
 * 运行方式（在 myblog-express 目录执行）：
 *   node scripts/auditData.js             只读体检，始终退出码 0
 *   STRICT=1 node scripts/auditData.js    存在 error 级问题时退出码 1（可用于 CI）
 *
 * 级别约定：
 *   [error] 数据已不自洽，需要处理（前台可能已经表现异常）
 *   [warn ] 可疑或残缺，建议确认
 *   [info ] 提示性信息，不一定是问题
 *
 * 本脚本**只读**：只有 SELECT 与 information_schema 查询，不写库、不删文件。
 */

require("dotenv").config();

const pool = require("../config/database");

const STRICT = process.env.STRICT === "1";

const line = (char = "─", length = 64) => char.repeat(length);

/** 收集到的发现，按级别分组 */
const findings = { error: [], warn: [], info: [] };

const report = (level, title, detailLines = []) => {
  findings[level].push({ title, detailLines });
};

/** 打印一次检查的分节标题 */
const section = (index, title) => {
  console.log("");
  console.log(line());
  console.log(`${index}、${title}`);
  console.log(line());
};

const MAX_DETAIL_LINES = 15;

/** 记录当前各级别的发现数量，用于「只打印本节新增」 */
const snapshot = () => ({
  error: findings.error.length,
  warn: findings.warn.length,
  info: findings.info.length,
});

/**
 * 打印自 snapshot 之后新增的发现。
 * 用快照增量而不用「清空数组」：汇总区仍需要全量计数，且各节之间不能互相污染。
 */
const printSince = (snap) => {
  const marks = { error: "✗", warn: "⚠", info: "·" };
  let printed = 0;

  for (const level of ["error", "warn", "info"]) {
    for (const item of findings[level].slice(snap[level])) {
      printed += 1;
      console.log(`  ${marks[level]} ${item.title}`);
      const shown = item.detailLines.slice(0, MAX_DETAIL_LINES);
      for (const detail of shown) console.log(`      ${detail}`);
      if (item.detailLines.length > shown.length) {
        console.log(
          `      …（另有 ${item.detailLines.length - shown.length} 条，已省略）`,
        );
      }
    }
  }

  if (printed === 0) console.log("  ✓ 未发现问题");
};

/** 跑一节检查并只打印该节的发现 */
const runSection = async (index, title, fn) => {
  section(index, title);
  const snap = snapshot();
  await fn();
  printSince(snap);
};

/* ------------------------------------------------------------------ */
/* 一、结构安全网（schema drift）                                      */
/* ------------------------------------------------------------------ */

/** 预期存在的表（与 myblog-1.1.sql 一致） */
const EXPECTED_TABLES = [
  "article",
  "article_label",
  "blogger",
  "client_error_log",
  "comment",
  "emoji",
  "emoji_group",
  "friend_link",
  "label",
  "message_board",
  "setting",
  "type",
];

/** 预期存在的列（重点是迁移脚本加的那些，最易漂移） */
const EXPECTED_COLUMNS = [
  ["article", "content_format"],
  ["article", "deleted_at"],
  ["article", "is_pinned"],
  ["article", "is_featured"],
  ["article", "cover_image"],
  ["emoji", "group_id"],
  ["emoji", "type"],
  ["comment", "parent_id"],
  // 2026-09-16 批 4：订阅开关 + 「回复谁」（迁移脚本加的列，同样要进安全网）
  ["comment", "reply_to_id"],
  ["comment", "notify_email"],
  ["message_board", "notify_email"],
  ["friend_link", "is_sticky"],
];

/** 预期存在的外键（引用存在性靠它们兜底，缺了就意味着孤儿数据可能出现） */
const EXPECTED_FOREIGN_KEYS = [
  ["article", "fk_article_type"],
  ["article_label", "fk_article_label_article"],
  ["article_label", "fk_article_label_label"],
  ["comment", "fk_comment_article"],
  ["comment", "fk_comment_parent"],
  ["comment", "fk_comment_reply_to"],
  ["emoji", "fk_emoji_group"],
];

/** 预期存在的唯一索引（重名 / 重复关联靠它们兜底） */
const EXPECTED_UNIQUE_INDEXES = [
  ["article_label", "uk_article_label"],
  ["blogger", "uk_email"],
  ["blogger", "uk_username"],
  ["friend_link", "uk_url"],
  ["label", "uk_label_name"],
  ["type", "uk_type_name"],
];

const checkSchema = async () => {
  const [tableRows] = await pool.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`,
  );
  const tables = new Set(tableRows.map((r) => r.name));
  const missingTables = EXPECTED_TABLES.filter((t) => !tables.has(t));
  if (missingTables.length) {
    report(
      "error",
      `缺少 ${missingTables.length} 张预期表`,
      missingTables.map((t) => `表 ${t}`),
    );
  }

  const [columnRows] = await pool.query(
    `SELECT TABLE_NAME AS tbl, COLUMN_NAME AS col FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE()`,
  );
  const columns = new Set(columnRows.map((r) => `${r.tbl}.${r.col}`));
  const missingColumns = EXPECTED_COLUMNS.filter(
    ([t, c]) => !columns.has(`${t}.${c}`),
  );
  if (missingColumns.length) {
    report(
      "error",
      `缺少 ${missingColumns.length} 个预期列`,
      missingColumns.map(([t, c]) => `${t}.${c}`),
    );
  }

  const [fkRows] = await pool.query(
    `SELECT TABLE_NAME AS tbl, CONSTRAINT_NAME AS name FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
  );
  const fks = new Set(fkRows.map((r) => `${r.tbl}.${r.name}`));
  const missingFks = EXPECTED_FOREIGN_KEYS.filter(
    ([t, n]) => !fks.has(`${t}.${n}`),
  );
  if (missingFks.length) {
    report(
      "error",
      `缺少 ${missingFks.length} 个预期外键（引用完整性失去兜底）`,
      missingFks.map(([t, n]) => `${t}.${n}`),
    );
  }

  const [indexRows] = await pool.query(
    `SELECT TABLE_NAME AS tbl, INDEX_NAME AS name, NON_UNIQUE AS nonUnique
     FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE()`,
  );
  const uniqueIndexes = new Set(
    indexRows
      .filter((r) => Number(r.nonUnique) === 0)
      .map((r) => `${r.tbl}.${r.name}`),
  );
  const missingIndexes = EXPECTED_UNIQUE_INDEXES.filter(
    ([t, n]) => !uniqueIndexes.has(`${t}.${n}`),
  );
  if (missingIndexes.length) {
    report(
      "warn",
      `缺少 ${missingIndexes.length} 个预期唯一索引（重名/重复关联失去兜底）`,
      missingIndexes.map(([t, n]) => `${t}.${n}`),
    );
  }
};

/* ------------------------------------------------------------------ */
/* 二、取值越界（varchar 列不受枚举保护）                              */
/* ------------------------------------------------------------------ */

const VALID_CONTENT_FORMATS = ["html", "markdown"];
/** 布尔型设置项：前台按 `=== "true"` / `!== "false"` 判断，故只认这三种取值 */
const VALID_BOOLEAN_SETTINGS = ["", "true", "false"];
const BOOLEAN_SETTING_KEYS = [
  "enable_tools",
  "enable_message_board",
  "site_maintenance",
];

const checkValueRanges = async () => {
  const [formatRows] = await pool.query(
    `SELECT id, title, content_format AS contentFormat FROM article
     WHERE content_format IS NOT NULL AND content_format NOT IN (?)`,
    [VALID_CONTENT_FORMATS],
  );
  if (formatRows.length) {
    report(
      "error",
      `${formatRows.length} 篇文章的 content_format 非 html/markdown（前台会按 html 分支渲染）`,
      formatRows.map(
        (r) => `#${r.id} ${r.title} → ${JSON.stringify(r.contentFormat)}`,
      ),
    );
  }

  const [[{ negativeViews }]] = await pool.query(
    `SELECT COUNT(*) AS negativeViews FROM article WHERE view_count < 0`,
  );
  if (Number(negativeViews) > 0) {
    const [rows] = await pool.query(
      "SELECT id, title, view_count AS v FROM article WHERE view_count < 0",
    );
    report(
      "error",
      `${negativeViews} 篇文章的 view_count 为负数`,
      rows.map((r) => `#${r.id} ${r.title} → ${r.v}`),
    );
  }

  const [boolRows] = await pool.query(
    `SELECT setting_key AS k, setting_value AS v FROM setting
     WHERE setting_key IN (?)`,
    [BOOLEAN_SETTING_KEYS],
  );
  const badBoolean = boolRows.filter(
    (r) => !VALID_BOOLEAN_SETTINGS.includes(r.v ?? ""),
  );
  if (badBoolean.length) {
    report(
      "warn",
      `${badBoolean.length} 个开关型设置取值不在约定集合（前台只认 "false" 为关闭）`,
      badBoolean.map(
        (r) => `${r.k} = ${JSON.stringify(r.v)}（约定："" / "true" / "false"）`,
      ),
    );
  }
};

/* ------------------------------------------------------------------ */
/* 三、语义完整性（外键管不到的约束）                                  */
/* ------------------------------------------------------------------ */

const checkSemantics = async () => {
  // 1) 跨文章父评论：回复挂到了别的文章的评论上
  const [crossArticle] = await pool.query(
    `SELECT c.id, c.article_id AS articleId, c.parent_id AS parentId, p.article_id AS parentArticleId
     FROM comment c JOIN comment p ON c.parent_id = p.id
     WHERE c.article_id <> p.article_id`,
  );
  if (crossArticle.length) {
    report(
      "error",
      `${crossArticle.length} 条回复的父评论属于另一篇文章（前台会显示在错误文章下）`,
      crossArticle.map(
        (r) =>
          `评论#${r.id}（文章#${r.articleId}）→ 父评论#${r.parentId}（文章#${r.parentArticleId}）`,
      ),
    );
  }

  // 2) 三级嵌套：父评论自身也是回复（项目约定「评论只两级」）
  const [deepNesting] = await pool.query(
    `SELECT c.id, c.parent_id AS parentId, p.parent_id AS grandParentId
     FROM comment c JOIN comment p ON c.parent_id = p.id
     WHERE p.parent_id IS NOT NULL`,
  );
  if (deepNesting.length) {
    report(
      "error",
      `${deepNesting.length} 条评论构成三级及以上嵌套（违反「只两级」约定）`,
      deepNesting.map(
        (r) => `评论#${r.id} → 父#${r.parentId} → 祖父#${r.grandParentId}`,
      ),
    );
  }

  // 3) 回复挂在自己的父级上产生自环（自己指向自己）
  const [[{ selfRefs }]] = await pool.query(
    `SELECT COUNT(*) AS selfRefs FROM comment WHERE parent_id = id`,
  );
  if (Number(selfRefs) > 0) {
    report("error", `${selfRefs} 条评论的 parent_id 指向自己`);
  }

  // 4) 「回复谁」（reply_to_id）与父评论必须同属一篇文章 —— 由批 4 新增的列引入。
  //    外键只保证「该评论存在」，管不到「同属一篇文章」；跨文章会让回复通知发给无关的人。
  const [crossReplyTo] = await pool.query(
    `SELECT c.id, c.article_id AS articleId, c.reply_to_id AS replyToId, t.article_id AS targetArticleId
     FROM comment c JOIN comment t ON c.reply_to_id = t.id
     WHERE c.article_id <> t.article_id`,
  );
  if (crossReplyTo.length) {
    report(
      "error",
      `${crossReplyTo.length} 条回复的 reply_to_id 指向另一篇文章的评论（回复通知会发给无关的人）`,
      crossReplyTo.map(
        (r) =>
          `评论#${r.id}（文章#${r.articleId}）→ 目标#${r.replyToId}（文章#${r.targetArticleId}）`,
      ),
    );
  }

  // 5) reply_to_id 指向自己
  const [[{ replyToSelfRefs }]] = await pool.query(
    `SELECT COUNT(*) AS replyToSelfRefs FROM comment WHERE reply_to_id = id`,
  );
  if (Number(replyToSelfRefs) > 0) {
    report("error", `${replyToSelfRefs} 条评论的 reply_to_id 指向自己`);
  }
};

/* ------------------------------------------------------------------ */
/* 四、计数漂移（展示用与删除保护用两套口径）                          */
/* ------------------------------------------------------------------ */

const checkCountDrift = async () => {
  // 展示口径：已发布且未软删除（与 models/Type.js、models/Label.js 的公开计数一致）
  const [typeRows] = await pool.query(
    `SELECT t.id, t.type_name AS name,
            (SELECT COUNT(*) FROM article a
              WHERE a.type_id = t.id AND a.status = 'published' AND a.deleted_at IS NULL) AS publishedCount,
            (SELECT COUNT(*) FROM article a
              WHERE a.type_id = t.id AND a.deleted_at IS NULL) AS anyCount
     FROM type t ORDER BY t.id`,
  );
  const emptyTypes = typeRows.filter((r) => Number(r.anyCount) === 0);
  if (emptyTypes.length) {
    report(
      "info",
      `${emptyTypes.length} 个分类下没有任何文章（前台已隐藏，仍可自行清理）`,
      emptyTypes.map((r) => `#${r.id} ${r.name}`),
    );
  }
  const draftOnlyTypes = typeRows.filter(
    (r) => Number(r.anyCount) > 0 && Number(r.publishedCount) === 0,
  );
  if (draftOnlyTypes.length) {
    report(
      "info",
      `${draftOnlyTypes.length} 个分类只有草稿（前台不展示，但删除保护会拦住）`,
      draftOnlyTypes.map(
        (r) => `#${r.id} ${r.name}（含草稿 ${r.anyCount} 篇）`,
      ),
    );
  }

  const [labelRows] = await pool.query(
    `SELECT l.id, l.label_name AS name,
            (SELECT COUNT(*) FROM article_label al JOIN article a ON a.id = al.article_id
              WHERE al.label_id = l.id AND a.status = 'published' AND a.deleted_at IS NULL) AS publishedCount,
            (SELECT COUNT(*) FROM article_label al JOIN article a ON a.id = al.article_id
              WHERE al.label_id = l.id AND a.deleted_at IS NULL) AS anyCount
     FROM label l ORDER BY l.id`,
  );
  const emptyLabels = labelRows.filter((r) => Number(r.anyCount) === 0);
  if (emptyLabels.length) {
    report(
      "info",
      `${emptyLabels.length} 个标签未被任何文章使用（前台会展示 0 篇，可自行清理）`,
      emptyLabels.map((r) => `#${r.id} ${r.name}`),
    );
  }
};

/* ------------------------------------------------------------------ */
/* 五、异常值 / 内容完整性                                             */
/* ------------------------------------------------------------------ */

const checkAnomalies = async () => {
  const [emptyContent] = await pool.query(
    `SELECT id, title FROM article
     WHERE status = 'published' AND deleted_at IS NULL
       AND (content IS NULL OR TRIM(content) = '')`,
  );
  if (emptyContent.length) {
    report(
      "error",
      `${emptyContent.length} 篇已发布文章正文为空（前台会渲染出空页面）`,
      emptyContent.map((r) => `#${r.id} ${r.title}`),
    );
  }

  const [emptyTitle] = await pool.query(
    `SELECT id FROM article WHERE title IS NULL OR TRIM(title) = ''`,
  );
  if (emptyTitle.length) {
    report(
      "error",
      `${emptyTitle.length} 篇文章标题为空`,
      emptyTitle.map((r) => `#${r.id}`),
    );
  }

  const [noSummary] = await pool.query(
    `SELECT id, title FROM article
     WHERE status = 'published' AND deleted_at IS NULL
       AND (summary IS NULL OR TRIM(summary) = '')`,
  );
  if (noSummary.length) {
    report(
      "info",
      `${noSummary.length} 篇已发布文章没有摘要（列表卡片与分享描述会退化为正文截断）`,
      noSummary.map((r) => `#${r.id} ${r.title}`),
    );
  }

  const [timeAnomaly] = await pool.query(
    `SELECT id, title, created_at AS c, updated_at AS u FROM article WHERE updated_at < created_at`,
  );
  if (timeAnomaly.length) {
    report(
      "warn",
      `${timeAnomaly.length} 篇文章的 updated_at 早于 created_at（时间倒挂）`,
      timeAnomaly.map((r) => `#${r.id} ${r.title}`),
    );
  }

  const [orphanReplies] = await pool.query(
    `SELECT c.id, c.article_id AS articleId FROM comment c
     LEFT JOIN article a ON a.id = c.article_id WHERE a.id IS NULL`,
  );
  if (orphanReplies.length) {
    report(
      "error",
      `${orphanReplies.length} 条评论指向不存在的文章`,
      orphanReplies.map((r) => `评论#${r.id} → 文章#${r.articleId}`),
    );
  }

  const [[{ bloggerCount }]] = await pool.query(
    `SELECT COUNT(*) AS bloggerCount FROM blogger`,
  );
  if (Number(bloggerCount) === 0) {
    report("warn", "blogger 表为空（无人可登录后台，请检查初始化脚本）");
  }

  const [[{ settingCount }]] = await pool.query(
    `SELECT COUNT(*) AS settingCount FROM setting`,
  );
  if (Number(settingCount) === 0) {
    report("warn", "setting 表为空（站点将全部走代码内默认值）");
  }
};

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

const main = async () => {
  console.log(line("="));
  console.log(" 数据层体检报告（只读，不修改任何数据）");
  console.log(line("="));
  console.log(`[数据库  ] ${process.env.DB_NAME || "myblog"}`);
  console.log(`[执行时间] ${new Date().toLocaleString("zh-CN")}`);
  console.log(
    `[模式    ] ${STRICT ? "STRICT（存在 error 时退出码 1）" : "普通（始终退出码 0）"}`,
  );

  await runSection(
    1,
    "结构安全网（表 / 列 / 外键 / 唯一索引是否齐备）",
    checkSchema,
  );
  await runSection(2, "取值越界（varchar 列不受枚举保护）", checkValueRanges);
  await runSection(3, "语义完整性（外键管不到的约束）", checkSemantics);
  await runSection(4, "计数与使用情况", checkCountDrift);
  await runSection(5, "异常值 / 内容完整性", checkAnomalies);

  /* 汇总 */
  console.log("");
  console.log(line("="));
  console.log("汇总");
  console.log(line("="));
  console.log(`  [error] ${findings.error.length} 项`);
  console.log(`  [warn ] ${findings.warn.length} 项`);
  console.log(`  [info ] ${findings.info.length} 项`);

  if (findings.error.length > 0) {
    console.log("");
    console.log("【需要处理的 error 项】");
    for (const item of findings.error) console.log(`  ✗ ${item.title}`);
  }

  console.log("");
  console.log(
    findings.error.length > 0
      ? "体检结束：发现需要处理的问题（见上）。"
      : findings.warn.length > 0
        ? "体检结束：无 error，有若干 warn 建议确认。"
        : "体检结束：数据自洽。",
  );

  await pool.end();

  if (STRICT && findings.error.length > 0) {
    process.exitCode = 1;
  }
};

main().catch(async (err) => {
  console.error("体检脚本执行失败:", err);
  try {
    await pool.end();
  } catch {
    // 忽略关闭失败
  }
  process.exitCode = 1;
});
