# MyBlog Admin 前端管理系统

## 项目概述

MyBlog Admin 是一个基于 Vue 3 + TypeScript + Element Plus 构建的个人博客后台管理系统前端项目。该系统提供了完整的博客管理界面，包括文章编辑、分类管理、标签管理、评论审核、用户管理、网站配置等功能。前端通过 RESTful API 与后端交互，采用现代化的前端技术栈，提供流畅的用户体验。

## 技术栈

- **框架**: Vue 3 (Composition API)
- **语言**: TypeScript 5.x
- **构建工具**: Vite 7.x
- **状态管理**: Pinia 3.x
- **UI 组件库**: Element Plus 2.x
- **HTTP 客户端**: Axios 1.x
- **路由管理**: Vue Router 5.x
- **富文本编辑器**: Vue Quill 1.x
- **图表库**: ECharts 6.x
- **样式预处理**: Sass
- **代码规范**: ESLint + Prettier
- **开发工具**: Vue DevTools

## 功能特性

### 🔐 用户认证

- JWT Token 身份认证
- 登录状态持久化存储
- 路由守卫保护
- 自动 Token 刷新机制
- 安全登出功能

### 📝 文章管理

- 文章列表分页展示
- 支持按分类、标签、状态筛选
- 关键词搜索功能
- 富文本编辑器 (Vue Quill)
- 封面图片上传
- 草稿/发布状态管理
- 文章软删除和恢复
- 回收站管理

### 🏷️ 分类和标签管理

- 分类/标签的增删改查
- 关联文章数量显示
- 分页列表展示
- 实时更新统计

### 💬 评论管理

- 评论列表树形结构展示
- 支持按文章筛选
- 评论审核功能 (待审核/已审核/垃圾/删除)
- 评论删除操作
- 嵌套回复显示

### 👤 个人中心

- 博主信息查看和编辑
- 头像上传功能
- 密码修改
- 个人简介管理

### ⚙️ 网站配置

- 动态配置项管理
- 支持文本、图片、HTML、布尔值类型
- 实时保存配置
- 配置项描述说明

### 📊 仪表盘

- 网站数据统计展示
- 文章总数、评论总数、浏览总量
- 待审核评论数量
- 数据可视化图表

### 🎨 用户界面

- 响应式设计，支持移动端
- 现代化 UI 设计
- 深色/浅色主题切换
- 直观的操作反馈
- 加载状态和错误处理

## 项目结构

```
myblog-admin/
├── public/                 # 静态资源目录
│   ├── favicon.ico        # 网站图标
│   └── ...                # 其他静态文件
├── src/
│   ├── api/               # API 接口层
│   │   └── index.ts       # 统一 API 接口定义
│   ├── components/        # 公共组件
│   ├── layouts/           # 布局组件
│   │   └── AdminLayout.vue # 后台管理主布局
│   ├── router/            # 路由配置
│   │   └── index.ts       # 路由定义和守卫
│   ├── stores/            # Pinia 状态管理
│   │   ├── counter.ts     # 示例计数器状态
│   │   └── user.ts        # 用户状态管理
│   ├── types/             # TypeScript 类型定义
│   │   └── api.ts         # API 相关类型
│   ├── utils/             # 工具函数
│   │   └── request.ts     # Axios 请求封装
│   ├── views/             # 页面组件
│   │   ├── Login.vue      # 登录页面
│   │   ├── Dashboard.vue  # 仪表盘页面
│   │   ├── Profile.vue    # 个人资料页面
│   │   ├── Settings.vue   # 网站设置页面
│   │   ├── article/       # 文章相关页面
│   │   │   ├── ArticleList.vue    # 文章列表
│   │   │   └── ArticleEditor.vue  # 文章编辑器
│   │   ├── TypeManage.vue # 分类管理页面
│   │   ├── LabelManage.vue # 标签管理页面
│   │   └── CommentManage.vue # 评论管理页面
│   ├── App.vue            # 根组件
│   └── main.ts            # 应用入口文件
├── .vscode/               # VS Code 配置
├── dist/                  # 构建输出目录
├── node_modules/          # 依赖包
├── .env                   # 环境变量
├── .gitignore            # Git 忽略文件
├── index.html            # HTML 模板
├── package.json          # 项目配置和依赖
├── tsconfig.json         # TypeScript 配置
├── tsconfig.app.json     # 应用 TypeScript 配置
├── tsconfig.node.json    # Node TypeScript 配置
├── vite.config.ts        # Vite 构建配置
└── README.md             # 项目说明文档
```

