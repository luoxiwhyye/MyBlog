/**
 * 上传文件体检脚本（只读）
 *
 * 背景：历史上「保存设置时比较字符串就删旧文件」的实现有两个缺陷，
 *   ① 只删单个文件、不删 sharp 生成的 `.webp` / `_thumb.webp` 变体；
 *   ② 不检查引用关系（两个配置键共用同一张图时，改其中一个会把文件删掉），
 * 结果是「DB 里存着 URL，磁盘上文件已经没了」——即背景图 404 的成因。
 *
 * 本脚本**只读**，不修改数据库、不删除文件，用来先拿到现状：
 *   一、逐项体检  全部「DB 存 URL、磁盘存文件」的图片引用（原图 / 变体是否齐全）
 *   二、多键引用  同一张图被两个引用共用，且其中至少一个是设置项
 *   三、孤儿文件  各上传目录下未被任何记录引用的文件
 *
 * 体检范围（共 6 类引用，覆盖 `config/upload.js` 的全部 scene）：
 *   setting.type='image'（含背景图 / Logo / Favicon）、friend_link.avatar、
 *   blogger.avatar、emoji.type='image'、article.cover_image、article.content 正文图。
 *
 * 与 `auditData.js` 的分工：本脚本管**文件层**（DB 引用 vs 磁盘文件），
 * `auditData.js` 管**数据层**（库内一致性与完整性），两者都不写任何东西。
 *
 * 关于「孤儿」判定的前提（早期版本只扫 setting 目录，原因在此）：
 * 判定孤儿必须先把**所有**引用来源都收集齐，否则会把在用文件误报为孤儿。
 * 因此正文图与 emoji 是遍历**全部**文章（含草稿与回收站）与全部图片表情后
 * 才建立引用集合的 —— 草稿 / 回收站里的图仍会被恢复使用，不能算孤儿。
 *
 * 运行方式（在 myblog-express 目录执行）：
 *   node scripts/verifyUploads.js
 *   STRICT=1 node scripts/verifyUploads.js   # 发现问题时以退出码 1 结束（可用于 CI）
 */

const path = require("path");
const fs = require("fs");

const pool = require("../config/database");
const {
  getUploadRelativePathFromUrl,
  getUploadAssetKey,
  collectUploadFiles,
} = require("../utils/upload");

const uploadsRoot = path.resolve(__dirname, "../uploads");
// 依赖目录结构的占位文件，不参与孤儿判定
const IGNORED_FILES = new Set([".gitkeep"]);

/**
 * 参与孤儿扫描的上传目录（相对 uploads/）。
 * 与 `config/upload.js` 的 SCENE_DIR_MAP 逐一对应：
 *   setting/image ← setting / settings / setting-image（含好友头像子目录）
 *   article/cover ← article-cover
 *   article/content ← article-content
 *   blogger/avatar ← avatar / blogger-avatar
 *   emoji ← emoji
 */
const SCAN_DIRS = [
  "setting/image",
  "article/cover",
  "article/content",
  "blogger/avatar",
  "emoji",
];

/**
 * 从文章正文里抽出引用的图片 URL。
 * 同时覆盖两种内容格式：
 *   - HTML：`<img src="...">`（属性顺序不定）
 *   - Markdown：`![alt](url)`；md 里直接写 `<img>` 的情形也被上面那条覆盖
 * 正文里的外链同样会被抽出来，但 inspectImage 会把非本地上传归为 external 跳过。
 */
const CONTENT_HTML_IMG = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
const CONTENT_MD_IMG = /!\[[^\]]*\]\(\s*([^)\s]+)/g;

const parseContentImageUrls = (content) => {
  if (!content) return [];
  const urls = [];
  for (const pattern of [CONTENT_HTML_IMG, CONTENT_MD_IMG]) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = re.exec(content)) !== null) {
      if (match[1]) urls.push(match[1]);
    }
  }
  // 同一张图在正文里可能重复出现，只体检一次即可
  return [...new Set(urls)];
};

const STRICT = process.env.STRICT === "1";

const line = (char = "─", length = 60) => char.repeat(length);

