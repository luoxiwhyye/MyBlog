const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 确保上传目录存在
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const SCENE_DIR_MAP = {
  avatar: ["blogger", "avatar"],
  "blogger-avatar": ["blogger", "avatar"],
  "article-cover": ["article", "cover"],
  "article-content": ["article", "content"],
  setting: ["setting", "image"],
  settings: ["setting", "image"],
  "setting-image": ["setting", "image"],
};

const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const normalizeScene = (scene) => {
  if (!scene || typeof scene !== "string") return "";
  return scene.trim().toLowerCase();
};

const normalizeSettingKey = (value) => {
  if (!value || typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const getSettingImageSubDir = (req, file) => {
  const settingKey = normalizeSettingKey(
    req.body?.settingKey || req.body?.setting_key || file?.fieldname,
  );

  if (settingKey) {
    return ["setting", "image", settingKey];
  }

  return ["setting", "image"];
};

const REQUIRED_SCENES_FOR_UPLOAD_API = [
  "avatar",
  "article-cover",
  "article-content",
  "setting-image",
];

const isUploadImageApi = (req) => {
  const baseUrl = (req.baseUrl || "").toLowerCase();
  return baseUrl.includes("/upload");
};

const getUploadSubDir = (req, file) => {
  const scene = normalizeScene(
    req.body?.scene || req.body?.type || req.body?.category,
  );

  if (scene === "setting-image") {
    return getSettingImageSubDir(req, file);
  }

  if (scene && SCENE_DIR_MAP[scene]) {
    return SCENE_DIR_MAP[scene];
  }

  // 路由兜底：兼容未传 scene 的旧调用
  const baseUrl = (req.baseUrl || "").toLowerCase();
  if (baseUrl.includes("/blogger")) {
    return ["blogger", "avatar"];
  }
  if (baseUrl.includes("/settings")) {
    return getSettingImageSubDir(req, file);
  }
  if (file?.fieldname === "coverImage") {
    return ["article", "cover"];
  }

  // /upload/image 默认作为正文图片
  return ["article", "content"];
};

// 设置存储配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDirParts = getUploadSubDir(req, file);
    const targetDir = path.join(uploadDir, ...subDirParts);
    ensureDirExists(targetDir);
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${random}${ext}`);
  },
});

// 设置文件过滤
const fileFilter = (req, file, cb) => {
  if (isUploadImageApi(req)) {
    const scene = normalizeScene(
      req.body?.scene || req.body?.type || req.body?.category,
    );

    if (!scene) {
      return cb(
        new Error(
          `上传场景 scene 不能为空，可选值：${REQUIRED_SCENES_FOR_UPLOAD_API.join(
            ", ",
          )}`,
        ),
      );
    }

    if (!REQUIRED_SCENES_FOR_UPLOAD_API.includes(scene)) {
      return cb(
        new Error(
          `不支持的上传场景 scene=${scene}，可选值：${REQUIRED_SCENES_FOR_UPLOAD_API.join(
            ", ",
          )}`,
        ),
      );
    }
  }

  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("只支持 jpg/jpeg/png/gif/webp 格式的图片"));
  }
};

// 创建 multer 实例
module.exports = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 5MB
  },
});
