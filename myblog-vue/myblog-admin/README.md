# MyBlog 后台管理系统

基于 **Vue 3 + TypeScript + Pinia + Element Plus** 的个人博客后台管理系统（SPA），对接 Express / Spring Boot 后端 REST API（`/api/v1`）。

## 技术栈

- **框架**: Vue 3（Composition API）
- **语言**: TypeScript
- **状态管理**: Pinia
- **UI 组件库**: Element Plus
- **HTTP 客户端**: Axios
- **路由**: Vue Router 4
- **富文本编辑器**: Vue Quill（markdown-it + highlight.js 实时预览、turndown 富文本 → Markdown）
- **图表**: ECharts 6（仪表盘趋势图，随主题重绘）
- **构建工具**: Vite
- **代码规范**: ESLint + Prettier + vue-tsc

## 功能特性

### 🔐 认证授权
- JWT Token 认证、登录状态持久化、路由守卫保护、自动获取用户信息
- 默认账号 `admin` / `admin123`（启动时由后端初始化，**请及时修改**）

### 📝 文章管理
- 文章列表（分页 / 筛选 / 搜索、批量发布 / 下架 / 移回收站）、创建与编辑（草稿 / 发布）
- 富文本 + Markdown 左右分屏实时预览（编辑区与预览区等高）、封面图片上传、分类 / 标签关联（下拉支持检索）
- **按文章开关评论区**（下线后前台隐藏评论区）

### 🖼️ 图片上传裁剪
- 封面 / 头像 / 表情 / 背景图 / 正文图上传后进入裁剪对话框
- 内置常用比例（封面 16:9、头像/表情 1:1、背景图 9:16 等）+ **自定义比例**（1/6 ~ 6）
- 全站**单一裁剪实例**（挂在 `App.vue`，所有入口共用）

### 🏷️ 分类与标签
- 分类 / 标签的增删改查、关联文章数量显示、分页展示（名称唯一，禁止重名）

### 💬 评论管理
- 树形评论列表、审核 / 删除 / 恢复、按文章筛选
- **批量管理**：列表选中后批量设为已审核 / 待审核 / 移入回收站（回收站仍逐条操作，审核带级联不变式）

### 💌 留言板 / 😊 表情包
- 留言板管理（`MessageBoardManage`）
- 博主自定义表情包管理（`EmojiManage`，含分组）

### 🔗 友链管理
- 表格 + 对话框增删改、头像上传、简介、站长邮箱、置顶 / 启用开关、点击统计

### 📊 仪表盘与运维
- 核心数据统计（文章 / 评论 / 浏览 / 待审核）、发布趋势图（ECharts）、阅读排行
- 运维监控：缓存命中率、响应时间、错误率，一键清空 / 预热缓存（`CacheManage`）
- **未读红点轮询**：评论 / 留言 / 错误等新消息提醒

### 🛡️ 错误监控
- 前端聚合错误日志的查看与清空（`ErrorLogManage`），回溯线上用户报错

### ⚙️ 系统设置
- 分组表单（基本 / 外观 / 社交），校验、保存即生效、JSON 导出/导入
- **自定义配置** Tab：任意 Key-Value 增删改（含类型 / 描述元数据）
- 主题色管理（影响前台，按维度 / 亮暗独立，与前台默认色对齐）
- **邮件通知面板**：查看 SMTP 配置状态 / 加密方式 / 收件人，并对 `SITE_URL` / 收件人缺失给出告警；可一键**发送测试邮件**

### 👤 博主资料
- 博主信息查看与编辑、头像上传、密码修改

## 路由一览

| 路径 | 视图 |
| --- | --- |
| `/login` | 登录 |
| `/admin/dashboard` | 仪表盘 |
| `/admin/articles`、`/admin/articles/edit/:id?` | 文章列表 / 编辑 |
| `/admin/types`、`/admin/labels` | 分类 / 标签 |
| `/admin/friend-links` | 友链 |
| `/admin/comments` | 评论 |
| `/admin/message-board` | 留言板 |
| `/admin/emoji` | 表情包 |
| `/admin/error-log` | 错误监控 |
| `/admin/cache` | 缓存运维 |
| `/admin/profile` | 博主资料 |
| `/admin/settings` | 系统设置 |

> 除 `/login` 外，所有 `/admin/**` 均由路由守卫保护，未登录自动跳转登录页并携带 `redirect`。

## 项目结构

```
myblog-admin/
├── public/                 # 静态资源
├── src/
│   ├── api/                # API 封装（含 errorLog/emoji/messageBoard/mail 等模块）
│   ├── assets/css/         # 设计令牌 + Element Plus 暗色覆盖
│   ├── components/         # 公共组件（ImageCropperDialog 全站裁剪对话框等）
│   ├── layouts/            # AdminLayout.vue（侧边栏 + 未读红点）
│   ├── router/             # 路由 + 守卫
│   ├── stores/             # Pinia（user 等）
│   ├── types/              # TypeScript 类型（api.ts）
│   ├── utils/              # request.ts（Axios 封装）、imageCropper.ts（裁剪会话）等
│   ├── views/              # 页面组件（article/ Dashboard/ Settings/ EmojiManage/ ErrorLogManage/ ...）
│   ├── App.vue
│   └── main.ts
├── Dockerfile              # 构建 + Nginx 托管
├── nginx.conf              # SPA 路由回退
├── package.json
└── README.md
```

## 开发指南

### 环境要求

- Node.js 20.19+（`^20.19.0 || >=22.12.0`）

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
cp .env.example .env        # 配置 VITE_API_BASE（默认 http://localhost:3000/api/v1）
npm run dev                 # http://localhost:5173
```

> 开发环境 API 走 Vite 代理（相对路径 `/api/v1` → 后端）。手机通过局域网 IP 访问亦可正常请求。

### 构建 / 校验 / 格式化

```bash
npm run build          # type-check + vite build → dist/
npm run type-check     # vue-tsc --build
npm run format         # prettier
```

## 后端适配说明

- **基础 URL**: `http://localhost:3000/api/v1`（可通过 `VITE_API_BASE` 覆盖）
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON；**文件上传**: multipart/form-data
- **响应格式**:

```json
{ "code": 200, "message": "操作成功", "data": {} }
```

- **权限控制**: 博主（所有操作）/ 访客（查看、评论）
- **分页参数**: `page` / `pageSize`；**时间字段**: 后端返回 **UTC 瞬时串**（`2026-09-13T11:10:49.000Z`），前端按浏览器时区展示
- **图片 URL**: 返回完整可访问 URL

### 主要接口模块

1. 认证 `/blogger/login` · 2. 文章 `/articles` · 3. 分类 `/types` · 4. 标签 `/labels` · 5. 评论 `/comments`（含批量） · 6. 留言板 `/message-board` · 7. 表情 `/emoji` · 8. 友链 `/friend-links` · 9. 上传 `/upload/image` · 10. 配置 `/settings` · 11. 缓存 `/cache` · 12. 错误日志 `/error-log` · 13. 邮件 `/mail`（状态 / 测试发信）

## 部署说明

1. 构建生产版本：`npm run build`（产物在 `dist/`）
2. 将 `dist/` 部署到 Web 服务器，配置反向代理，确保 API 请求正确转发到后端
3. 设置正确的 `VITE_API_BASE`（Docker 场景可在构建参数注入）
4. Docker 场景请参考仓库根目录 [docker-compose.yml](../../docker-compose.yml) 与 [DEPLOY.md](../../DEPLOY.md)

## 许可证

MIT

