# MyBlog — Spring Boot 后端

MyBlog 的 Java 后端实现（与 `myblog-express` 共用同一份数据库与接口契约，可按技术栈偏好选择部署；仍存在的差异见根目录 [README.md](../README.md) 的「双后端差异」）。提供 REST API，统一响应 `{ code, message, data }`，前缀 `/api/v1`。

## 技术栈

- **运行时**: Java / JDK 17+
- **框架**: Spring Boot 4.0.6 + Spring Security
- **ORM**: Spring Data JPA / Hibernate
- **数据库**: MySQL（mysql-connector-j）
- **认证**: JWT（jjwt）+ BCrypt
- **缓存**: Spring Data Redis + 内存降级（命中统计在 `CacheStatsService` + `CacheConfig` 的装饰层 Cache `CacheManager` 上）
- **文件上传**: MultipartFile + webp-imageio（生成 WebP 变体）
- **全文搜索**: Meilisearch（不可用自动降级）
- **邮件通知**: spring-boot-starter-mail（未配置 SMTP 自动降级）
- **监控**: Actuator + Micrometer / Prometheus
- **校验**: Jakarta Validation
- **测试**: Spring Boot Test

## 功能概览

- 文章 / 分类 / 标签 / 友链 / 评论 / **留言板** CRUD
- **相关推荐 / 上一篇下一篇**、**批量改状态**、**关键词搜索**（Meilisearch，降级 SQL LIKE）
- **表情包管理与分组**、**仪表盘 / 未读红点**（`DashboardController`）、**前端错误日志聚合**（`/error-log`）
- Redis 缓存（预热 / 命中统计 / 一键清空）、性能监控 `/metrics`、健康检查 `/health`（字段与 Express 逐项对齐，含
  `meilisearch` / `mail` / `imageVariants` 的状态与原因）、Actuator 指标端点
- 图片上传并自动生成 WebP 变体
- **邮件通知 4 类**（无 SMTP 自动停用）：① 顶层评论 → 博主（创建即发）；② 回复 → 被回复者（**审核通过后**发一次）；③ 新留言 → 博主；④ 留言审核通过 → 留言者。②④ 的收件人需在提交时勾选「邮件通知我」（默认**不勾**，见 `comment.notify_email` / `message_board.notify_email`）

> ℹ️ 与 Express 端的差异（运维脚本、时间字段格式、`.env` 不共用等）见根目录 [README.md](../README.md) 的「双后端差异」。

## 快速开始

### 1. 启动前配置

数据库连接通过环境变量注入，或编辑 `src/main/resources/application.yml`：

```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=myblog
export DB_USER=root
export DB_PASSWORD=yourpassword
export JWT_SECRET=your-secret-key-change-in-production
```

```bash
# 初始化数据库
mysql -u root -p myblog < ../myblog-express/myblog-1.1.sql
```

### 2. 运行

```bash
./mvnw spring-boot:run        # http://localhost:3000
```

### 3. 打包与生产运行

```bash
./mvnw package -DskipTests
java -jar target/myblog-springboot-0.0.1-SNAPSHOT.jar
```

### 4. 测试 / 编译校验

```bash
./mvnw test
./mvnw -q compile
```

> 注意：VS Code Java 分析器可能误报 `instanceof` 模式匹配/unboxing，实际以 `./mvnw -q compile` 为准。

## 运维工具（tool profile）

Spring 侧内置 4 个运维工具，用 **`tool` profile** 运行：不启 Web 容器、不占端口，
跑完即退出（退出码可用于 CI）。

```bash
java -jar target/myblog-springboot-0.0.1-SNAPSHOT.jar --spring.profiles.active=tool --tool=list
```

| `--tool=` | 对应 Express 脚本 | 作用 | 是否写数据 |
| --- | --- | --- | --- |
| `audit` | `scripts/auditData.js` | **数据层体检**：结构安全网（表/列/外键/唯一索引）、取值越界、语义完整性（跨文章父评论 / 三级嵌套 / 自环 / `reply_to_id`）、计数与使用情况、异常值 | 只读 |
| `verify-uploads` | `scripts/verifyUploads.js` | **文件层体检**：6 类引用（设置图 / 友链头像 / 博主头像 / 表情图 / 文章封面 / 正文图）× 5 个目录，查失联 + 多键共用同一图 + 孤儿文件 | 只读 |
| `sync-meili` | `scripts/syncMeili.js` | Meilisearch 索引**全量回填**（历史文章不会自动入索引） | 写索引 |
| `regenerate-thumbs` | `scripts/regenerateThumbs.js` | 为历史图片补生成 `.webp` 主图 / `_thumb.webp` 缩略图 | 写文件 |