## 安装和运行

### 环境要求

- Node.js 20.19+ 或 22.12+
- npm 或 yarn 或 pnpm
- 支持 ES2022 的现代浏览器

### 1. 克隆项目

```bash
git clone <repository-url>
cd myblog-admin
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

创建 `.env` 文件并配置：

```env
# 后端 API 基础地址
VITE_API_BASE_URL=http://localhost:3000/api

# 应用配置
VITE_APP_TITLE=MyBlog Admin
```

### 4. 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

### 5. 构建生产版本

```bash
# 类型检查
npm run type-check

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 6. 代码格式化

```bash
npm run format
```

## 核心功能实现

### 状态管理 (Pinia)

项目使用 Pinia 进行状态管理，主要包括：

- **用户状态**: 登录状态、用户信息、Token 管理
- **应用状态**: 全局配置、主题设置等

```typescript
// stores/user.ts
export const useUserStore = defineStore("user", {
  state: () => ({
    token: "",
    userInfo: null as UserInfo | null,
  }),
  actions: {
    async login(credentials: LoginCredentials) {
      // 登录逻辑
    },
    logout() {
      // 登出逻辑
    },
  },
});
```

### API 封装 (Axios)

使用 Axios 进行 HTTP 请求封装：

- 统一的请求/响应拦截器
- 自动添加认证头
- 错误处理和重试机制
- 请求取消功能

```typescript
// utils/request.ts
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = useUserStore().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// 响应拦截器
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 错误处理逻辑
    return Promise.reject(error);
  },
);
```

### 路由管理 (Vue Router)

采用路由懒加载和守卫保护：

```typescript
// router/index.ts
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      component: () => import("@/views/Login.vue"),
    },
    {
      path: "/",
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        // 后台页面路由
      ],
    },
  ],
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  if (to.meta.requiresAuth && !userStore.token) {
    next("/login");
  } else {
    next();
  }
});
```

### 组件设计

#### 布局组件 (AdminLayout)

提供统一的后台管理布局：

- 顶部导航栏
- 侧边栏菜单
- 主内容区域
- 用户信息显示

#### 表单组件

- 文章编辑器：集成 Vue Quill 富文本编辑器
- 文件上传：支持图片预览和拖拽上传
- 数据表格：支持分页、排序、筛选

### 类型安全 (TypeScript)

项目采用严格的 TypeScript 配置：

- 完整的 API 类型定义
- 组件 Props 和 Emits 类型
- Pinia Store 类型推导
- 工具函数类型标注

## 开发指南

### 代码规范

- 使用 Vue 3 Composition API
- 遵循 TypeScript 最佳实践
- 使用 ESLint 和 Prettier 进行代码检查和格式化
- 组件命名使用 PascalCase
- 文件命名使用 kebab-case

### 组件开发

1. 创建组件文件
2. 定义组件类型接口
3. 实现组件逻辑
4. 添加样式 (使用 scoped Sass)

### API 集成

1. 在 `src/api/index.ts` 中定义接口
2. 在 `src/types/api.ts` 中定义类型
3. 在组件中调用 API 方法

### 状态管理

1. 定义 Store 结构
2. 实现 actions 和 getters
3. 在组件中使用 Store

## 部署说明

### 构建优化

- 使用 Vite 进行快速构建
- 代码分割和懒加载
- 资源压缩和优化
- Tree Shaking

### 部署步骤

1. 构建生产版本：`npm run build`
2. 将 `dist` 目录部署到 Web 服务器
3. 配置反向代理指向后端 API
4. 设置 HTTPS 证书

### 环境配置

- 开发环境：`.env.development`
- 生产环境：`.env.production`
- 测试环境：`.env.test`

## 浏览器支持

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 常见问题

### 开发环境问题

1. **端口占用**：修改 `vite.config.ts` 中的端口配置
2. **跨域问题**：配置 Vite 代理或后端 CORS
3. **类型错误**：运行 `npm run type-check` 检查

### 生产环境问题

1. **路由 404**：配置服务器重定向到 `index.html`
2. **API 请求失败**：检查 API 基础 URL 配置
3. **静态资源加载失败**：检查构建输出路径

## 更新日志

### v1.0.0

- 初始版本发布
- 实现基础的博客管理功能
- 支持文章、分类、标签、评论管理
- 用户认证和权限控制
- 响应式设计和现代化 UI

## 贡献指南

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 创建 Pull Request

## 许可证

ISC License</content>
<parameter name="filePath">d:\myblog\copliot-myblog-admin.md
