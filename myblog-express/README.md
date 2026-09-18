# MyBlog — Express 后端

MyBlog 的 Node.js 后端实现（与 `myblog-springboot` 共用同一份数据库与接口契约，可按技术栈偏好选择部署；仍存在的差异见根目录 [README.md](../README.md) 的「双后端差异」）。提供 REST API，统一响应 `{ code, message, data }`，前缀 `/api/v1`。

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
- **评论批量改状态**（`PUT /comments/batch/status`，审核级联不变式）与**按文章下线评论区**（`article.comment_enabled`）
- **表情包管理（含分组）**、**前端错误日志聚合**（`POST /error-log` 公开接收 → `client_error_log` 落库 → admin 查看/清空）
- **邮件配置状态查询与测试发信**（`GET /mail/status`、`POST /mail/test`，仅管理员）
- Redis 缓存（预热 / 命中统计 / 一键清空 / 写失效）、性能监控（`/metrics`）
- 图片上传并自动生成 WebP 变体；Meilisearch 全文搜索
- **邮件通知 4 类**（无 SMTP 自动停用）：① 顶层评论 → 博主（创建即发）；② 回复 → 被回复者（**审核通过后**发一次）；③ 新留言 → 博主；④ 留言审核通过 → 留言者。②④ 的收件人需在提交时勾选「邮件通知我」（默认**不勾**，见 `comment.notify_email` / `message_board.notify_email`）
- 健康检查 `/health`（DB / Redis / Meili / 邮件 / 图片变体生成器）：Meili 块给 `status` 与 `reason`，`status` 为
  `ok` / `unauthorized`（主密钥与容器不一致）/ `unavailable` / `error` / `not_configured`
  —— 非 `ok` 时搜索降级为 SQL LIKE（降级时另打一行 warn，含原因）；
  `imageVariants` 块给 `{ status, reason }`，`disabled` 表示未装 sharp（不生成 `.webp` / `_thumb.webp`，
  前端会回退原图）

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
controllers/   # 控制器（article/blogger/comment/friendLink/messageBoard/emoji/emojiGroup/errorLog/mail/...）
middleware/    # 认证、角色、限流、缓存、校验、请求体格式、错误处理、性能监控
models/        # 数据模型（Article/Blogger/Comment/FriendLink/MessageBoard/Emoji/ClientErrorLog/...）
routes/        # 路由（含 cache/metrics/emoji/error-log 运维接口）
scripts/       # 运维 / 迁移脚本（clearCache、verifyUploads、syncMeili、regenerateThumbs、...）
services/      # meilisearch、mailer、commentNotifier
utils/         # 分页、响应、图片转换、错误归类
test/          # 集成测试
```

## 运维脚本

`scripts/` 下的脚本都可直接 `node scripts/<name>.js` 执行，不影响运行中的服务：

> 这些脚本**只连 MySQL / Redis / Meilisearch，不依赖后端进程**，因此即使运行的是
> Spring Boot 后端，仍可在 `myblog-express/` 目录下执行。
> 其中 4 个在 Spring 侧有**等价工具**（`--spring.profiles.active=tool`，见
> [myblog-springboot/README.md](../myblog-springboot/README.md#运维工具tool-profile)）：
> `auditData` ↔ `--tool=audit`、`verifyUploads` ↔ `--tool=verify-uploads`、
> `syncMeili` ↔ `--tool=sync-meili`、`regenerateThumbs` ↔ `--tool=regenerate-thumbs`。

**只读体检（价值最高，随时可跑）**

- `auditData.js` — **数据层**体检：结构安全网（表 / 列 / 外键 / 唯一索引）、取值越界
  （`content_format` / `view_count` / 布尔设置）、语义完整性（跨文章父评论 / 三级嵌套 / 自环 /
  `reply_to_id` 跨文章）、计数与使用情况、异常值。`STRICT=1` 时**仅当有 error** 才退出码 1
- `verifyUploads.js` — **文件层**体检：6 类引用（设置图 / 友链头像 / 博主头像 / 表情图 /
  文章封面 / 正文图）× 5 个目录，查失联 + 多键共用同一图 + 孤儿文件。
  `STRICT=1` 时**含孤儿也算问题**。上传根目录固定为 `myblog-express/uploads`
  （不受工作目录影响）；另一端的 `UPLOAD_PATH` 必须指向同一份，否则本脚本会报大量失联

**运维动作**

- `clearCache.js` — 查看 / 按前缀清除 Redis 缓存（`--prefix=` / `--all` / `DRY_RUN=1`）
- `syncMeili.js` — Meilisearch 索引回填 / 重建（`REBUILD=1` 先删索引）
- `regenerateThumbs.js` — 为历史图片补生成 WebP 主图 / 缩略图变体
- `initBlogger.js` — 初始化博主账号（也有 `npm run init-blogger`）

**一次性历史迁移（新库直接导 `myblog-1.1.sql` 即可，不需在 Spring 侧重做）**

- `addUniqueNames.js` — 标签 / 分类重名合并 + 唯一索引（`DRY_RUN=1`）
- `addContentFormat.js` — 新增 `article.content_format` 列并回填
- `addMobileBgSettings.js` — 补移动端背景图设置键
- `migrateEmojiGroup.js` — 表情分组表迁移（建表 + 外键 + 枚举扩容）
- `removeSpamStatus.js` — 收敛评论 `spam` 状态（`--to=` 必填 / `DRY_RUN=1`，存量>0 且未传 `--to` 时**中止不动手**）
- `addNotifyEmailColumns.js` — 评论 / 留言订阅开关 `notify_email` + 回复目标 `reply_to_id`（`DRY_RUN=1`）

迁移类脚本均幂等、可重复执行；支持 `DRY_RUN` 的脚本会先打印将要执行的语句。

### 缓存清理

```bash
node scripts/clearCache.js                    # 列出全部 cache:* 键与 TTL（默认不删）
node scripts/clearCache.js --prefix=settings  # 按前缀清除（可传多个前缀）
node scripts/clearCache.js --all              # 清除全部
DRY_RUN=1 node scripts/clearCache.js --all    # 只预览、不删除
```

写接口（如 `PUT /settings/:key`）本身会 `await cache.invalidate()` 即时失效缓存，本脚本
面向「绕过应用层之后」的场景（例如直接改了数据库、或需要手动干预）。清缓存是安全的：
数据不丢，下次请求回源重建。需注意 `config/redis.js` 是 `lazyConnect`，未建立连接时
`keys` / `del` 会**静默失效**，所以脚本会先确保连接就绪，连不上就明确报错退出，
不会打印「已清除 0 条」造成误导。

> PowerShell 下预览：`$env:DRY_RUN=1; node scripts/clearCache.js --prefix=settings`

## 路由一览（前缀 `/api/v1`）

| 前缀 | 说明 |
| --- | --- |
| `/articles` `/types` `/labels` `/comments` | 内容 CRUD / 评论审核 |
| `/search` | 关键词搜索（优先 Meilisearch，失败降级 LIKE） |
| `/message-board` | 留言板 |
| `/friend-links` | 友链（含点击计数） |
| `/blogger` | 登录 / 公开资料 |
| `/settings` | 网站配置（含自定义 Key-Value） |
| `/upload` | 图片上传（WebP 变体） |
| `/dashboard` | 仪表盘 / 未读红点 |
| `/cache` | 缓存预热 / 统计 / 清空 |
| `/metrics` | 性能监控 |
| `/mail` | 邮件通知配置状态 / 测试发信（admin） |
| `/emoji` | 表情包管理 |
| `/emoji-groups` | 表情包分组管理 |
| `/error-log` | 前端错误上报 / 查看 / 清空 |

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `NODE_ENV` | 运行模式 | `development` |
| `PORT` | 服务端口 | `3000` |
| `LOG_LEVEL` | winston 日志级别（不填按环境推导） | — |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | 数据库连接 | — |
| `DB_TIME_ZONE` | 时间字段读时区（**固定偏移** `+08:00`/`Z`，必须与 MySQL 会话 `time_zone` 一致，详见根 README「时间字段与时区」） | `+08:00` |
| `DB_POOL_MAX` | 连接池上限（可选） | `50` |
| **`JWT_SECRET`** | JWT 密钥（生产必改） | — |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `BLOGGER_USERNAME` / `BLOGGER_PASSWORD` / `BLOGGER_NICKNAME` / `BLOGGER_EMAIL` | 默认博主 | — |
| `FRONTEND_ORIGIN` / `ADMIN_ORIGIN` | CORS 白名单 | — |
| `TRUST_PROXY` | 反向代理信任层级（限流按真实 IP） | `1` |
| `APP_BASE_URL` | 上传资源的对外基地址（拼入库的绝对地址 `<本项>/uploads/...`；不填回退 `http://localhost:<PORT>`） | — |
| `CACHE_PREHEAT` | 启动时预热缓存（设为 `false` 关闭） | `true` |
| `REDIS_URL` / `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` | Redis（可选，不配则降级） | — |
| `MEILI_HOST` / `MEILI_PORT` / `MEILI_MASTER_KEY` | Meilisearch（可选，不配则降级） | — |
| `SITE_URL` / `SITE_NAME` | 站点信息（邮件通知用） | — |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SMTP 邮件通知（可选；`SMTP_PASS` 填**授权码**而非登录密码；`SMTP_SECURE` 留空则按端口推导 465→ssl、587→starttls） | — |

其余说明见项目根目录 [README.md](../README.md)。

