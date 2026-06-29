# 🐳 myblog Docker 部署指南

本文档介绍如何使用 Docker Compose 一键部署 myblog 全栈博客系统。

---

## 📋 目录

- [架构概览](#架构概览)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [后端切换](#后端切换)
- [常用命令](#常用命令)
- [数据持久化](#数据持久化)
- [生产环境建议](#生产环境建议)
- [故障排查](#故障排查)

---

## 架构概览

```
┌──────────────────────────────────────────────┐
│                   Docker Host                 │
│                                               │
│  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │  :3001   │  │  :3002   │  │   :3000    │ │
│  │  Nuxt    │  │  Vue 3   │  │  Express/  │ │
│  │  Blog    │  │  Admin   │  │  SpringBoot│ │
│  │  (SSR)   │  │  (SPA)   │  │  (API)     │ │
│  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
│       │             │              │          │
│       └──────────┬──┘              │          │
│                  │      ┌──────────┼──────┐   │
│                  │      │    :3307 │ :6379│   │
│                  │      │  ┌───────┴──┐   │   │
│                  └──────┼──┤ MySQL 8  │   │   │
│                         │  └──────────┘   │   │
│                         │  ┌──────────┐   │   │
│                         └──┤ Redis 7  │   │   │
│                            └──────────┘   │   │
└──────────────────────────────────────────────┘
```

| 服务             | 技术栈                | 内部端口 | 默认映射端口 | 说明          |
| ---------------- | --------------------- | -------- | ------------ | ------------- |
| `myblog-backend` | Express / Spring Boot | 3000     | 3000         | REST API 服务 |
| `myblog-blog`    | Nuxt 3 SSR            | 3001     | 3001         | 博客前台页面  |
| `myblog-admin`   | Vue 3 + Nginx         | 80       | 3002         | 管理后台 SPA  |
| `mysql`          | MySQL 8.0             | 3306     | 3307         | 数据库        |
| `redis`          | Redis 7               | 6379     | 6379         | 缓存服务      |

> **注意**：MySQL 宿主机端口映射为 `3307`，避免与本地已安装的 MySQL 冲突。可在 `.env.docker` 中修改。

---

## 环境要求

| 软件           | 最低版本 |
| -------------- | -------- |
| Docker         | 24.0+    |
| Docker Compose | v2.20+   |
| 可用内存       | ≥ 2 GB   |
| 可用磁盘       | ≥ 5 GB   |

---

## 快速开始

### 1. 克隆项目并进入目录

```bash
cd myblog
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.docker.example .env.docker

# 编辑配置（必须修改数据库密码和 JWT 密钥！）
vim .env.docker
```

**必须修改的配置项：**

```env
DB_PASSWORD=your-strong-password-here
JWT_SECRET=change-me-to-a-random-string-at-least-32-chars
```

### 3. 构建并启动所有服务

```bash
docker compose --env-file .env.docker up -d --build
```

首次构建大约需要 **3-8 分钟**（取决于网络速度）。构建完成后自动启动所有容器。

### 4. 验证服务状态

```bash
docker compose ps
```

预期所有服务状态均为 `Up`（healthy）：

```
NAME              STATUS
myblog-mysql      Up (healthy)
myblog-redis      Up (healthy)
myblog-backend    Up
myblog-blog       Up
myblog-admin      Up
```

### 5. 访问服务

| 服务        | 地址                                                         |
| ----------- | ------------------------------------------------------------ |
| 📝 博客前台 | [http://localhost:3001](http://localhost:3001)               |
| ⚙️ 管理后台 | [http://localhost:3002](http://localhost:3002)               |
| 🔌 API 接口 | [http://localhost:3000/api/v1](http://localhost:3000/api/v1) |
| 💚 健康检查 | [http://localhost:3000/health](http://localhost:3000/health) |

### 6. 初始化博主账号（仅 Express 后端自动完成）

如果是首次启动，Express 后端会自动创建博主账号。默认凭据：

| 用户名  | 密码       |
| ------- | ---------- |
| `admin` | `admin123` |

⚠️ **登录后请立即修改默认密码！**

---

## 配置说明

### 环境变量完整列表

所有环境变量在 `.env.docker` 文件中配置。

#### 数据库

| 变量          | 说明            | 默认值   |
| ------------- | --------------- | -------- |
| `DB_PASSWORD` | MySQL root 密码 | **必填** |
| `DB_NAME`     | 数据库名称      | `myblog` |
| `DB_PORT`     | 宿主机映射端口  | `3307`   |

#### 缓存

| 变量             | 说明                      | 默认值 |
| ---------------- | ------------------------- | ------ |
| `REDIS_PASSWORD` | Redis 密码（留空=无密码） | 空     |
| `REDIS_PORT`     | 宿主机映射端口            | `6379` |

#### 安全

| 变量             | 说明         | 默认值                    |
| ---------------- | ------------ | ------------------------- |
| `JWT_SECRET`     | JWT 签名密钥 | `change-me-in-production` |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d`                      |

#### 服务端口

| 变量           | 说明               | 默认值 |
| -------------- | ------------------ | ------ |
| `BACKEND_PORT` | API 服务宿主机端口 | `3000` |
| `BLOG_PORT`    | 博客前台端口       | `3001` |
| `ADMIN_PORT`   | 管理后台端口       | `3002` |

#### 前端配置

| 变量              | 说明                    | 默认值                              |
| ----------------- | ----------------------- | ----------------------------------- |
| `NUXT_API_BASE`   | 博客调用的 API 地址     | `http://myblog-backend:3000/api/v1` |
| `NUXT_SITE_URL`   | 站点公开 URL            | `http://localhost:3001`             |
| `VITE_API_BASE`   | 管理后台调用的 API 地址 | `http://myblog-backend:3000/api/v1` |
| `FRONTEND_ORIGIN` | CORS 允许的博客域名     | `http://localhost:3001`             |
| `ADMIN_ORIGIN`    | CORS 允许的后台域名     | `http://localhost:3002`             |

---

## 后端切换

本项目支持两种后端，**默认使用 Express**。

### 切换到 Spring Boot

编辑 `docker-compose.yml`，**注释掉** Express 配置段，**取消** Spring Boot 配置段的注释：

```yaml
services:
  # 注释掉这一段 ↓
  # myblog-backend:
  #   build:
  #     context: ./myblog-express
  #     ...

  # 取消这一段注释 ↓
  myblog-backend:
    build:
      context: ./myblog-springboot
      dockerfile: Dockerfile
    # ...
```

然后重新构建：

```bash
docker compose --env-file .env.docker build myblog-backend --no-cache
docker compose --env-file .env.docker up -d
```

> **注意**：Spring Boot 镜像构建时间较长（需下载 Maven 依赖），请耐心等待。

---

## 常用命令

### 服务管理

```bash
# 启动所有服务
docker compose --env-file .env.docker up -d

# 停止所有服务
docker compose down

# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart myblog-backend

# 查看日志（实时跟踪）
docker compose logs -f

# 查看单个服务日志
docker compose logs -f myblog-backend

# 查看最近 100 行日志
docker compose logs --tail=100
```

### 重新构建

```bash
# 修改代码后重新构建并启动
docker compose --env-file .env.docker up -d --build

# 仅重新构建某个服务
docker compose --env-file .env.docker build myblog-backend --no-cache
docker compose --env-file .env.docker up -d myblog-backend
```

### 进入容器调试

```bash
# 进入 Express 后端容器
docker compose exec myblog-backend sh

# 进入 MySQL 容器
docker compose exec mysql mysql -uroot -p

# 进入 Redis 容器
docker compose exec redis redis-cli
```

### 数据库操作

```bash
# 备份数据库
docker compose exec mysql mysqldump -uroot -p myblog > backup.sql

# 恢复数据库
docker compose exec -T mysql mysql -uroot -p myblog < backup.sql
```

---

## 数据持久化

Docker Compose 定义了 3 个命名数据卷，容器删除后数据不会丢失：

| 数据卷         | 路径             | 说明                       |
| -------------- | ---------------- | -------------------------- |
| `mysql-data`   | MySQL 数据目录   | 文章、评论、用户等全部数据 |
| `redis-data`   | Redis 持久化文件 | 缓存数据                   |
| `uploads-data` | 上传文件目录     | 文章封面、头像、站点图片   |

```bash
# 查看数据卷
docker volume ls | grep myblog

# 删除全部数据卷（⚠️ 不可恢复！）
docker compose down -v
```

---

## 生产环境建议

### 1. 使用反向代理

推荐在容器前放置 **Nginx** 或 **Traefik** 作为反向代理，统一处理 SSL 终止、域名绑定和静态资源缓存。

示例 Nginx 配置：

```nginx
server {
    listen 443 ssl http2;
    server_name blog.example.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 博客前台
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 管理后台
    location /admin/ {
        proxy_pass http://127.0.0.1:3002/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. 安全加固

- ✅ 修改 `.env.docker` 中所有默认密码和密钥
- ✅ 使用 `openssl rand -hex 32` 生成强随机 JWT 密钥
- ✅ 限制端口暴露：如果使用反向代理，可移除 `docker-compose.yml` 中 `myblog-blog` 和 `myblog-admin` 的 `ports` 映射
- ✅ 定期备份数据库：设置 cron 定时执行 `mysqldump`
- ✅ 启用防火墙：仅开放 80/443 端口

### 3. 资源限制

在 `docker-compose.yml` 中为每个服务添加资源限制：

```yaml
services:
  myblog-backend:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### 4. 日志管理

```yaml
services:
  myblog-backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 故障排查

### 1. 容器无法启动

```bash
# 查看所有容器状态
docker compose ps -a

# 查看构建日志
docker compose logs myblog-backend

# 查看容器退出原因
docker inspect myblog-backend | grep -A 10 State
```

### 2. 数据库连接失败

常见原因：

- MySQL 容器未就绪（等待 `healthy` 状态）
- 数据库密码不匹配
- 端口冲突（本地已运行 MySQL）

```bash
# 检查 MySQL 是否就绪
docker compose exec mysql mysqladmin ping -h localhost -uroot -p

# 检查端口占用
netstat -ano | findstr 3307
```

### 3. 前端页面 502/504

可能是 Nuxt 博客 SSR 构建时未正确注入 API 地址：

```bash
# 重新构建博客前端
docker compose --env-file .env.docker build myblog-blog --no-cache
docker compose --env-file .env.docker up -d myblog-blog
```

### 4. 上传文件不显示

确保 `uploads-data` 卷已正确挂载：

```bash
# 检查上传目录
docker compose exec myblog-backend ls -la /app/uploads
```

### 5. 完全重置

```bash
# 停止并删除所有容器、网络、数据卷
docker compose down -v

# 清理构建缓存
docker builder prune -a -f

# 重新构建
docker compose --env-file .env.docker up -d --build
```

---

## 项目文件清单

```
myblog/
├── docker-compose.yml          # Docker Compose 编排文件
├── .env.docker.example         # 环境变量模板
├── DEPLOY.md                   # 本文档
├── myblog-express/
│   ├── Dockerfile              # Express 后端镜像
│   └── .dockerignore
├── myblog-springboot/
│   └── Dockerfile              # Spring Boot 后端镜像
├── myblog-vue/
│   ├── myblog-blog/
│   │   └── Dockerfile          # Nuxt 博客前端镜像
│   └── myblog-admin/
│       ├── Dockerfile          # Vue 管理后台镜像
│       └── nginx.conf          # Nginx 配置
└── myblog-express/
    └── myblog-1.1.sql          # 数据库初始化脚本
```
