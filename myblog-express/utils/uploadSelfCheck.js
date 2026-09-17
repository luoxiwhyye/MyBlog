// ============================================
// utils/uploadSelfCheck.js - 启动自检：uploads 目录能否对上数据库引用
//
// 背景：图片地址（`/uploads/xxx`）存在数据库里，文件却在各自的 uploads 目录里。
// 两个后端各有一份 uploads 时（本机同时跑 Express 与 Spring 最容易撞到），
// 接口一切正常、迁移也没报错，只有前台图片 404 —— 而日志里一行提示都没有。
// 所以这里在启动时把「解析到的根目录」打出来，并抽一条数据库引用核对文件在不在。
//
// 只打印，不影响启动；与 Spring 的 config/UploadDirSelfCheck.java 口径一致。
// ============================================

const fs = require("fs");
const path = require("path");
const pool = require("../config/database");
const { getUploadRelativePathFromUrl } = require("./upload");

// Express 的上传根目录固定在 myblog-express/uploads（config/upload.js 与
// utils/upload.js 都按这个位置读写，express.static 也挂在这里），不受 cwd 影响。
const uploadsRoot = path.resolve(__dirname, "../uploads");

/**
 * 抽样来源：任意一条能说明「数据库里有本地引用」的记录即可。
 * 表不存在（老库）等错误按「跳过该来源」处理。
 */
const SAMPLES = [
  {
    source: "文章封面",
    sql: "SELECT cover_image AS value FROM `article` WHERE cover_image LIKE '%/uploads/%' ORDER BY id DESC LIMIT 1",
  },
  {
    source: "博主头像",
    sql: "SELECT avatar AS value FROM `blogger` WHERE avatar LIKE '%/uploads/%' LIMIT 1",
  },
  {
    source: "站点图片设置",
    sql: "SELECT setting_value AS value FROM `setting` WHERE setting_type = 'image' AND setting_value LIKE '%/uploads/%' LIMIT 1",
  },
  {
    source: "友链头像",
    sql: "SELECT avatar AS value FROM `friend_link` WHERE avatar LIKE '%/uploads/%' LIMIT 1",
  },
];

const countFiles = (dir) => {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      total += countFiles(path.join(dir, entry.name));
    } else {
      total += 1;
    }
  }
  return total;
};

/**
 * 取第一条数据库里的本地上传引用，核对文件是否真的在 uploads 根目录下。
 * @returns {Promise<{root: string, ok: boolean, source: string, value: string, file: string}>}
 */
const checkUploadsDir = async () => {
  const exists = fs.existsSync(uploadsRoot);
  let fileCount = 0;
  if (exists) {
    try {
      fileCount = countFiles(uploadsRoot);
    } catch {
      fileCount = 0;
    }
  }
  console.log(
    `[uploads] 根目录: ${uploadsRoot}${exists ? `（${fileCount} 个文件）` : "（不存在）"}`,
  );

  const result = {
    root: uploadsRoot,
    ok: true,
    source: "",
    value: "",
    file: "",
  };

  // 抽一条数据库引用
  let sample = null;
  for (const item of SAMPLES) {
    try {
      const [rows] = await pool.query(item.sql);
      const value = rows?.[0]?.value;
      if (value) {
        sample = { ...item, value };
        break;
      }
    } catch {
      // 表 / 列不存在或查询失败：跳过该来源
    }
  }

  if (!sample) {
    return result;
  }

  const relative = getUploadRelativePathFromUrl(sample.value);
  const file = relative ? path.join(uploadsRoot, relative) : "";
  const hit = !!file && fs.existsSync(file);

  result.source = sample.source;
  result.value = sample.value;
  result.file = file;
  result.ok = hit;

  if (!hit) {
    console.warn(
      [
        `[uploads] 数据库引用的图片在本目录里不存在（${sample.source}: ${sample.value}）`,
        `[uploads]   当前根目录：${uploadsRoot}`,
        "[uploads]   两个后端必须指向同一份 uploads —— 本机同时跑 Spring 时，",
        "[uploads]   请把 Spring 的 UPLOAD_PATH 指向 ../myblog-express/uploads；",
        "[uploads]   完整体检：node scripts/verifyUploads.js（Spring 侧用 --tool=verify-uploads）",
      ].join("\n"),
    );
  }

  return result;
};

module.exports = { checkUploadsDir, uploadsRoot };
