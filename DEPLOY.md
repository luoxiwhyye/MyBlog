# myblog Docker 部署指南

本文档介绍如何使用 Docker Compose 一键部署 myblog 全栈博客系统。

---

## 目录

- [架构概览](#架构概览)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [上线前检查清单](#上线前检查清单)
- [配置说明](#配置说明)
- [后端切换](#后端切换)
- [常用命令](#常用命令)
- [数据持久化](#数据持久化)
- [生产环境建议](#生产环境建议)
- [上线首日速查](#上线首日速查)
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

仓库是公开的，**在服务器上直接克隆即可**，不需要凭据：

```bash
# 服务器没装 git 时先装（Ubuntu / Debian；CentOS 用 yum install -y git）
sudo apt install -y git

git clone https://github.com/luoxiwhyye/MyBlog.git myblog
cd myblog

# 默认分支就是部署分支（v2-myblog），无需切换
git branch --show-current      # 应输出 v2-myblog
```

> 想省流量可以用浅克隆：`git clone --depth 1 <地址> myblog`（约 3 MB）。
> 浅克隆一样能 `git pull`，只是看不到完整历史。
>
> ⚠️ **`.env.docker` 不在仓库里**（含密钥，已被 `.gitignore` 排除），
> 克隆后需要从模板创建一份 —— 见下一步。
>
> 💡 **不要在服务器上直接改源码**：更新方式就是 `git pull`，本地有未提交改动时会冲突。
> 想调整行为优先改 `.env.docker` 或走后台界面。

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.docker.example .env.docker

# 编辑配置（必须修改数据库密码和 JWT 密钥！）
vim .env.docker
```

> **仓库里有 5 个 `.env` 模板，Docker 部署只需要根目录那一个** —— 别顺手把其余 4 个也填了：
>
> | 文件 | 用途 | Docker 部署要不要动 |
> | ---- | ---- | ------------------- |
> | `.env.docker.example`（根目录） | **Docker 部署的全部配置** | ✅ 复制成 `.env.docker` 后逐项填 |
> | `myblog-express/.env.example` | 本地跑 `npm run dev` 用（不用 Docker 开发时） | ❌ 不用创建 |
> | `myblog-springboot/.env.example` | 同上（Spring 侧） | ❌ 不用创建 |
> | `myblog-vue/myblog-blog/.env.example` | 同上（前台 dev server） | ❌ 不用创建 |
> | `myblog-vue/myblog-admin/.env.example` | 同上（后台 dev server） | ❌ 不用创建 |
>
> 原因是**注入方式不同**：Docker 部署时 `docker-compose.yml` 把变量以 `environment:`
> 直接传进容器（前端的 `NUXT_*` / `VITE_*` 走构建参数），容器里根本不需要 `.env` 文件；
> 而那 4 个子项目的 `.env` 只服务于本机 `npm run dev`。
>
> 容器里**不会**带本地 `.env`：三个构建上下文都有 `.dockerignore` 排除 `.env*`（express / blog / admin），
> Spring 侧由显式 `COPY` + 新增的 `.dockerignore` 保证。想验证可以看
> `docker compose exec myblog-backend ls -a /app`（不应出现 `.env`）。

配置改完后可以先用自检脚本过一遍 —— 它会指出「漏配后容器照样能起、但功能是坏的」那些项
（密钥仍是模板值 / 地址填成容器服务名 / 时区不同区 / SMTP 缺项 / `SITE_URL` 收信人打不开 等）：

```bash
node scripts/preflight.mjs                 # 退出码 0 = 无阻断项；有问题会逐条给出改法
```

**必须修改的配置项：**

```env
# 安全类（生产环境必改）
DB_PASSWORD=your-strong-password-here
JWT_SECRET=change-me-to-a-random-string-at-least-32-chars
MEILI_MASTER_KEY=your-random-meili-key

# 博主初始口令（空库首启会用它创建账号；默认 admin123 等同无密码）
BLOGGER_PASSWORD=your-strong-password-here

# 博主邮箱（默认 admin@example.com 是保留域名、无 MX 记录，通知必退信）
BLOGGER_EMAIL=you@example.com

# 地址类：按「是否用反向代理」二选一，详见「配置说明 → 站点信息」
# ① 反向代理部署（推荐）：
VITE_API_BASE=/api/v1
APP_BASE_URL=https://blog.example.com
SITE_URL=https://blog.example.com
FRONTEND_ORIGIN=https://blog.example.com
ADMIN_ORIGIN=https://admin.example.com
BIND_ADDR=127.0.0.1
# ② IP 直连部署（无反向代理）：VITE_API_BASE=http://<服务器IP>:3000/api/v1、
#    APP_BASE_URL=http://<服务器IP>:3000、BIND_ADDR=0.0.0.0（并在安全组只放行必要端口）
```

> 生成随机串：`openssl rand -hex 32`（**每个密钥各跑一次**，包括 `BLOGGER_PASSWORD`）。
> ⚠️ 密码里避免 `$`、`&`、`#` 等字符，它们在 `.env.docker` 的 shell 解析里会出问题，
> 典型表现是 `myblog-mysql` 一直不 healthy。

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
NAME                STATUS
myblog-mysql        Up (healthy)
myblog-redis        Up (healthy)
myblog-meilisearch  Up (healthy)
myblog-backend      Up
myblog-blog         Up
myblog-admin        Up
myblog-backup       Up
```

> `myblog-backend` 会等 mysql / redis `healthy` 之后才启动（`depends_on` 的
> `condition: service_healthy`），所以头一分钟它可能还是 `Created`，属正常。

### 5. 访问服务

| 服务        | 地址                                                         |
| ----------- | ------------------------------------------------------------ |
| 博客前台 | [http://localhost:3001](http://localhost:3001)               |
| 管理后台 | [http://localhost:3002](http://localhost:3002)               |
| API 接口 | [http://localhost:3000/api/v1](http://localhost:3000/api/v1) |
| 健康检查 | [http://localhost:3000/health](http://localhost:3000/health) |

部署完成后跑一遍冒烟自检（健康分块 / 关键接口 / SSR 页面 / SEO 域名 / 未登录访问管理端接口是否被拦）：

```bash
node scripts/smoke.mjs --base=https://blog.example.com --admin=https://admin.example.com
```

> ⚠️ 端口默认只绑回环（`BIND_ADDR=127.0.0.1`），所以上面这些地址**只能在服务器本机访问**，
> 从外网要靠 Nginx 反代（见 `nginx.conf`）。若你用的是「无反向代理、IP 直连」部署
> （`BIND_ADDR=0.0.0.0`），冒烟时把 `--base` 换成 `http://<服务器IP>:3001`、`--admin` 换成 `http://<服务器IP>:3002`。

### 6. 初始化博主账号（两端均会自动完成）

如果是首次启动，后端会自动创建博主账号（Express 的 `utils/initBlogger.js` / Spring 的
`BlogInitRunner`），用户名与口令取 `.env.docker` 的 `BLOGGER_USERNAME` / `BLOGGER_PASSWORD`。

> ⚠️ **口令必须在首次启动前就设置好**：`BLOGGER_PASSWORD` 只在「创建博主」时生效，
> 库里已有博主时改 `.env` 没有任何效果（要改就去后台「个人资料」）。
> 模板默认值是 `admin123` —— 等同于无密码，`scripts/preflight.mjs` 会把它列为阻断项。

---

## 上线前检查清单

> 逐条打勾；**任何一条标 [阻断] 的没通过，就不要上线**（或书面记下接受风险的理由）。
> 标 [服务器] 的只能在服务器上做，其余在本机就能完成。

### 一、配置与密钥

- [ ] **[阻断]** `.env.docker` 里 `JWT_SECRET` / `DB_PASSWORD` / `MEILI_MASTER_KEY` / `BLOGGER_PASSWORD` 都已换成随机值
      （`openssl rand -hex 32`，每个各跑一次）。默认值写在本公开仓库里，不改等于任何人都能签发管理员 token。
- [ ] **[阻断]** `node scripts/preflight.mjs` 输出 **0 阻断**。它会逐项检查：
      密钥是否仍是模板值、地址类是否填了容器服务名、时区四项是否同区、SMTP 是否缺项、
      `SITE_URL` 收信人能否打开（复用后端自己的判定口径，不是另写一套）。
- [ ] 密码里没有 `$` `&` `#`（这三个字符在 `.env.docker` 的 shell 解析里会出问题，典型表现是 mysql 一直不 healthy）。
- [ ] **只填了根目录的 `.env.docker`** —— 子项目的 4 个 `.env.example` 是本地 `npm run dev` 用的，
      Docker 部署不需要创建（配置由 compose 直接注入容器）。
- [ ] `.env.docker` 的权限是 `600`，且 `git status` 里看不到它（`.gitignore` 已覆盖）。

### 二、地址类（配错的表现全是「页面能开、功能静默坏」）

- [ ] **[阻断]** `VITE_API_BASE=/api/v1`（反代同源）。填容器服务名会让后台「能开页面、一登录就转圈」。
- [ ] **[阻断]** `APP_BASE_URL` 是站点域名。不填时新上传的图会以 `http://localhost:3000/...` 入库，
      前台看不出来，但**后台的封面 / 头像 / 表情会全部裂掉**。
- [ ] **[阻断]** `SITE_URL` 是**收信人能打开**的地址（邮件里链接的前缀）。
- [ ] `FRONTEND_ORIGIN` / `ADMIN_ORIGIN` 与页面实际 origin **逐字一致**（含 scheme，末尾不要斜杠）。
- [ ] **[阻断]** 后台用**独立域名**，不是 `博客域名/admin` 子路径（它的构建未设 Vite `base`）。
- [ ] **[阻断]** `TRUST_PROXY=1`（Nginx 一跳反代）。填 `0` 会让所有访客共用一个限流桶，正常浏览也被 429。
- [ ] 改完 `NUXT_SITE_URL` / `VITE_API_BASE` 后**重新构建过前端镜像**（只 `up -d` 不生效）。

### 三、对外暴露面

- [ ] **[阻断]** **[服务器]** 从**外网**（手机 4G，不要用服务器自己）扫端口，
      只应看到 22（限来源 IP）/ 80 / 443：
      `nmap -Pn -p 22,80,443,3000,3001,3002,3307,6379,7700 <服务器IP>`
      （compose 默认已把其余端口绑在回环，此项是确认它真的生效）
- [ ] **[阻断]** **[服务器]** HTTPS 生效：`curl -sI https://<域名>` 返回 200 且有 HSTS；`http://` 自动 301 到 `https://`；
      证书剩余有效期 > 30 天，**且自动续期已启用**。
- [ ] **[服务器]** 后台域名的 `/api/` 能正确转发（配错时接口返回的是 index.html，表现为登录转圈）。

### 四、数据与备份

- [ ] **[阻断]** **[服务器]** 起库后核对结构：`article.comment_enabled` 为 `tinyint(1) NOT NULL DEFAULT 1`
      （默认值必须是 **1**，为 0 会让全站评论区集体消失）。
- [ ] **[阻断]** **[服务器]** `node scripts/auditData.js`（在 `myblog-express/` 下）报 **`[error] 0`**。
- [ ] **[阻断]** **[服务器]** `node scripts/verifyUploads.js` 的「失联」为 **0**。
- [ ] **[阻断]** **[服务器]** **备份能跑通且能恢复**（只看到备份文件不算）：
      ```bash
      docker compose exec myblog-backup bash /scripts/backup.sh           # 备份 + 校验和
      docker compose exec myblog-backup bash /scripts/verify-backup.sh    # gzip + sha256 双校验
      docker compose exec myblog-backup bash /scripts/backup-uploads.sh   # 图片备份（不在数据库里）
      ```
      再**真恢复一次**：建一个临时库 → `DB_NAME=<临时库> CONFIRM=1 bash /scripts/restore.sh <备份>` →
      比对表数与关键行数。`restore.sh` **不会创建目标库**，要先 `CREATE DATABASE`。
- [ ] **[阻断]** **[服务器]** 备份**出了机器**：用 `rclone lsd <远端>:` 验证凭据后实跑一次备份，
      确认对象存储里真的多出文件（`RCLONE_REMOTE` 没配或同步失败时备份任务会返回非 0，不会静默）。
- [ ] **[服务器]** 定时任务已注入：`docker compose exec myblog-backup cat /etc/crontabs/root` 应有两行（DB + 图片）。
- [ ] **[服务器]** 磁盘余量 > 20%，且容器日志有轮转（compose 已配 `max-size: 10m` / `max-file: 3`）。

### 五、功能可用性（用**真实浏览器 + 真实域名 + HTTPS**）

- [ ] **[阻断]** **[服务器]** `node scripts/smoke.mjs --base=https://<博客域名> --admin=https://<后台域名>` **0 阻断**。
      它检查健康检查各分块、关键接口、SSR 页面、`og:image` / canonical 是否用站点域名、上传路由、以及未登录访问管理端接口是否被拦。
- [ ] **[阻断]** 健康检查五块全绿：`curl -s https://<博客域名>/health`
      （`database` / `redis` / `meilisearch` / `mail` / `imageVariants`；`mail` 显示 `disabled` 且你确实不打算发信时可接受）
- [ ] **[阻断]** 后台能登录、能上传一张图并**立即回读**（能显示 = `APP_BASE_URL` 正确）。
- [ ] **[阻断]** 邮件「测试发信」**真实收到**（后台「系统设置 · 邮件通知」），且该页**没有告警条**
      （`siteUrlWarning` / `recipientWarning` 都为空）。
- [ ] 前台冒烟：首页 → 文章详情（目录 / 代码高亮 / 图片 / 相关推荐 / 上下篇）→ 分类 → 标签 → 归档 → 友链 → 留言板 → 关于 → 搜索 → 主题与语言切换。
- [ ] 后台冒烟：新建文章（含封面裁剪、分类、标签、**评论区开关**）→ 编辑 → 回收站 → 评论批量审核 → 留言 → 表情分组 → 系统设置各 Tab → 缓存运维页。
- [ ] 通知四类：顶层评论→博主 / 回复→被回复者（**审核通过后**才发，且订阅框默认不勾）/ 新留言→博主 / 留言审核通过→留言者。
- [ ] **[阻断]** **搜索真的走了 Meilisearch**：`/health` 的 `meilisearch.status = ok`。
      无密钥 / 错密钥都不影响 `/health` 返回 200，但索引操作会被 403 拒掉，结果是**静默降级成 SQL LIKE**（看着能用）。
- [ ] **图片变体真的在生成**：`/health` 的 `imageVariants.status = ok`；上传后磁盘上应有 `.webp` 与 `_thumb.webp`。
- [ ] **时间没有整体偏移**：比对同一篇文章在后台与前台显示的时间；
      `docker compose logs myblog-backend | grep -E "读时区|时区不一致"` 不应有告警。

### 六、合规与外显信息（用境内服务器 + 真域名必做）

- [ ] **[阻断]** 后台「基本设置」里的**备案号已填**，页脚能正常渲染出来
      （未配置时前台 `SiteIcp` 组件不渲染 —— 不报错，但合规上必须有）。
- [ ] 页脚显示的备案号与实际备案主体、域名一致（含是否带 `www`）。
- [ ] 做过公安联网备案的，同样在页脚挂出（链接到 `beian.mps.gov.cn`）。
- [ ] 评论与留言是**审核制**（本项目默认如此，确认没被改成自动通过）。
- [ ] 「关于我」页有能联系到站长的方式（备案要求，也是邮件通知的兜底）。
- [ ] 80 / 443 两个端口都返回正常页面（接入商可能抽查）。

### 七、回滚准备

- [ ] 记录本次部署版本：git commit + 各镜像 digest（`docker images --digests`）+ 已执行的迁移脚本清单。
- [ ] 上一个可用镜像 / 备份点仍在。
- [ ] 回滚步骤**除你之外还有一个人读过**并能照着执行。

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

#### 时区（时间字段口径）

> 完整原理与四条约束见 [README「时间字段与时区」](./README.md#时间字段与时区)。

| 变量            | 说明                                      | 默认值          |
| --------------- | ----------------------------------------- | --------------- |
| `TZ`            | 全局时区：mysql 写库墙钟 + 各容器进程时区 | `Asia/Shanghai` |
| `DB_TIME_ZONE`  | Express 时间字段读时区（**固定偏移**）    | `+08:00`        |
| `APP_TIME_ZONE` | Spring Boot 时间字段源时区（IANA 名称）   | `Asia/Shanghai` |

> ⚠️ 这三项必须表示同一时区（`TZ` 同时管着 mysql 写库墙钟、后端进程时区与前台 SSR 直出时区）。不匹配**不会报错**，只会让时间字段整体偏移（典型 8 小时）；Express 启动时会自检并在日志里告警。
> ⚠️ **前台容器 `myblog-blog` 的 `TZ` 不能省**：SSR 直出时间按容器时区展开，容器为 UTC 时 SSR HTML 与浏览器水合结果可能跨天不一致。

#### 缓存

| 变量             | 说明                      | 默认值 |
| ---------------- | ------------------------- | ------ |
| `REDIS_PASSWORD` | Redis 密码（留空=无密码） | 空     |
| `REDIS_PORT`     | 宿主机映射端口            | `6379` |

#### 安全

| 变量             | 说明         | 默认值                    |
| ---------------- | ------------ | ------------------------- |
| `JWT_SECRET`     | JWT 签名密钥 | `change-me-in-production` |
| `JWT_EXPIRES_IN` | JWT 过期时间 | `7d`（Express 格式）      |

> ⚠️ `JWT_EXPIRES_IN` 两端格式不同：Express 是时长字符串（`7d`），Spring Boot 是毫秒数（`604800000`）——**切到 Spring Boot 时必须把 `.env.docker` 里的值改成毫秒**，详见下方「后端切换」。

#### 服务端口

| 变量           | 说明               | 默认值 |
| -------------- | ------------------ | ------ |
| `BACKEND_PORT` | API 服务宿主机端口 | `3000` |
| `BLOG_PORT`    | 博客前台端口       | `3001` |
| `ADMIN_PORT`   | 管理后台端口       | `3002` |
| `BIND_ADDR`    | 端口绑定地址       | `127.0.0.1` |

> `BIND_ADDR` 默认为 `127.0.0.1`：上述端口（以及 MySQL / Redis / Meilisearch 的端口）**只绑宿主机回环**，
> 只有同一台机器上的 Nginx 能访问 —— 否则 MySQL(root) / Redis(无密码) / Meilisearch 会直接暴露到公网。
> 仅当「没有反向代理、靠 IP 直连」时才改成 `0.0.0.0`，并且必须在云安全组 / 防火墙上只放行必要端口。

#### 前端配置

| 变量              | 说明                            | 默认值                              |
| ----------------- | ------------------------------- | ----------------------------------- |
| `NUXT_API_BASE`   | 博客调用的 API 地址（**容器内部**） | `http://myblog-backend:3000/api/v1` |
| `NUXT_SITE_URL`   | 站点公开 URL（canonical / sitemap / OG） | `http://localhost:3001`      |
| `VITE_API_BASE`   | 管理后台调用的 API 地址（**浏览器直连**） | `http://myblog-backend:3000/api/v1` |
| `FRONTEND_ORIGIN` | CORS 允许的博客域名             | `http://localhost:3001`             |
| `ADMIN_ORIGIN`    | CORS 允许的后台域名             | `http://localhost:3002`             |

> ⚠️ `NUXT_API_BASE` 与 `VITE_API_BASE` 的**使用方不同**：
> - `NUXT_API_BASE` 由**博客容器服务端**用来访问 API，填容器间服务名（`myblog-backend`）；
>   博客自带 `/api/v1/**` 代理，浏览器不需要直连后端，**不要改成公网域名**。
> - `VITE_API_BASE` 是**构建期写进后台 JS、由浏览器直连**的地址。填 `myblog-backend` 会
>   让后台能打开页面但一登录就转圈（浏览器解析不了容器服务名）。
>   - IP 直连部署→ `http://<服务器IP>:3000/api/v1`
>   - 走反向代理（同源）→ `/api/v1`
>
> 改 `NUXT_SITE_URL` / `VITE_API_BASE` 后**必须重新构建前端镜像**（`build myblog-blog myblog-admin`），
> 只 `up -d` 不会生效。

#### 站点信息

| 变量            | 说明                | 默认值                  |
| --------------- | ------------------- | ----------------------- |
| `SITE_URL`      | 邮件里链接的前缀（**必须是收信人能打开的地址**） | `http://localhost:3001` |
| `SITE_NAME`     | 邮件署名与主题里的站点名 | `MyBlog`            |
| `APP_BASE_URL`  | 拼入库的图片绝对地址前缀 `<本项>/uploads/...` | 空（回退 `http://localhost:<PORT>`） |

> ⚠️ **`APP_BASE_URL` 一定要填**。不填时上传会往库里写 `http://localhost:3000/uploads/...`：
> 博客前台渲染前会归一化，**页面看起来正常**；但后台是把库里的地址**直接绑到 `<img src>`** 的，
> 于是封面图、头像、表情图会全部裂掉。
> - IP 直连部署 → `http://<服务器IP>:3000`
> - 反向代理部署 → `https://blog.example.com`（博客会把 `/uploads/**` 代理到后端）
>
> 它只影响**新上传**的图，改完不需要重建前端；**存量行**（`article.cover_image` /
> `blogger.avatar` / `friend_link.avatar` / `setting.setting_value` / `emoji.content`）
> 需要用 SQL 回填（先备份，先 `SELECT` 确认范围）。

#### 反向代理

| 变量          | 说明                                            | 默认值 |
| ------------- | ----------------------------------------------- | ------ |
| `TRUST_PROXY` | 信任右起 N 跳代理，只认 `X-Forwarded-For`；`0` = 不信任转发头 | `1` |

> 限流 / 评论入库 / 留言入库都靠它取真实访客 IP。配错（比如反代了却填 `0`）会让
> 所有访客共用一个限流桶，正常浏览也会被 429。

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

> ⚠️ 切换后端前先把 `.env.docker` 的 `JWT_EXPIRES_IN` 改为**毫秒数**（如 `604800000`）——Express 用的 `7d` 会让 Spring Boot 启动报 `Failed to convert value of type 'java.lang.String' to required type 'long'`。其余环境变量两端一致。

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

### 备份 · 校验 · 恢复（数据库 + 图片，完整闭环）

推荐使用仓库内置脚本（会自动【备份 → 生成校验和 → 立即校验】闭环，杜绝坏备份）：

```bash
# 进入 myblog-backup 容器（脚本已挂载，含 cron 定时任务）
docker compose exec myblog-backup sh

# ▸ 手动备份（生成 .sql.gz + 同名 .sha256 校验和，并立即校验）
bash /scripts/backup.sh

# ▸ 只校验最近一次备份（不触发新备份）
VERIFY_ONLY=1 bash /scripts/backup.sh

# ▸ 校验任意备份文件 / 目录下全部备份
bash /scripts/verify-backup.sh /backups/myblog_YYYYMMDD_HHMMSS.sql.gz
bash /scripts/verify-backup.sh

# ▸ 恢复（会先校验 sha256 + gzip 完整性，通过才导入；需确认或 CONFIRM=1）
bash /scripts/restore.sh /backups/myblog_YYYYMMDD_HHMMSS.sql.gz

# ▸ 图片备份（上传目录不在数据库里，必须与数据库备份成对）
bash /scripts/backup-uploads.sh
```

> ⚠️ **`restore.sh` 不会创建目标库**：恢复前目标库必须已存在（正式库由 MySQL 容器首次启动时导入
> `myblog-1.1.sql` 建好）。要恢复到别的库名（如临时验证）先 `CREATE DATABASE <名字>`，
> 否则会报 `ERROR 1049 (42000): Unknown database`。
> 备份文件内含 `DROP TABLE` 语句，**导入会覆盖目标库里的同名表**。

> **图片备份**（`backup-uploads.sh`）：产出 `uploads_YYYYMMDD_HHMMSS.tar.gz` + 同名 `.sha256`，
> 打包后立即校验（gzip + sha256），校验不过会删产物并返回非 0；保留期与数据库备份共用 `BACKUP_RETENTION_DAYS`。
> 定时任务默认 `30 2 * * *`（可用 `UPLOAD_BACKUP_CRON` 覆盖）。恢复方式：`tar -xzf <归档> -C <目标父目录>`（归档内是 `uploads/` 前缀）。
>
> **异地备份（对象存储 / 另一台机器）**：在 `myblog-backup` 容器里内置了 `rclone`，
> 配置好远端后在 `.env.docker` 里填 `RCLONE_REMOTE`，每次备份会自动同步上去；
> **同步失败会让备份任务返回非 0**（不会静默留下一份「只在本机」的备份）。
>
> `RCLONE_REMOTE` 的格式是 **`<远端名>:<桶名>[/<前缀目录>]`**。其中
> **「远端名」是你在 rclone 里自己起的名字**（配置文件 `rclone.conf` 里 `[名字]` 段的键名，叫什么都行）；
> 桶名要填服务商给的**真实桶名**（腾讯云 COS 形如 `bucket-125xxxxxxx`）。
>
> ```bash
> # 远端名取 myoss，一条命令建好（不必走交互向导）
> rclone config create myoss oss provider Alibaba \
>   access_key_id <AK> access_key_secret <SK> endpoint oss-cn-hangzhou.aliyuncs.com
> rclone config create myoss cos provider TencentCOS \
>   secret_id <Id> secret_key <Key> endpoint cos.ap-guangzhou.myqcloud.com
> rclone config create myoss s3  provider Cloudflare \
>   access_key_id <AK> secret_access_key <SK> endpoint https://<账号ID>.r2.cloudflarestorage.com
>
> rclone lsd myoss:                  # 能列出桶 → 凭据正确
> rclone mkdir myoss:myblog-backup   # 桶不存在就建一个
> # 于是 .env.docker 里填：RCLONE_REMOTE=myoss:myblog-backup
> ```
>
> ⚠️ rclone 必须在**服务器上以 root** 跑（容器只读挂载宿主机的 `/root/.config/rclone`，
> 非 root 部署用 `RCLONE_CONFIG_DIR` 改路径）；**桶保持私有**，别开公共读 —— 备份文件等于整库数据。

> 备份目录挂载在 Docker 卷 `backup-data`，容器宿主机也可挂载到本地持久化目录。
> 定时备份默认每天 `02:00` 触发（`BACKUP_CRON` 可在 `.env.docker` 覆盖），
> 保留最近 `BACKUP_RETENTION_DAYS`（默认 14）天并自动清理。

如需在宿主机直接执行（不使用容器）：

```bash
# 备份（宿主机需安装 mysqldump / gzip / sha256sum）
DB_HOST=localhost DB_PORT=3307 DB_USER=root DB_PASSWORD=yourpass DB_NAME=myblog \
  bash scripts/backup.sh

# 恢复
DB_HOST=localhost DB_PORT=3307 DB_USER=root DB_PASSWORD=yourpass DB_NAME=myblog \
  CONFIRM=1 bash scripts/restore.sh ./backups/myblog_YYYYMMDD_HHMMSS.sql.gz
```

---

## 数据持久化

Docker Compose 定义了 5 个命名数据卷，容器删除后数据不会丢失：

| 数据卷          | 路径             | 说明                                    |
| --------------- | ---------------- | --------------------------------------- |
| `mysql-data`    | MySQL 数据目录   | 文章、评论、用户等全部数据              |
| `redis-data`    | Redis 持久化文件 | 缓存数据                                |
| `meili-data`    | 搜索索引目录     | Meilisearch 全文索引                    |
| `uploads-data`  | 上传文件目录     | 文章封面、头像、站点图片（**图片唯一存放处**） |
| `backup-data`   | 数据库备份文件   | 定时备份生成的 `.sql.gz` + `.sha256` 校验和 |

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

完整可直接使用的模板见仓库根目录 [`nginx.conf`](./nginx.conf)（含 SSL、Gzip、缓存、安全头与两个入口域名）。

示例 Nginx 配置：

```nginx
# HTTP → HTTPS
server {
    listen 80;
    server_name blog.example.com www.blog.example.com admin.example.com;
    return 301 https://$host$request_uri;
}

# 博客前台
server {
    listen 443 ssl http2;
    server_name blog.example.com www.blog.example.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    client_max_body_size 20m;

    # 博客容器自带 /api/v1/** 与 /uploads/** 的服务端代理，整体转发即可
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection        "";
    }
}

# 管理后台
server {
    listen 443 ssl http2;
    server_name admin.example.com;

    ssl_certificate     /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    client_max_body_size 20m;

    # 后台用相对路径 /api/v1 调接口（VITE_API_BASE=/api/v1）
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    # SPA 的所有路由回退到 index.html（容器内的 Nginx 已处理）
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection        "";
    }
}
```

> ⚠️ **管理后台必须挂在「域名根」上，不能用 `blog.example.com/admin` 这种子路径**：
> 它的构建未设置 Vite `base`，资源路径是 `/assets/...`，而客户端路由前缀是 `/admin/...`。
> 挂在子路径会表现为页面空白、静态资源 404（`base` 是构建期写死的，配反代改不回来）。
> 所以下面 `*_ORIGIN` 里的两个域名是不同的。

### 2. 安全加固

- ✅ 修改 `.env.docker` 中所有默认密码和密钥（`scripts/preflight.mjs` 会把模板值列为阻断项）
- ✅ 使用 `openssl rand -hex 32` 生成强随机 JWT 密钥
- ✅ 端口暴露：compose 已把全部发布端口绑到 `BIND_ADDR`（默认 `127.0.0.1`，只有宿主机上的
  Nginx 能访问）。用公网扫描确认 MySQL / Redis / Meilisearch / 后端端口确实不可达
- ✅ 定期备份数据库：使用仓库内置 `scripts/backup.sh`（备份后自动生成校验和并校验），
  或启用 docker-compose 的 `myblog-backup` 服务（默认每天 02:00 自动备份）
- ✅ **备份上传图片**：`scripts/backup-uploads.sh`（默认每天 02:30）。
  图片不在数据库里，丢了无法从库重建，两类备份必须成对
- ✅ **备份出机器**：配置 `RCLONE_REMOTE` 后会同步到对象存储。
  备份只留在本机 = 宿主机磁盘损坏就全丢；同步失败时任务返回非 0（不会静默）
- ✅ 校验备份完整性：定期执行 `bash scripts/verify-backup.sh`，
  确保备份未被静默损坏 / 传输错误
- ✅ 恢复演练：定期用 `bash scripts/restore.sh` 在测试库恢复一次，
  验证「备份可恢复」而非「只有备份文件」
- ✅ 启用防火墙：仅开放 80/443 端口

### 3. 资源限制

compose 目前未设内存上限 —— 单个容器 OOM 会拖垮宿主机。参考值见 `docker-compose.yml`
末尾的注释块，按实际内存调整后在对应 service 下加一行：

```yaml
services:
  myblog-backend:
    mem_limit: 512m
```

> ⚠️ 这是上限而非预留；设得过低会触发 OOM 重启（表现为容器反复 `Restarting`）。

### 4. 日志管理

compose 已通过 `x-logging` 锚点为所有服务配好轮转（`max-size: 10m` / `max-file: 3`），
无需额外配置。若要改档位，改锚点处一处即可（各服务都引用它）。

```yaml
x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 上线首日速查

### 1. 部署后按顺序跑这四条

```bash
# ① 配置自检（0 阻断才算过）
node scripts/preflight.mjs

# ② 服务是否都健康的
docker compose ps

# ③ 健康检查五块（database / redis / meilisearch / mail / imageVariants）
curl -s https://<博客域名>/health

# ④ 端到端冒烟（0 阻断才算过）
node scripts/smoke.mjs --base=https://<博客域名> --admin=https://<后台域名>
```

> `smoke.mjs` 的两条说明：访问地址与站点域名不同时用 `--site=<域名>` 指定；
> `/health` 不在博客域名下（没配反代）时用 `--health=http://127.0.0.1:3000/health` 直连后端。

### 2. 首 24 小时观察（建议每 2 小时一轮）

| 看什么 | 命令 / 位置 | 正常 |
| --- | --- | --- |
| 服务状态与重启次数 | `docker compose ps` | 全部 `Up`，无反复 `Restarting` |
| 资源 | `docker stats --no-stream` | 无容器长期贴着内存上限 |
| 磁盘 | `df -h` | < 80%（容器日志已按 10m×3 轮转） |
| 错误日志 | `docker compose logs --tail=200 myblog-backend \| grep -i error` | 无持续新增 |
| 健康检查 | `curl -s https://<域名>/health` | 五块全绿 |
| 限流是否误杀 | 浏览器正常翻页 | 不出现 429（出现说明 `TRUST_PROXY` 配错） |
| 备份 | 次日 02:00 后 `docker compose exec myblog-backup ls -lh /backups` | 出现当日 `.sql.gz` 与 `uploads_*.tar.gz`（各带 `.sha256`） |

### 3. 首日常见问题（每条的详细排查见「故障排查」）

| 症状 | 先想到 | 三步处置 |
| --- | --- | --- |
| 前台打不开、页面 502 | 博客容器端口 | `docker compose logs myblog-blog \| head -3` 看监听端口是否为 **3001**（不是 → 重建前台镜像）→ `docker compose ps` → 查 Nginx `upstream` |
| 后台能开页面，一登录就转圈 | 反代缺 `location /api/` | 浏览器 Network 里 `/api/v1/...` 返回的是不是 HTML（是 → 补反代规则）→ 确认 `VITE_API_BASE=/api/v1` → 重建 admin 镜像 |
| 图片全部裂（尤其是后台） | `APP_BASE_URL` | 看库里存的地址前缀（`SELECT cover_image FROM article LIMIT 1`）→ 改 `APP_BASE_URL` → **存量行需 SQL 回填** |
| 搜索"能用"但很慢 | Meilisearch 降级 | 看 `/health` 的 `meilisearch.status` 与 `reason` → 核对密钥 / 容器状态 → 改完重启后端（密钥错时**不报错只降级**） |
| 收不到通知邮件 | SMTP 或收件人 | 后台「系统设置 · 邮件通知」点测试发信 → 页面告警条写了缺哪项 → 改完 `docker compose restart myblog-backend` |
| 邮件里链接点开是空页 / 被邮箱拦截 | `SITE_URL` | 必须是收信人能访问的公网地址（`localhost` / 内网地址必然不行）→ 改完重启后端 |
| 正常浏览也被 429 | `TRUST_PROXY` | 反代部署应为 `1` → 改完重启后端 |
| 时间整体差 8 小时 | 时区四项 | `docker compose exec mysql sh -c 'date; echo $TZ'` → 核对 `TZ` / `DB_TIME_ZONE` / `APP_TIME_ZONE` → 重建容器 |
| 内存吃满、服务被 OOM 杀掉 | 单容器无上限 | `docker stats` 找元凶 → 参照 `docker-compose.yml` 末尾的参考值加 `mem_limit` |
| 备份文件只有几十字节 | 备份其实失败了 | `docker compose exec myblog-backup bash /scripts/backup.sh` 看真实报错 → 对照「故障排查 §7」 |
| 某篇文章看不到评论区 | 文章级开关 | 后台文章编辑器里「评论区」是否被关掉（默认开放） |

### 4. 出问题时的第一动作

**先别改配置**。按这个顺序取证，能避免「改了一堆反而查不出原因」：

```bash
docker compose ps                          # 谁不健康
docker compose logs --tail=200 <服务名>     # 它的报错
curl -s <域名>/health                      # 哪一块不对
node scripts/smoke.mjs --base=<域名>        # 覆盖面最广的一遍
```

改完任何 `.env.docker` 里的值，**必须重建/重启对应容器**（`docker compose up -d <服务名>` 或 `restart`），
改前端构建期变量（`NUXT_*` / `VITE_*`）则必须 `build` 后 `up -d`。

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

先分清是哪一层：

```bash
# 容器是否健康、进程在不在
docker compose ps
docker compose logs myblog-blog | head -3      # 应看到 Listening on http://0.0.0.0:3001
docker compose exec myblog-blog netstat -lntp  # 或 ss -lntp，确认容器内实际监听端口
```

| 现象 | 原因 | 处置 |
| --- | --- | --- |
| 日志显示 `Listening on ...:3000`（不是 3001） | 镜像缺 `ENV PORT=3001`。`nuxt.config.ts` 的 `devServer.port` **只对 `nuxt dev` 生效**，构建产物读的是 `PORT` 环境变量（缺省 3000），与 `EXPOSE` / 健康检查 / compose 映射的 3001 对不上 | 重建前台镜像：`docker compose --env-file .env.docker build myblog-blog` 后 `up -d myblog-blog`（镜像已修，旧镜像会重现） |
| 容器 healthy 但反代 502 | Nginx 的 `upstream blog` 地址/端口不对，或容器不在同一网络 | 按 `nginx.conf` 的 `upstream` 核对 |
| 宿主机 `curl 127.0.0.1:3001` 连不上 | 端口默认只绑回环（`BIND_ADDR=127.0.0.1`），只能从服务器本机访问 | 属预期；外网走 Nginx |
| 接口 200 但内容是 HTML | 反代缺 `location /api/`，请求落到 SPA 回退（返回 index.html） | 后台域名下必须有 `location /api/` 转发到后端 |

### 4. 上传文件不显示

分两种，先分清是哪一种：

```bash
# 文件到底在不在（uploads-data 卷是否挂对）
docker compose exec myblog-backend ls -la /app/uploads
```

- **文件在，但前台/后台图片裂** → `APP_BASE_URL` 没配（库里存的是 `http://localhost:3000/...`）。
  见「配置说明 → 站点信息」。
- **文件不在** → 卷未挂载或上传失败（后端 body 上限 10MB；走反向代理时
  还要看 `client_max_body_size`，`nginx.conf` 模板给的是 20m）。

### 5. 完全重置

```bash
# 停止并删除所有容器、网络、数据卷
docker compose down -v

# 清理构建缓存
docker builder prune -a -f

# 重新构建
docker compose --env-file .env.docker up -d --build
```

### 6. 时间字段整体偏移 8 小时

`datetime` 列存的是无时区墙钟字面量，两端都按「写入端时区」解释后输出 UTC 瞬时串；任一环节时区不一致都会整体偏移且**不报错**。

```bash
# 1) 看 mysql 容器的写入时区（期望与 TZ 一致）
docker compose exec mysql sh -c 'date; echo "TZ=$TZ"'

# 2) 看后端启动自检（Express 会打印读时区与不一致告警）
docker compose logs myblog-backend | grep -E "读时区|时区不一致"
```

修复：确认 `.env.docker` 里 `TZ` / `DB_TIME_ZONE` / `APP_TIME_ZONE` 表示同一时区后重建容器。

> ⚠️ 若此前 mysql 容器未设 `TZ`（写库为 UTC），改动 `TZ` 后**存量行的墙钟仍是 UTC**，与新写入的行相差 8 小时；需要抹平的话按 `scripts/` 的备份/恢复流程导出后统一转换，或接受历史偏移。

### 7. 备份失败 / 备份文件只有几十字节

**先看产物大小**：一份正常的数据库备份至少是 KB 级；只有几十字节说明 `mysqldump` 没成功，`gzip` 只压出了一个空归档。

```bash
docker compose exec myblog-backup bash -c "ls -l /backups; bash /scripts/backup.sh; echo EXIT=\$?"
```

| 症状 | 原因 | 处置 |
| --- | --- | --- |
| `Plugin caching_sha2_password could not be loaded` | 备份镜像缺 MySQL 8 的认证插件（需要 `mariadb-connector-c`） | 重新构建：`docker compose --env-file .env.docker build myblog-backup --no-cache` 后再 `up -d myblog-backup`（镜像已修，旧镜像会重现） |
| `didn't find section in config file` | 服务器上还没配 rclone 远端（容器只读挂载宿主机的 `/root/.config/rclone`） | 按「备份 · 校验 · 恢复」章节用 `rclone config create` 建好远端，或用 `rclone lsd <远端>:` 验证 |
| `Unknown database '<名字>'`（恢复时） | `restore.sh` 不会创建目标库 | 先 `CREATE DATABASE <名字>` 再恢复 |
| 备份成功但云端没文件 | `RCLONE_REMOTE` 为空，或 rclone 同步失败（脚本会返回非 0） | 看容器日志 `docker compose logs myblog-backup`（cron 输出会写进 `/var/log/myblog-backup.log`） |

> **验证备份真的可用**（别只看脚本退出码）：
> ```bash
> docker compose exec myblog-backup bash /scripts/verify-backup.sh   # gzip + sha256 双校验
> ```
> 定期做一次真恢复演练（导到另一个库名比对行数），只验证「文件能解开」不等于「能恢复出完整数据」。

### 8. 搜索看起来能用，其实没走 Meilisearch（静默降级）

```bash
curl -s http://127.0.0.1:3000/health | grep -o '"meilisearch":{[^}]*}'
```

`status` 不是 `ok` 就是降级成 SQL LIKE（页面照常能搜，只是走数据库 `LIKE`）。

| reason / 现象 | 原因 | 处置 |
| --- | --- | --- |
| `连接失败: Request to http://meilisearch:<端口>/health has failed` | 后端拿到的端口不对，或 Meili 没起来 | 确认后端环境里的 `MEILI_PORT` 是 **7700**（容器内端口）。`MEILI_PORT` 在本项目里只是**宿主机映射端口**，改它不影响容器间连接 |
| `unauthorized` | `MEILI_MASTER_KEY` 与 Meili 容器的不一致 | 两边用同一个值后重启后端 |
| `unavailable` | Meili 容器未启动 / 不在同一网络 | `docker compose ps` 与 `docker compose logs meilisearch` |

> 排查要点：`/health` 是**公开**端点，无密钥也会返回 200 —— 判断可用性要看里面的 `status` / `reason`，不能只看 HTTP 码。

---

## 项目文件清单

```
myblog/
├── docker-compose.yml          # Docker Compose 编排文件
├── .env.docker.example         # 环境变量模板
├── DEPLOY.md                   # 本文档
├── nginx.conf                  # Nginx 反向代理模板（blog + admin 双域名）
├── scripts/                    # 备份 / 校验 / 恢复脚本（含备份容器 Dockerfile）
│   ├── preflight.mjs           # 上线前配置自检（密钥 / 地址 / 时区 / SMTP）
│   ├── smoke.mjs               # 上线后冒烟（健康检查 / 接口 / SEO / 权限）
│   └── backup-uploads.sh       # 上传目录备份（图片不在数据库里）
├── deploy/k8s/myblog.yaml      # Kubernetes 清单
├── myblog-express/
│   ├── Dockerfile              # Express 后端镜像
│   ├── myblog-1.1.sql          # 数据库初始化脚本（首次启动自动导入）
│   └── .dockerignore
├── myblog-springboot/
│   ├── Dockerfile              # Spring Boot 后端镜像
│   └── myblog-1.1.sql          # 本端自带的等价初始化脚本
└── myblog-vue/
    ├── myblog-blog/
    │   └── Dockerfile          # Nuxt 博客前端镜像
    └── myblog-admin/
        ├── Dockerfile          # Vue 管理后台镜像
        └── nginx.conf          # 容器内 Nginx 配置（SPA fallback）
```
