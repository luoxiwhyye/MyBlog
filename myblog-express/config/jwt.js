require("dotenv").config();

module.exports = {
  secret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
  expiresIn: process.env.JWT_EXPIRES_IN || "7d",
};