通用选项：`--strict`（有问题时退出码 1）、`--path=<dir>`（覆盖 uploads 根目录，
默认取 `app.upload.path`）、`--rebuild`（仅 `sync-meili`：先删索引再重建）。

几个使用要点：

- **退出码**：`0` 正常 / `1` 工具自身失败或（带 `--strict` 时）检出问题 / `2` 用法错误
  （未指定 `--tool` 或工具名写错）。未指定工具时会打印帮助。
- **`tool` 模式下会跳过博主初始化**，保证 `audit` / `verify-uploads` 声称的「只读」是真的。
- **中文输出**：Java 17 在中文 Windows 上默认按 GBK 输出控制台。想看到正常中文
  请用 PowerShell 7（默认 UTF-8）或先 `chcp 65001`；也可加
  `-Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8`。
- `sync-meili --rebuild` 会**先删索引**，删到重建之间有短暂的空窗期（搜索会降级），
  生产上建议在低峰执行。
- 两个体检工具的工作方式与 Express 侧一致：**只查 DB 约束管不到的东西**
  （外键能保证的引用存在性不再重复查，改为校验约束本身是否还在）。

## 主要目录

```
src/main/java/com/myblog/myblogspringboot/
├── config/       # Security、CORS、缓存（统计 / 响应头 / 限流）、初始化
├── controller/   # 控制器（Article、Comment、Emoji、MessageBoard、Dashboard、Cache、Health、Upload...）
├── dto/          # 请求/响应 DTO
├── entity/       # JPA 实体（Article/Comment/FriendLink/Emoji/MessageBoard/...）
├── exception/    # 全局异常处理
├── repository/   # Spring Data JPA Repository
├── security/     # JWT Token 认证
├── service/      # 业务逻辑（含 Mail/评论通知/缓存统计）
└── tool/         # 运维工具（tool profile；audit / verify-uploads / sync-meili / regenerate-thumbs）
```

## 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | 服务端口 | `3000` |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | 数据库连接 | — |
| `APP_TIME_ZONE` | 时间字段源时区（IANA 名称，必须与数据库写入端时区一致，详见根 README「时间字段与时区」） | `Asia/Shanghai` |
| **`JWT_SECRET`** | JWT 密钥（生产必改） | — |
| `JWT_EXPIRES_IN` | Token 有效期（**毫秒**） | `604800000`（7天） |
| `BLOGGER_USERNAME` / `BLOGGER_PASSWORD` / `BLOGGER_NICKNAME` / `BLOGGER_EMAIL` | 默认博主 | — |
| `FRONTEND_ORIGIN` / `ADMIN_ORIGIN` | CORS 白名单 | — |
| `UPLOAD_PATH` | 上传文件目录（**必须与另一端的 uploads 指向同一份**；本机同时跑 Express 时填 `../myblog-express/uploads`） | `uploads` |
| `MEILI_HOST` / `MEILI_PORT` / `MEILI_MASTER_KEY` | Meilisearch | — |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` | Redis 缓存 | — |
| `SITE_URL` / `SITE_NAME` | 站点信息（邮件通知用） | — |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SMTP 邮件通知（可选；`SMTP_PASS` 填**授权码**而非登录密码；`SMTP_SECURE` 留空则按端口推导 465→ssl、587→starttls） | — |

监控端点：`/actuator/health`、`/actuator/metrics`、`/actuator/prometheus`。

> ⚠️ `JWT_EXPIRES_IN` 与 Express 格式不同：Express 是时长字符串（`7d`），本端是毫秒数（`604800000`）——**两端不能共用同一份 `.env`**，否则本端启动报 `Failed to convert value of type 'java.lang.String' to required type 'long'`。

> **提示**：运维脚本（清缓存 / 数据体检 / 文件体检 / 回填索引等）仅在 `myblog-express/scripts/` 下提供；它们直连同一份 MySQL / Redis，可在该目录下直接执行。

其余说明见项目根目录 [README.md](../README.md)。

