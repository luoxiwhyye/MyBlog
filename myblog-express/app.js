const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
require("dotenv").config();

// 导入路由
const typeRoutes = require("./routes/typeRoutes");
const labelRoutes = require("./routes/labelRoutes");
const articleRoutes = require("./routes/articleRoutes");
const commentRoutes = require("./routes/commentRoutes");
const bloggerRoutes = require("./routes/bloggerRoutes");
const settingRoutes = require("./routes/settingRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// 导入中间件
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");

// 创建应用
const app = express();

// ── HTTP 压缩 ── 在所有静态/JSON 响应前启用 gzip/brotli
app.use(compression());

// ── 安全头 ── Helmet + CSP
const cspDirectives = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  imgSrc: ["'self'", "data:", "https:", "http:"],
  fontSrc: ["'self'", "https://fonts.gstatic.com"],
  connectSrc: ["'self'"],
  mediaSrc: ["'self'"],
  objectSrc: ["'none'"],
  frameAncestors: ["'self'"],
  formAction: ["'self'"],
  upgradeInsecureRequests: [],
};

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    contentSecurityPolicy: {
      directives: cspDirectives,
    },
  }),
);

// ── CORS ── 始终使用显式白名单，受 .env 控制
const allowedOrigins = [
  process.env.FRONTEND_ORIGIN,
  process.env.ADMIN_ORIGIN,
].filter(Boolean);

// 开发环境未配置白名单时回退到 localhost 常用端口
const devFallbackOrigins =
  process.env.NODE_ENV !== "production"
    ? ["http://localhost:3001", "http://localhost:5173"]
    : [];

const corsOrigins =
  allowedOrigins.length > 0 ? allowedOrigins : devFallbackOrigins;

app.use(
  cors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  }),
);

// ── 日志中间件
app.use(morgan("combined"));

// ── 全局限流（所有 /api 路由）
app.use("/api", apiLimiter);

// ── 请求体解析 ── 限制大小防止内存溢出
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 静态文件服务（上传的文件）
app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders(res) {
      const frontendOrigin = process.env.FRONTEND_ORIGIN;
      if (frontendOrigin) {
        res.setHeader("Access-Control-Allow-Origin", frontendOrigin);
      }
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
  }),
);

// 注册路由
const apiPrefix = "/api/v1";

// 健康检查端点 — 生产环境仅返回 status，开发环境保留诊断信息
app.get("/health", (_req, res) => {
  const isProduction = process.env.NODE_ENV === "production";

  const base = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  if (isProduction) {
    res.json(base);
    return;
  }

  const { secret: _, ...restConfig } = require("./config/jwt");
  void _;
  res.json({
    ...base,
    uptime: process.uptime(),
    env: process.env.NODE_ENV || "development",
    jwtConfigured: !!require("./config/jwt").secret,
  });
});

app.use(`${apiPrefix}/types`, typeRoutes);
app.use(`${apiPrefix}/labels`, labelRoutes);
app.use(`${apiPrefix}/articles`, articleRoutes);
app.use(`${apiPrefix}/comments`, commentRoutes);
app.use(`${apiPrefix}/blogger`, bloggerRoutes);
app.use(`${apiPrefix}/settings`, settingRoutes);
app.use(`${apiPrefix}/upload`, uploadRoutes);
app.use(`${apiPrefix}/dashboard`, dashboardRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: "请求的资源不存在",
    data: null,
  });
});

// 全局错误处理中间件
app.use(errorHandler);

module.exports = app;
