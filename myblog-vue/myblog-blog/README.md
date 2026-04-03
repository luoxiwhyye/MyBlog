# MyBlog 前台

这是一个基于 Vue 3 + TypeScript + Vite 构建的个人博客前台项目。

## 功能特性

- 🏠 首页展示最新文章
- 📖 文章详情页，支持评论
- 🏷️ 分类和标签系统
- 🔍 全文搜索功能
- 📅 文章归档
- 💬 评论系统
- 📱 响应式设计

## 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建工具**: Vite
- **状态管理**: Pinia
- **UI 组件库**: Element Plus
- **HTTP 客户端**: Axios
- **路由**: Vue Router
- **日期处理**: Day.js

## 安装和运行

### 环境要求

- Node.js 18+
- npm 或 yarn

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 4. 构建生产版本

```bash
npm run build
```

## 项目结构

```
src/
├── api/               # API 接口
├── components/        # 组件
│   ├── common/        # 通用组件
│   └── layout/        # 布局组件
├── layouts/           # 页面布局
├── router/            # 路由配置
├── stores/            # Pinia 状态管理
├── types/             # TypeScript 类型
├── utils/             # 工具函数
├── views/             # 页面组件
└── main.ts            # 应用入口
```

## 开发指南

### 添加新页面

1. 在 `src/views/` 下创建 Vue 组件
2. 在 `src/router/index.ts` 中添加路由
3. 如需要，在 `src/stores/` 中添加状态管理

### API 集成

1. 在 `src/api/index.ts` 中定义接口
2. 在 `src/types/index.ts` 中定义类型
3. 在组件中使用 API

## 部署

构建后的文件位于 `dist/` 目录，可以部署到任何静态文件服务器。

## 许可证

MIT