const toUploadRelative = (absolutePath) =>
  path.relative(uploadsRoot, absolutePath).replace(/\\/g, "/");

/**
 * 递归列出目录下的全部文件（绝对路径）
 */
const listFilesRecursively = (dir) => {
  if (!fs.existsSync(dir)) return [];

  const result = [];
  const walk = (current) => {
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && !IGNORED_FILES.has(entry.name)) {
        result.push(fullPath);
      }
    }
  };

  walk(dir);
  return result;
};

/**
 * 体检单张图片（配置项或友链头像）
 *
 * @param {string} key 展示用的键名（如 site_bg_light / 友链#3）
 * @param {string} value 图片 URL
 * @param {string} source 来源标识（setting / friend_link），仅用于输出分组
 */
const inspectImage = (key, value, source) => {
  const relativePath = getUploadRelativePathFromUrl(value);

  // 非本地上传（外链、data: 等）不参与磁盘比对
  if (!relativePath) {
    return { key, value, source, status: "external" };
  }

  const originalPath = path.join(uploadsRoot, relativePath);
  const originalExists = fs.existsSync(originalPath);

  const allFiles = collectUploadFiles(value);
  const variants = allFiles
    .filter((file) => file !== originalPath)
    .map((file) => ({ name: path.basename(file) }));

  let status = "ok";
  if (!originalExists) {
    status = variants.length > 0 ? "missing-original" : "missing-all";
  }

  return {
    key,
    value,
    source,
    status,
    relativePath,
    assetKey: getUploadAssetKey(value),
    originalExists,
    originalName: path.basename(originalPath),
    variants,
  };
};

const STATUS_TEXT = {
  ok: "✓ 正常",
  "missing-original": "✗ 原图丢失（仅剩派生变体）",
  "missing-all": "✗ 文件全部丢失",
  external: "· 外部链接（跳过）",
};

const PROBLEM_STATUSES = new Set(["missing-original", "missing-all"]);

