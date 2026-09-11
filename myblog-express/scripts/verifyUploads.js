/**
 * 上传文件体检脚本（只读）
 *
 * 背景：历史上「保存设置时比较字符串就删旧文件」的实现有两个缺陷，
 *   ① 只删单个文件、不删 sharp 生成的 `.webp` / `_thumb.webp` 变体；
 *   ② 不检查引用关系（两个配置键共用同一张图时，改其中一个会把文件删掉），
 * 结果是「DB 里存着 URL，磁盘上文件已经没了」——即背景图 404 的成因。
 *
 * 本脚本**只读**，不修改数据库、不删除文件，用来先拿到现状：
 *   一、逐项体检  setting 表中 type='image' 的配置 + friend_link 头像（原图 / 变体是否齐全）
 *   二、多键引用  找出「两个及以上配置键指向同一张图」的项（缺陷 ② 的触发条件）
 *   三、孤儿文件  uploads/setting/image/ 下未被任何记录引用的文件（缺陷 ① 的残留）
 *
 * 运行方式：
 *   node scripts/verifyUploads.js
 *   STRICT=1 node scripts/verifyUploads.js   # 发现问题时以退出码 1 结束（可用于 CI）
 *
 * 体检范围说明：只覆盖上传到 `uploads/setting/image/` 的图片 —— 即设置类图片
 * （背景图 / Logo / Favicon）与友链头像。该缺陷的删除入口只在 settingController 中，
 * 文章封面、正文图、博主头像、表情都不走这条删除路径，故不纳入判定
 * （否则会把它们的正常文件误报为孤儿）。
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
// 设置类图片的存放根目录（与 config/upload.js 的 ["setting", "image"] 对应）
const settingImageRoot = path.join(uploadsRoot, "setting", "image");
// 依赖目录结构的占位文件，不参与孤儿判定
const IGNORED_FILES = new Set([".gitkeep"]);

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
    "[体检范围] setting 表 type='image' 的配置 + friend_link 头像 + uploads/setting/image/ 目录",
  );
  console.log(`[uploads ] ${uploadsRoot}`);
  console.log(`[执行时间] ${startedAt.toLocaleString("zh-CN")}`);
  console.log(
    `[模式    ] ${STRICT ? "STRICT（发现问题时退出码 1）" : "普通（始终退出码 0）"}`,
  );
  console.log("");

  let settingRows = [];
  let friendLinkRows = [];
  try {
    [settingRows] = await pool.query(
      "SELECT setting_key AS settingKey, setting_value AS settingValue FROM setting WHERE setting_type = 'image' ORDER BY setting_key",
    );
    [friendLinkRows] = await pool.query(
      "SELECT id, name, avatar FROM friend_link WHERE avatar IS NOT NULL AND avatar <> '' ORDER BY id",
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

  const inspected = [...settingItems, ...friendLinkItems];

  /* ---------------------------------------------------------------- */
  /* 一、逐项体检                                                      */
  /* ---------------------------------------------------------------- */
  console.log(line());
  console.log(
    `一、逐项体检（setting.image 已配置 ${configuredSettings.length}/${settingRows.length} 项，友链头像 ${friendLinkRows.length} 项）`,
  );
  console.log(line());

  const printGroup = (title, items) => {
    console.log("");
    console.log(`【${title}】`);
    if (items.length === 0) {
      console.log("  （无）");
      return;
    }
    for (const item of items) {
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
  };

  printGroup("设置类图片（setting.type='image'）", settingItems);
  printGroup("友链头像（friend_link.avatar）", friendLinkItems);

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
    "二、多键引用同一张图（删除时只比字符串、不查引用 → 会误删仍被引用的文件）",
  );
  console.log(line());

  const byAssetKey = new Map();
  for (const item of inspected) {
    if (!item.assetKey) continue;
    if (!byAssetKey.has(item.assetKey)) byAssetKey.set(item.assetKey, []);
    byAssetKey.get(item.assetKey).push(item);
  }

  const sharedAssets = [...byAssetKey.entries()].filter(
    ([, items]) => items.length > 1,
  );

  if (sharedAssets.length === 0) {
    console.log("✓ 未发现两个及以上配置键指向同一张图");
  } else {
    for (const [assetKey, items] of sharedAssets) {
      console.log(`⚠ ${assetKey}`);
      for (const item of items) console.log(`    ← ${item.key}`);
      console.log(
        "    建议：这些键共用同一张图，改其中任意一个都可能删掉另一个仍在用的文件",
      );
    }
  }

  /* ---------------------------------------------------------------- */
  /* 三、孤儿文件                                                      */
  /* ---------------------------------------------------------------- */
  console.log("");
  console.log(line());
  console.log("三、孤儿文件（uploads/setting/image/ 下未被任何记录引用）");
  console.log(line());

  const referencedFiles = new Set();
  for (const item of inspected) {
    for (const file of collectUploadFiles(item.value)) {
      referencedFiles.add(file);
    }
  }

  const orphans = listFilesRecursively(settingImageRoot).filter(
    (file) => !referencedFiles.has(file),
  );

  if (orphans.length === 0) {
    console.log("✓ 未发现孤儿文件");
  } else {
    console.log(`共 ${orphans.length} 个：`);
    for (const file of orphans.sort()) {
      console.log(`  ${toUploadRelative(file)}`);
    }
    console.log("");
    console.log(
      "说明：多为只删原图、未清理派生变体留下的残留（或已解除引用的旧图）。",
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
    `记录：setting.image ${settingRows.length} 项（已配置 ${configuredSettings.length}）/ 友链头像 ${friendLinkRows.length} 项`,
  );
  console.log(`  ✓ 正常        ${healthy.length}`);
  console.log(`  ✗ 失联        ${problems.length}`);
  console.log(`  · 外部链接    ${external.length}`);
  console.log(`多键共用同一图：${sharedAssets.length} 组`);
  console.log(`孤儿文件：      ${orphans.length} 个`);

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

  const hasProblem = problems.length > 0 || orphans.length > 0;
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
