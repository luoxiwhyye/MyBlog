const bloggerModel = require("../models/Blogger");
const pool = require("../config/database");
const { success, error } = require("../utils/response");
const { uploadToCDN } = require("../utils/upload");
const jwt = require("jsonwebtoken");
const { secret, expiresIn } = require("../config/jwt");
const { initBlogger } = require("../utils/initBlogger");

/**
 * 检测是否已初始化博主账号（公开，供登录页判断是否显示初始化表单）
 */
const exists = async (req, res, next) => {
  try {
    const hasAccount = await bloggerModel.exists();
    success(res, { exists: hasAccount });
  } catch (err) {
    next(err);
  }
};

/**
 * 初始化管理员账号（公开，仅当尚无任何账号时允许；已存在则拒绝）
 */
const init = async (req, res, next) => {
  try {
    const username = (req.body?.username || "").trim();
    const password = req.body?.password || "";
    const nickname = (req.body?.nickname || "").trim() || username;
    const email = (req.body?.email || "").trim();

    if (!username || !password) {
      return error(res, "用户名和密码不能为空", 400);
    }
    if (password.length < 6) {
      return error(res, "密码长度不能少于 6 位", 400);
    }
    if (username.length < 3 || username.length > 50) {
      return error(res, "用户名长度需为 3-50 位", 400);
    }

    const initialized = await initBlogger({
      username,
      password,
      nickname,
      email,
    });
    if (!initialized) {
      return error(res, "博主账号已存在，拒绝再次初始化", 409);
    }

    success(res, null, "管理员账号初始化成功");
  } catch (err) {
    next(err);
  }
};

/**
 * 重置账户（需登录，admin）——清空全部业务数据并重建管理员账号
 * 危险操作：确认密码与输入的新账号信息。数据库全部数据会被清空。
 */
const reset = async (req, res, next) => {
  try {
    const { username, password, nickname, email } = req.body || {};
    const currentUsername = req.user?.username;

    if (!username || !password) {
      return error(res, "新用户名和新密码不能为空", 400);
    }
    if (password.length < 6) {
      return error(res, "密码长度不能少于 6 位", 400);
    }
    if (username.length < 3 || username.length > 50) {
      return error(res, "用户名长度需为 3-50 位", 400);
    }

    // 若想沿用当前用户名，需避免与旧记录冲突（清空后重建允许同名）
    // 事务中清空全部业务表
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 按外键依赖顺序清空（先子表后父表）
      const tables = [
        "article_label",
        "comment",
        "article",
        "friend_link",
        "label",
        "type",
        "setting",
        "message_board",
        "blogger",
      ];
      for (const table of tables) {
        await conn.query(`DELETE FROM \`${table}\``);
        // 重置自增 ID（对存在 AUTO_INCREMENT 的表生效）
        try {
          await conn.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
        } catch (_) {
          // 无自增主键的表忽略
        }
      }

      // 使用 Bcrypt 加密重建管理员
      const bcryptjs = require("bcryptjs");
      const hashedPassword = await bcryptjs.hash(password, 10);
      await conn.query(
        `INSERT INTO blogger (username, nickname, password_hash, email, avatar, bio, role, created_at)
         VALUES (?, ?, ?, ?, '', '', 'admin', NOW())`,
        [username, nickname || username, hashedPassword, email || ""],
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    // 清空相关缓存
    try {
      const cache = require("../middleware/cache");
      cache.invalidate("settings");
      cache.invalidate("friend-links");
    } catch (_) {
      // 缓存模块可失败，忽略
    }

    console.log(
      "🔒 账户已重置（清空全部数据）:",
      currentUsername,
      "→",
      username,
    );
    success(res, null, "账户已重置，全部数据已清空，请使用新账号登录");
  } catch (err) {
    next(err);
  }
};

/**
 * 博主登录
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return error(res, "用户名和密码不能为空", 400);
    }

    const blogger = await bloggerModel.getBloggerByUsername(username);
    if (!blogger) {
      return error(res, "用户名或密码错误", 401);
    }

    const isPasswordValid = await bloggerModel.verifyPassword(
      password,
      blogger.password,
    );
    if (!isPasswordValid) {
      return error(res, "用户名或密码错误", 401);
    }

    // 生成token
    const token = jwt.sign(
      {
        id: blogger.id,
        username: blogger.username,
        nickname: blogger.nickname,
        role: blogger.role || "admin",
      },
      secret,
      { expiresIn },
    );

    const response = {
      token,
      blogger: {
        id: blogger.id,
        username: blogger.username,
        nickname: blogger.nickname,
        email: blogger.email,
        avatar: blogger.avatar,
        bio: blogger.bio,
      },
    };

    success(res, response, "登录成功");
  } catch (err) {
    next(err);
  }
};

/**
 * 获取博主信息
 */
const getProfile = async (req, res, next) => {
  try {
    const blogger = await bloggerModel.getBloggerById(req.user.id);
    if (!blogger) {
      return error(res, "博主信息不存在", 404);
    }

    success(res, blogger);
  } catch (err) {
    next(err);
  }
};

/**
 * 更新博主信息
 */
const updateProfile = async (req, res, next) => {
  try {
    const { email, nickname, bio, avatarUrl } = req.body;

    const bloggerData = {};
    if (email !== undefined) bloggerData.email = email;
    if (nickname !== undefined) bloggerData.nickname = nickname;
    if (bio !== undefined) bloggerData.bio = bio;

    if (req.file) {
      bloggerData.avatar = uploadToCDN(req.file.path);
    } else if (avatarUrl) {
      bloggerData.avatar = avatarUrl;
    }

    const updated = await bloggerModel.updateBlogger(req.user.id, bloggerData);
    if (!updated && Object.keys(bloggerData).length > 0) {
      // 如果没有更新任何字段但传了值，可能是数据库错误
    }

    success(res, null, "信息已更新");
  } catch (err) {
    next(err);
  }
};

/**
 * 修改密码
 */
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return error(res, "旧密码和新密码不能为空", 400);
    }

    const blogger = await bloggerModel.getBloggerByUsername(req.user.username);
    if (!blogger) {
      return error(res, "博主信息不存在", 404);
    }

    const isOldPasswordValid = await bloggerModel.verifyPassword(
      oldPassword,
      blogger.password,
    );
    if (!isOldPasswordValid) {
      return error(res, "旧密码错误", 401);
    }

    const changed = await bloggerModel.changePassword(req.user.id, newPassword);
    if (!changed) {
      return error(res, "密码修改失败", 500);
    }

    success(res, null, "密码修改成功");
  } catch (err) {
    next(err);
  }
};

/**
 * 获取博主公开信息（无需认证，供前台页面使用）
 */
const getPublicProfile = async (req, res, next) => {
  try {
    const profile = await bloggerModel.getPublicProfile();
    if (!profile) {
      return error(res, "博主信息不存在", 404);
    }

    success(res, profile);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  getProfile,
  getPublicProfile,
  updateProfile,
  changePassword,
  exists,
  init,
  reset,
};
