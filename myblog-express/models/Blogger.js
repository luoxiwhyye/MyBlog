const pool = require("../config/database");
const bcryptjs = require("bcryptjs");

const getBloggerByUsername = async (username) => {
  const [rows] = await pool.query(
    "SELECT id, username, nickname, password_hash AS password, email, avatar, bio, role, created_at AS createdAt FROM blogger WHERE username = ?",
    [username],
  );
  return rows[0];
};

const getBloggerById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, username, nickname, email, avatar, bio, role, created_at AS createdAt FROM blogger WHERE id = ?",
    [id],
  );
  return rows[0];
};

const createBlogger = async (bloggerData) => {
  const hashedPassword = await bcryptjs.hash(bloggerData.password, 10);

  const role = bloggerData.role || "admin";

  const [result] = await pool.query(
    `INSERT INTO blogger (username, nickname, password_hash, email, avatar, bio, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      bloggerData.username,
      bloggerData.nickname || bloggerData.username,
      hashedPassword,
      bloggerData.email || "",
      bloggerData.avatar || "",
      bloggerData.bio || "",
      role,
    ],
  );
  return result.insertId;
};

const verifyPassword = async (plainPassword, hashedPassword) => {
  return bcryptjs.compare(plainPassword, hashedPassword);
};

const updateBlogger = async (id, bloggerData) => {
  const updates = [];
  const params = [];

  if (bloggerData.email !== undefined) {
    updates.push("email = ?");
    params.push(bloggerData.email);
  }
  if (bloggerData.nickname !== undefined) {
    updates.push("nickname = ?");
    params.push(bloggerData.nickname);
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
    `UPDATE blogger SET ${updates.join(", ")} WHERE id = ?`,
    params,
  );
  return result.affectedRows > 0;
};

const changePassword = async (id, newPassword) => {
  const hashedPassword = await bcryptjs.hash(newPassword, 10);

  const [result] = await pool.query(
    "UPDATE blogger SET password_hash = ? WHERE id = ?",
    [hashedPassword, id],
  );
  return result.affectedRows > 0;
};

const getPublicProfile = async () => {
  const [rows] = await pool.query(
    "SELECT id, nickname, avatar, bio, created_at AS createdAt FROM blogger ORDER BY id ASC LIMIT 1",
  );
  return rows[0] || null;
};

module.exports = {
  getBloggerByUsername,
  getBloggerById,
  createBlogger,
  verifyPassword,
  updateBlogger,
  changePassword,
  getPublicProfile,
};
