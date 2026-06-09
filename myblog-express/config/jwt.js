require("dotenv").config();

const SECRET = process.env.JWT_SECRET || "";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const assertSecret = () => {
  if (!SECRET) {
    console.error(
      "❌ [安全风险] JWT_SECRET 未配置，请设置环境变量 JWT_SECRET 为强随机字符串。",
    );
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET 未配置，拒绝启动（生产环境）");
    }
  }
};

module.exports = {
  secret: SECRET || "dev-secret-do-not-use-in-production",
  expiresIn: EXPIRES_IN,
  assertSecret,
};
