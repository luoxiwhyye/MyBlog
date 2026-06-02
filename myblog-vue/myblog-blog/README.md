# MyBlog 前台

这是一个基于 **Nuxt 3 + TypeScript** 的博客前台项目，已从 Vue 3 + Vite SPA 重构为支持 SSR 的 Nuxt 应用，并保留原有博客页面能力与现有 Express API 契约。

## 功能特性

- 🏠 首页、文章详情、分类、标签、归档、关于、搜索页面
- 📖 文章详情页支持评论、回复、代码高亮、目录导航
- 🔎 基础 SEO：全局 `titleTemplate`、默认 description、Open Graph、Twitter Card、canonical
- 🗺️ 内置 `robots.txt` 与 `sitemap.xml`
- 🔁 通过 Nuxt server route 代理后端 Express API
- 📱 响应式设计

## 技术栈

- **框架**: Nuxt 3
- **语言**: TypeScript
- **渲染模式**: SSR
- **状态管理**: Pinia
- **UI 组件库**: Element Plus
- **路由**: Nuxt 约定式路由
- **日期处理**: Day.js

## 安装和运行

### 环境要求

- Node.js 20.19+
- npm 或 yarn

### 1. 安装依赖

```bash
npm install
```

### 2. 可选环境变量

```env
NUXT_API_BASE=http://localhost:3000/api/v1
NUXT_SITE_URL=http://localhost:3001
```

### 3. 启动开发服务器

```bash
npm run dev
```

应用默认运行在 `http://localhost:3001`，并通过 Nuxt 内部 `/api/v1/*` 代理转发到原有 Express API。

### 4. 构建生产版本

```bash
npm run build
```

## 项目结构

```text
api/                  # API 封装（复用原接口契约）
assets/               # 全局样式
components/           # 通用组件与布局组件
composables/          # SEO 等复用逻辑
layouts/              # Nuxt 布局
pages/                # Nuxt 页面与约定式路由
plugins/              # Nuxt 插件（Element Plus）
public/               # 静态资源
server/               # API 代理、robots、sitemap
stores/               # Pinia 状态
types/                # TypeScript 类型
utils/                # 通用工具函数
```

## API 集成

1. 在 `api/index.ts` 中定义接口
2. 在 `types/index.ts` 中定义类型
3. 优先通过 Nuxt 内部 `/api/v1/*` 代理访问后端

## 部署

构建后会生成 Nuxt 服务端产物（`.output/`），适合以 Node 服务方式部署。

## 许可证

MIT
