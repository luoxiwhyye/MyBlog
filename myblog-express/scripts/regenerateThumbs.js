/**
 * 一次性脚本：为 uploads/ 下已存在的图片重新生成 .webp 主图与 _thumb.webp 缩略图。
 * 用于修复 sharp 未安装期间上传的历史图片缺少变体的问题。
 * 用法：node scripts/regenerateThumbs.js
 */
const path = require("path");
const fs = require("fs");
const { convertToWebP } = require("../utils/sharpConverter");

const uploadsRoot = path.resolve(__dirname, "../uploads");
const IMAGE_EXT = /\.(jpe?g|png|gif)$/i;
const SKIP_EXT = /\.(webp|avif)$/i;

const walk = (dir, acc = []) => {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (IMAGE_EXT.test(entry.name) && !SKIP_EXT.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
};

(async () => {
  const files = walk(uploadsRoot);
  console.log(`发现 ${files.length} 张待处理图片`);
  let ok = 0;
  let fail = 0;
  for (const f of files) {
    const result = await convertToWebP(f);
    if (result.webpPath && result.thumbPath) {
      ok += 1;
      console.log(`[OK] ${path.relative(uploadsRoot, f)}`);
    } else {
      fail += 1;
      console.log(`[SKIP] ${path.relative(uploadsRoot, f)}`);
    }
  }
  console.log(`完成：成功 ${ok}，跳过/失败 ${fail}`);
  process.exit(fail > 0 ? 1 : 0);
})();
