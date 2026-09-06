# MyBlog — Express 后端

MyBlog 的 Node.js 后端实现（与 `myblog-springboot` **功能完全对齐**，可按技术栈偏好选择部署）。提供 REST API，统一响应 `{ code, message, data }`，前缀 `/api/v1`。

## 技术栈

- **运行时**: Node.js 20.19+
- **Web 框架**: Express 5
- **数据库**: MySQL 8.0（mysql2/promise）
- **缓存**: Redis（ioredis），不可用自动降级直查数据库
- **认证**: JWT（jsonwebtoken + bcryptjs），含角色权限
- **安全**: Helmet CSP + CORS 白名单 + 四层限流（express-rate-limit）
- **文件上传**: multer + sharp（自动生成 WebP / 缩略图）
- **全文搜索**: Meilisearch（不可用自动降级为 SQL LIKE）
- **邮件通知**: nodemailer（未配置 SMTP 自动停用）
- **日志**: winston（结构化日志）+ morgan（HTTP 日志）
- **测试**: vitest + supertest

## 功能概览

- 文章 / 分类 / 标签 / 友链 / 评论 / **留言板** CRUD（含审核、点赞、软删除）
- **表情包管理**、**前端错误日志聚合**（`POST /error-log` 公开接收 → `client_error_log` 落库 → admin 查看/清空）
- Redis 缓存（预热 / 命中统计 / 一键清空 / 写失效）、性能监控（`/metrics`）
- 图片上传并自动生成 WebP 变体；Meilisearch 全文搜索
- 评论 / 回复 / @提及邮件通知；健康检查 `/health`（DB / Redis / Meili）

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
npm run dev            # http://localhost:3000，热重载
npm start              # 生产运行
npm run init-blogger   # 初始化默认博主（admin / admin123）
```

### 4. 测试

```bash
npm test               # vitest + supertest 集成测试
```

## 主要目录

```
config/        # 数据库、JWT、上传、日志、Redis 配置
controllers/   # 控制器（article/blogger/comment/friendLink/messageBoard/emoji/errorLog/...）
middleware/    # 认证、角色、限流、缓存、校验、错误处理、性能监控
models/        # 数据模型（Article/Blogger/Comment/FriendLink/MessageBoard/Emoji/ClientErrorLog/...）
routes/        # 路由（含 cache/metrics/emoji/error-log 运维接口）
scripts/       # 初始化脚本（initBlogger、regenerateThumbs）
services/      # meilisearch、mailer、commentNotifier
utils/         # 日期、分页、响应、图片转换
test/          # 集成测试
```

## 路由一览（前缀 `/api/v1`）

| 前缀 | 说明 |
| --- | --- |
| `/articles` `/types` `/labels` `/comments` | 内容 CRUD / 评论审核 |
| `/message-board` | 留言板 |
| `/friend-links` | 友链（含点击计数） |
| `/blogger` | 登录 / 公开资料 |
| `/settings` | 网站配置（含自定义 Key-Value） |
| `/upload` | 图片上传（WebP 变体） |
| `/dashboard` | 仪表盘 / 未读红点 |
| `/cache` | 缓存预热 / 统计 / 清空 |
| `/metrics` | 性能监控 |
| `/emoji` | 表情包管理 |
| `/error-log` | 前端错误上报 / 查看 / 清空 |

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `NODE_ENV` | 运行模式 | `development` |
| `PORT` | 服务端口 | `3000` |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | 数据库连接 | — |
| `DB_POOL_MAX` | 连接池上限（可选） | `50` |
| **`JWT_SECRET`** | JWT 密钥（生产必改） | — |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `BLOGGER_USERNAME` / `BLOGGER_PASSWORD` / `BLOGGER_NICKNAME` / `BLOGGER_EMAIL` | 默认博主 | — |
| `FRONTEND_ORIGIN` / `ADMIN_ORIGIN` | CORS 白名单 | — |
| `TRUST_PROXY` | 反向代理信任层级（限流按真实 IP） | `1` |
| `REDIS_URL` / `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` | Redis（可选，不配则降级） | — |
| `MEILI_HOST` / `MEILI_PORT` / `MEILI_MASTER_KEY` | Meilisearch（可选，不配则降级） | — |
| `SITE_URL` / `SITE_NAME` | 站点信息（邮件通知用） | — |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SMTP 邮件通知（可选） | — |

其余说明见项目根目录 [README.md](../README.md)。

