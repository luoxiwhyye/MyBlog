const bloggerModel = require("../models/Blogger");
const { success, error } = require("../utils/response");
const { uploadToCDN } = require("../utils/upload");
const jwt = require("jsonwebtoken");
const { secret, expiresIn } = require("../config/jwt");

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
        role: blogger.role,
      },
      secret,
      { expiresIn },
    );

    const response = {
      token,
      blogger: {
        id: blogger.id,
        username: blogger.username,
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
    const { email, bio } = req.body;

    const bloggerData = {};
    if (email !== undefined) bloggerData.email = email;
    if (bio !== undefined) bloggerData.bio = bio;

    if (req.file) {
      bloggerData.avatar = uploadToCDN(req.file.path);
    }

    const updated = await bloggerModel.updateBlogger(req.user.id, bloggerData);
    if (!updated && Object.keys(bloggerData).length > 0) {
      // 如果没有更新任何字段但传了值，可能是数据库错误
    }

    success(res, null, "头像已更新");
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

module.exports = {
  login,
  getProfile,
  updateProfile,
  changePassword,
};
