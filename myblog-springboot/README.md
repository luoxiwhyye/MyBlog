# MyBlog — Spring Boot 后端

MyBlog 的 Java 后端实现（与 `myblog-express` 功能等价，可按技术栈偏好选择部署）。提供 REST API，统一响应 `{ code, message, data }`，前缀 `/api/v1`。

## 技术栈

- **运行时**: Java / JDK 17+
- **框架**: Spring Boot 4.0.6 + Spring Security
- **ORM**: Spring Data JPA / Hibernate
- **数据库**: MySQL（mysql-connector-j）
- **认证**: JWT（jjwt）+ BCrypt
- **缓存**: Spring Data Redis + 内存降级（`CacheStatsService` + `CountingCacheInterceptor` 统计命中率）
- **文件上传**: MultipartFile + webp-imageio（生成 WebP 变体）
- **邮件通知**: spring-boot-starter-mail（未配置 SMTP 自动降级）
- **监控**: Actuator + Micrometer / Prometheus
- **校验**: Jakarta Validation
- **测试**: Spring Boot Test

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

## 主要目录

```
src/main/java/com/myblog/myblogspringboot/
├── config/       # Security、CORS、缓存统计拦截器、限流、初始化
├── controller/   # REST API（含 cache 运维接口）
├── dto/          # 请求/响应 DTO
├── entity/       # JPA 实体（Article/Comment/FriendLink/...）
├── exception/    # 全局异常处理
├── repository/   # Spring Data JPA Repository
├── security/     # JWT Token 认证
└── service/      # 业务逻辑（含 Mail/评论通知/缓存统计）
```

## 环境变量

| 变量                                                                           | 说明                   | 默认值             |
| ------------------------------------------------------------------------------ | ---------------------- | ------------------ |
| `PORT`                                                                         | 服务端口               | `3000`             |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`                  | 数据库连接             | —                  |
| **`JWT_SECRET`**                                                               | JWT 密钥（生产必改）   | —                  |
| `JWT_EXPIRES_IN`                                                               | Token 有效期（毫秒）   | `604800000`（7天） |
| `BLOGGER_USERNAME` / `BLOGGER_PASSWORD` / `BLOGGER_NICKNAME` / `BLOGGER_EMAIL` | 默认博主               | —                  |
| `FRONTEND_ORIGIN` / `ADMIN_ORIGIN`                                             | CORS 白名单            | —                  |
| `UPLOAD_PATH`                                                                  | 上传文件目录           | `uploads`          |
| `MEILI_HOST` / `MEILI_PORT` / `MEILI_MASTER_KEY`                               | Meilisearch            | —                  |
| `SITE_URL` / `SITE_NAME`                                                       | 站点信息（邮件通知用） | —                  |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`                          | SMTP 邮件通知（可选）  | —                  |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB`                    | Redis 缓存             | —                  |

监控端点：`/actuator/health`、`/actuator/metrics`、`/actuator/prometheus`。

其余说明见项目根目录 [README.md](../README.md)。
