# MyBlog — Express 后端

MyBlog 的 Node.js 后端实现（与 `myblog-springboot` 功能等价，可按技术栈偏好选择部署）。提供 REST API，统一响应 `{ code, message, data }`，前缀 `/api/v1`。

## 技术栈

- **运行时**: Node.js 20.19+
- **Web 框架**: Express 5
- **数据库**: MySQL 8.0（mysql2/promise）
- **缓存**: Redis（ioredis），不可用自动降级直查数据库
- **认证**: JWT（jsonwebtoken + bcryptjs）
- **安全**: Helmet CSP + CORS 白名单 + 四层限流（express-rate-limit）
- **文件上传**: multer + sharp（自动生成 WebP / 缩略图）
- **全文搜索**: Meilisearch（不可用自动降级）
- **邮件通知**: nodemailer（未配置 SMTP 自动停用）
- **日志**: winston（结构化日志）+ morgan（HTTP 日志）
- **测试**: vitest + supertest

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，修改 DB_PASSWORD 与 JWT_SECRET（生产必改）
```

### 2. 初始化数据库

```bash
mysql -u root -p -e "CREATE DATABASE myblog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p myblog < myblog-1.1.sql
```

### 3. 安装并启动

```bash
npm install
npm run dev        # http://localhost:3000，热重载
npm start          # 生产运行
npm run init-blogger   # 初始化默认博主（admin / admin123）
```

### 4. 测试

```bash
npm test
```

## 主要目录

```
config/       # 数据库、JWT、上传、日志、Redis 配置
controllers/  # 控制器（article/blogger/comment/friendLink/...）
middleware/   # 认证、角色、限流、缓存、校验、错误处理、性能监控
models/       # 数据模型（Article/Blogger/Comment/FriendLink/...）
routes/       # 路由（含 cache/metrics 运维接口）
scripts/      # 初始化脚本（initBlogger、regenerateThumbs）
services/     # meilisearch、mailer、commentNotifier
utils/        # 日期、分页、响应、图片转换
test/         # 集成测试
```

## 环境变量

| 变量                                                                           | 说明                   | 默认值        |
| ------------------------------------------------------------------------------ | ---------------------- | ------------- |
| `NODE_ENV`                                                                     | 运行模式               | `development` |
| `PORT`                                                                         | 服务端口               | `3000`        |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`                  | 数据库连接             | —             |
| **`JWT_SECRET`**                                                               | JWT 密钥（生产必改）   | —             |
| `JWT_EXPIRES_IN`                                                               | Token 有效期           | `7d`          |
| `BLOGGER_USERNAME` / `BLOGGER_PASSWORD` / `BLOGGER_NICKNAME` / `BLOGGER_EMAIL` | 默认博主               | —             |
| `FRONTEND_ORIGIN` / `ADMIN_ORIGIN`                                             | CORS 白名单            | —             |
| `TRUST_PROXY`                                                                  | 反向代理信任层级       | `1`           |
| `SITE_URL` / `SITE_NAME`                                                       | 站点信息（邮件通知用） | —             |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM`            | SMTP 邮件通知（可选）  | —             |

其余说明见项目根目录 [README.md](../README.md)。
