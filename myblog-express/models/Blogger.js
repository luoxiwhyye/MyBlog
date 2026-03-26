const pool = require("../config/database");
const bcryptjs = require("bcryptjs");

/**
 * 通过用户名查找博主
 */
const getBloggerByUsername = async (username) => {
  const [rows] = await pool.query(
    "SELECT id, username, password, email, avatar, bio, role FROM bloggers WHERE username = ? AND role = ?",
    [username, "admin"],
  );
  return rows[0];
};

/**
 * 通过ID查找博主
 */
const getBloggerById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, username, email, avatar, bio, role, createdAt FROM bloggers WHERE id = ?",
    [id],
  );
  return rows[0];
};

/**
 * 创建博主账户
 */
const createBlogger = async (bloggerData) => {
  const hashedPassword = await bcryptjs.hash(bloggerData.password, 10);

  const [result] = await pool.query(
    `INSERT INTO bloggers (username, password, email, avatar, bio, role, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      bloggerData.username,
      hashedPassword,
      bloggerData.email || "",
      bloggerData.avatar || "",
      bloggerData.bio || "",
      "admin",
    ],
  );
  return result.insertId;
};

/**
 * 验证密码
 */
const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcryptjs.compare(plainPassword, hashedPassword);
};

/**
 * 更新博主信息
 */
const updateBlogger = async (id, bloggerData) => {
  const updates = [];
  const params = [];

  if (bloggerData.email !== undefined) {
    updates.push("email = ?");
    params.push(bloggerData.email);
  }
  if (bloggerData.bio !== undefined) {
    updates.push("bio = ?");
    params.push(bloggerData.bio);
  }
  if (bloggerData.avatar !== undefined) {
    updates.push("avatar = ?");
    params.push(bloggerData.avatar);
  }

  if (updates.length === 0) return false;

  params.push(id);

  const [result] = await pool.query(
    `UPDATE bloggers SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );
  return result.affectedRows > 0;
};

/**
 * 修改密码
 */
const changePassword = async (id, newPassword) => {
  const hashedPassword = await bcryptjs.hash(newPassword, 10);

  const [result] = await pool.query(
    "UPDATE bloggers SET password = ? WHERE id = ?",
    [hashedPassword, id],
  );
  return result.affectedRows > 0;
};

module.exports = {
  getBloggerByUsername,
  getBloggerById,
  createBlogger,
  verifyPassword,
  updateBlogger,
  changePassword,
};
