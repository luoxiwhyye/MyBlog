const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
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

// 导入中间件
const errorHandler = require("./middleware/errorHandler");

// 创建应用
const app = express();

// 安全中间件
app.use(helmet());

// CORS 中间件
app.use(cors());

// 日志中间件
app.use(morgan("combined"));

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务（上传的文件）
app.use("/uploads", express.static("uploads"));

// 注册路由
const apiPrefix = "/api/v1";

app.use(`${apiPrefix}/types`, typeRoutes);
app.use(`${apiPrefix}/labels`, labelRoutes);
app.use(`${apiPrefix}/articles`, articleRoutes);
app.use(`${apiPrefix}/comments`, commentRoutes);
app.use(`${apiPrefix}/blogger`, bloggerRoutes);
app.use(`${apiPrefix}/settings`, settingRoutes);
app.use(`${apiPrefix}/upload`, uploadRoutes);

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