const main = async () => {
  const startedAt = new Date();
  console.log(line("="));
  console.log(" 上传文件体检报告（只读，不修改任何文件）");
  console.log(line("="));
  console.log(
    "[体检范围] setting.image + friend_link.avatar + blogger.avatar + emoji.image + article.cover_image + article.content 正文图",
  );
  console.log(`[扫描目录] ${SCAN_DIRS.join(" / ")}`);
  console.log(`[uploads ] ${uploadsRoot}`);
  console.log(`[执行时间] ${startedAt.toLocaleString("zh-CN")}`);
  console.log(
    `[模式    ] ${STRICT ? "STRICT（发现问题时退出码 1）" : "普通（始终退出码 0）"}`,
  );
  console.log("");

  let settingRows = [];
  let friendLinkRows = [];
  let bloggerRows = [];
  let emojiRows = [];
  let articleRows = [];
  try {
    [settingRows] = await pool.query(
      "SELECT setting_key AS settingKey, setting_value AS settingValue FROM setting WHERE setting_type = 'image' ORDER BY setting_key",
    );
    [friendLinkRows] = await pool.query(
      "SELECT id, name, avatar FROM friend_link WHERE avatar IS NOT NULL AND avatar <> '' ORDER BY id",
    );
    [bloggerRows] = await pool.query(
      "SELECT id, nickname, avatar FROM blogger WHERE avatar IS NOT NULL AND avatar <> '' ORDER BY id",
    );
    [emojiRows] = await pool.query(
      "SELECT id, content FROM emoji WHERE type = 'image' AND content IS NOT NULL AND content <> '' ORDER BY id",
    );
    // 全量文章：草稿与回收站里的图仍会被恢复使用，必须计入引用，否则会误报为孤儿
    [articleRows] = await pool.query(
      "SELECT id, title, cover_image AS coverImage, content FROM article ORDER BY id",
    );
  } catch (err) {
    console.error("❌ 读取数据库失败:", err.message);
    throw err;
  }

  const configuredSettings = settingRows
    .map((row) => ({ key: row.settingKey, value: row.settingValue || "" }))
    .filter((item) => item.value !== "");

  const settingItems = configuredSettings.map((item) =>
    inspectImage(item.key, item.value, "setting"),
  );
  // 友链头像也上传到 uploads/setting/image/friend-link-avatar/，但引用存在
  // friend_link.avatar 字段里（不在 setting 表）——遗漏它会把在用头像误判成孤儿
  const friendLinkItems = friendLinkRows.map((row) =>
    inspectImage(
      `友链#${row.id}${row.name ? ` ${row.name}` : ""}`,
      row.avatar,
      "friend_link",
    ),
  );
  const bloggerItems = bloggerRows.map((row) =>
    inspectImage(
      `博主#${row.id}${row.nickname ? ` ${row.nickname}` : ""}`,
      row.avatar,
      "blogger",
    ),
  );
  const emojiItems = emojiRows.map((row) =>
    inspectImage(`表情#${row.id}`, row.content, "emoji"),
  );
  const coverItems = articleRows
    .filter((row) => row.coverImage)
    .map((row) =>
      inspectImage(
        `文章#${row.id} 封面${row.title ? `（${row.title}）` : ""}`,
        row.coverImage,
        "article_cover",
      ),
    );

  // 正文图：一篇文章可能引用多张，逐张一条，key 里带序号便于定位
  const contentItems = [];
  for (const row of articleRows) {
    parseContentImageUrls(row.content).forEach((url, index) => {
      contentItems.push(
        inspectImage(
          `文章#${row.id} 正文图${index + 1}${row.title ? `（${row.title}）` : ""}`,
          url,
          "article_content",
        ),
      );
    });
  }

  const inspected = [
    ...settingItems,
    ...friendLinkItems,
    ...bloggerItems,
    ...emojiItems,
    ...coverItems,
    ...contentItems,
  ];

  /* ---------------------------------------------------------------- */
  /* 一、逐项体检                                                      */
  /* ---------------------------------------------------------------- */
  console.log(line());
  console.log("一、逐项体检（DB 存 URL、磁盘存文件 的全部图片引用）");
  console.log(line());

  const printGroup = (title, items, healthyLimit = Infinity) => {
    console.log("");
    console.log(`【${title}】（${items.length} 项）`);
    if (items.length === 0) {
      console.log("  （无）");
      return;
    }
    let printedHealthy = 0;
    let skippedHealthy = 0;
    for (const item of items) {
      // 问题项与外部链接全部展开；正常项过长时折叠，避免正文图把输出刷屏
      const isHealthy = item.status === "ok";
      if (isHealthy) {
        if (printedHealthy >= healthyLimit) {
          skippedHealthy += 1;
          continue;
        }
        printedHealthy += 1;
      }
      console.log("");
      console.log(`  ${STATUS_TEXT[item.status]}  ${item.key}`);
      console.log(`      值        ${item.value}`);
      if (item.status === "external") continue;
      console.log(`      相对路径  ${item.relativePath}`);
      console.log(
        `      原图      ${item.originalName} → ${item.originalExists ? "存在" : "缺失"}`,
      );
      console.log(
        `      派生变体  ${
          item.variants.length > 0
            ? item.variants.map((v) => v.name).join("、")
            : "（无）"
        }`,
      );
    }
    if (skippedHealthy > 0) {
      console.log("");
      console.log(`  …另有 ${skippedHealthy} 项正常（已省略展开）`);
    }
  };

  printGroup("设置类图片（setting.type='image'）", settingItems);
  printGroup("友链头像（friend_link.avatar）", friendLinkItems);
  printGroup("博主头像（blogger.avatar）", bloggerItems);
  printGroup("表情图片（emoji.type='image'）", emojiItems, 10);
  printGroup("文章封面（article.cover_image）", coverItems, 10);
  printGroup("文章正文图（article.content）", contentItems, 10);

  const problems = inspected.filter((item) =>
    PROBLEM_STATUSES.has(item.status),
  );
  const external = inspected.filter((item) => item.status === "external");
  const healthy = inspected.filter((item) => item.status === "ok");

  /* ---------------------------------------------------------------- */
  /* 二、多键引用同一张图                                              */
  /* ---------------------------------------------------------------- */
  console.log("");
  console.log(line());
  console.log(
    "二、多键引用同一张图（风险成立于「改设置项会删文件」：只比字符串、不查引用）",
  );
  console.log(line());

  const byAssetKey = new Map();
  for (const item of inspected) {
    if (!item.assetKey) continue;
    if (!byAssetKey.has(item.assetKey)) byAssetKey.set(item.assetKey, []);
    byAssetKey.get(item.assetKey).push(item);
  }

  // 只有「引用方里至少有一个设置项」才构成误删风险：
  // 删文件的入口仅在 settingController（改设置值 / 删设置项）。
  // 文章封面、表情图等同图共用不会触发删除，列出来只会变成噪声。
  const sharedAssets = [...byAssetKey.entries()].filter(
    ([, items]) =>
      items.length > 1 && items.some((item) => item.source === "setting"),
  );

  if (sharedAssets.length === 0) {
    console.log("✓ 未发现「设置项与其它引用共用同一张图」的情况");
  } else {
    for (const [assetKey, items] of sharedAssets) {
      console.log(`⚠ ${assetKey}`);
      for (const item of items)
        console.log(`    ← [${item.source}] ${item.key}`);
      console.log(
        "    建议：改这些键中任意一个都可能删掉共用文件，请拆成各自独立的图",
      );
    }
  }

  /* ---------------------------------------------------------------- */
  /* 三、孤儿文件（按目录分组）                                        */
  /* ---------------------------------------------------------------- */
  console.log("");
  console.log(line());
  console.log("三、孤儿文件（上传目录下未被任何记录引用）");
  console.log(line());

  const referencedFiles = new Set();
  for (const item of inspected) {
    for (const file of collectUploadFiles(item.value)) {
      referencedFiles.add(file);
    }
  }

  const allOrphans = [];
  for (const relativeDir of SCAN_DIRS) {
    const dirPath = path.join(uploadsRoot, relativeDir);
    const orphans = listFilesRecursively(dirPath).filter(
      (file) => !referencedFiles.has(file),
    );
    if (orphans.length === 0) continue;
    allOrphans.push(...orphans);
    console.log(`【${relativeDir}】${orphans.length} 个`);
    for (const file of orphans.sort()) {
      console.log(`  ${toUploadRelative(file)}`);
    }
    console.log("");
  }

  if (allOrphans.length === 0) {
    console.log("✓ 未发现孤儿文件");
  } else {
    console.log(
      `共 ${allOrphans.length} 个。多为只删原图、未清理派生变体留下的残留，或已解除引用的旧图。`,
    );
  }

  /* ---------------------------------------------------------------- */
  /* 四、汇总                                                          */
  /* ---------------------------------------------------------------- */
  console.log("");
  console.log(line("="));
  console.log("汇总");
  console.log(line("="));
  console.log(
    `引用项：设置 ${configuredSettings.length}/${settingRows.length}、友链头像 ${friendLinkRows.length}、博主头像 ${bloggerRows.length}、表情图 ${emojiRows.length}、`,
  );
  console.log(
    `        文章封面 ${coverItems.length}、文章正文图 ${contentItems.length}（合计 ${inspected.length} 项）`,
  );
  console.log(`  ✓ 正常        ${healthy.length}`);
  console.log(`  ✗ 失联        ${problems.length}`);
  console.log(`  · 外部链接    ${external.length}`);
  console.log(`多键共用同一图：${sharedAssets.length} 组`);
  console.log(`孤儿文件：      ${allOrphans.length} 个`);

  if (problems.length > 0) {
    console.log("");
    console.log("【需要处理的已失联引用】");
    for (const item of problems) {
      console.log(
        `  [${item.source}] ${item.key} → ${item.relativePath}（${item.status === "missing-all" ? "文件全部丢失" : "原图丢失、仅剩变体"}）`,
      );
    }
    console.log(
      "  处理方式：在后台重新上传该图片，或将其清空（留空则回退默认背景）。",
    );
  }

  const hasProblem = problems.length > 0 || allOrphans.length > 0;
  console.log("");
  console.log(
    hasProblem
      ? "体检结束：发现需要处理的问题（见上）。"
      : "体检结束：一切正常。",
  );

  await pool.end();

  if (STRICT && hasProblem) {
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
