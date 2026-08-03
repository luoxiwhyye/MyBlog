# MyBlog 后台管理系统

基于 Vue 3 + TypeScript + Pinia + Element Plus 的个人博客后台管理系统。

## 项目概述

这是一个完整的博客后台管理系统前端项目，包含文章管理、分类管理、标签管理、评论管理、用户管理和网站配置等功能。后端 API 已准备完毕，前端完全基于 TypeScript 开发。

## 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **状态管理**: Pinia
- **UI 组件库**: Element Plus
- **HTTP 客户端**: Axios
- **路由**: Vue Router 4
- **富文本编辑器**: Vue Quill
- **构建工具**: Vite
- **代码规范**: ESLint + Prettier

## 项目结构

```
myblog-admin/
├── public/                 # 静态资源
├── src/
│   ├── api/               # API 接口定义
│   │   └── index.ts       # 所有 API 方法
│   ├── components/        # 公共组件
│   ├── layouts/           # 布局组件
│   │   └── AdminLayout.vue # 后台管理布局
│   ├── router/            # 路由配置
│   │   └── index.ts       # 路由和守卫
│   ├── stores/            # Pinia 状态管理
│   │   └── user.ts        # 用户状态管理
│   ├── types/             # TypeScript 类型定义
│   │   └── api.ts         # API 类型定义
│   ├── utils/             # 工具函数
│   │   └── request.ts     # Axios 请求封装
│   ├── views/             # 页面组件
│   │   ├── Login.vue      # 登录页
│   │   ├── Dashboard.vue  # 仪表盘
│   │   ├── article/       # 文章相关页面
│   │   │   ├── ArticleList.vue    # 文章列表
│   │   │   └── ArticleEditor.vue  # 文章编辑器
│   │   ├── TypeManage.vue # 分类管理
│   │   ├── LabelManage.vue # 标签管理
│   │   ├── CommentManage.vue # 评论管理
│   │   ├── Profile.vue    # 个人资料
│   │   └── Settings.vue   # 网站配置
│   ├── App.vue            # 根组件
│   └── main.ts            # 入口文件
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 功能特性

### 🔐 认证授权

- JWT Token 认证
- 登录状态持久化
- 路由守卫保护
- 自动 token 刷新

### 📝 文章管理

- 文章列表查看（支持分页、筛选、搜索）
- 文章创建和编辑
- 富文本编辑器支持
- 封面图片上传
- 草稿和发布状态管理
- 分类和标签关联

### 🏷️ 分类和标签管理

- 分类/标签的增删改查
- 关联文章数量显示
- 分页展示

### 💬 评论管理

- 评论列表查看（树形结构）
- 评论审核功能
- 评论删除
- 按文章筛选评论

### 👤 用户管理

- 博主信息查看和编辑
- 头像上传
- 密码修改

### ⚙️ 网站配置

- 动态配置项管理
- 文本和图片配置支持
- 实时保存

### 📊 仪表盘

- 核心数据统计
- 最新评论展示

## API 接口文档

详细的 API 接口定义请参考 `src/types/api.ts` 文件，其中包含：

- 完整的 TypeScript 类型定义
- 所有接口的请求和响应格式
- 参数和返回值的详细说明

### 主要接口模块

1. **认证接口** (`/blogger/login`)
2. **文章管理** (`/articles`)
3. **分类管理** (`/types`)
4. **标签管理** (`/labels`)
5. **评论管理** (`/comments`)
6. **文件上传** (`/upload/image`)
7. **网站配置** (`/settings`)

## 开发指南

### 环境要求

- Node.js >= 18
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 类型检查

```bash
npm run type-check
```

### 代码格式化

```bash
npm run format
```

## 后端适配说明

前端项目已完全开发完毕，需要后端提供对应的 REST API 接口。接口规范如下：

### 基础信息

- **基础URL**: `http://localhost:3000/api/v1`
- **认证方式**: Bearer Token (JWT)
- **数据格式**: JSON
- **文件上传**: multipart/form-data

### 响应格式

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

### 权限控制

- 博主权限：所有操作
- 访客权限：查看、评论

### 数据库表结构

项目使用了以下数据表：

- `blogger` - 博主信息
- `article` - 文章
- `type` - 分类
- `label` - 标签
- `article_label` - 文章标签关联
- `comment` - 评论
- `setting` - 网站配置

详细的建表语句请参考后端项目的数据库文件。

## 注意事项

1. **Token 管理**: 前端会在 localStorage 中存储 token，请确保后端正确验证 JWT
2. **文件上传**: 支持图片上传，统一使用 `/upload/image` 接口
3. **分页参数**: 统一使用 `page` 和 `pageSize`
4. **日期格式**: 统一使用 `YYYY-MM-DD HH:mm:ss`
5. **图片URL**: 返回完整的可访问URL
6. **错误处理**: 后端错误时请返回相应的 `code` 和 `message`

## 部署说明

1. 构建生产版本：`npm run build`
2. 将 `dist` 目录部署到 Web 服务器
3. 配置反向代理，确保 API 请求正确转发到后端
4. 设置正确的 `baseURL`（默认为 `http://localhost:3000/api/v1`）

## 许可证

MIT License

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```
