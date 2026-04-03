# MyBlog 前端前台项目设计参考文档

## 项目概述

MyBlog 前端前台项目是一个面向读者的个人博客展示网站，用于展示博主的文章、分类、标签、评论等内容。与后台管理系统不同，前台项目注重用户体验、内容展示和交互性。本文档基于现有的后端 API 和管理后台经验，为前台项目提供完整的设计参考。

## 技术栈建议

### 核心框架

- **Vue 3** + **TypeScript**：现代化前端框架，提供类型安全和更好的开发体验
- **Vite**：快速的构建工具，支持热重载和优化的生产构建
- **Vue Router 4**：官方路由管理，支持嵌套路由和守卫

### UI 和样式

- **Element Plus** 或 **Ant Design Vue**：成熟的 Vue 组件库
- **Tailwind CSS** 或 **UnoCSS**：原子化 CSS 框架，提供灵活的样式系统
- **VueUse**：Vue 组合式函数库，提供常用的逻辑封装

### 状态管理和数据获取

- **Pinia**：Vue 3 官方状态管理库，轻量且类型友好
- **Axios** 或 **TanStack Query**：HTTP 客户端，支持请求缓存和状态管理

### 内容展示

- **Vue Quill** 或 **Tiptap**：富文本内容渲染
- **Markdown-it**：Markdown 解析和渲染
- **Highlight.js** 或 **Prism**：代码语法高亮

### 其他功能

- **Day.js**：轻量级日期处理库
- **Vue I18n**：国际化支持
- **Vue Meta**：SEO 元数据管理

## 功能需求分析

### 核心功能

#### 1. 首页 (Home)

- 最新文章列表展示
- 文章摘要和封面图
- 分页加载
- 搜索功能
- 分类和标签导航

#### 2. 文章详情页 (Article Detail)

- 完整文章内容展示
- 文章元信息（作者、发布时间、分类、标签）
- 目录导航（可选）
- 社交分享功能
- 相关文章推荐

#### 3. 分类页面 (Categories)

- 分类列表展示
- 每个分类的文章数量
- 分类下的文章列表

#### 4. 标签页面 (Tags)

- 标签云展示
- 标签下的文章列表
- 热门标签高亮

#### 5. 归档页面 (Archive)

- 按时间归档的文章列表
- 年份/月份导航
- 时间线展示

#### 6. 关于页面 (About)

- 博主介绍
- 网站统计信息
- 联系方式

#### 7. 评论系统

- 文章评论展示
- 评论回复功能
- 评论分页
- 评论排序（时间、热度）

### 扩展功能

#### 1. 搜索功能

- 全文搜索
- 搜索结果高亮
- 搜索建议

#### 2. RSS 订阅

- RSS feed 生成
- 订阅按钮

#### 3. 主题切换

- 深色/浅色主题
- 自定义主题色

#### 4. 响应式设计

- 移动端适配
- 平板适配

#### 5. SEO 优化

- 服务端渲染 (SSR) 或静态生成
- 元数据管理
- 结构化数据

#### 6. 性能优化

- 图片懒加载
- 代码分割
- 缓存策略

## API 接口设计

基于现有的后端 API，前台项目主要使用以下公开接口：

### 文章相关

#### GET /api/articles

获取文章列表（公开接口）

**查询参数**:

```typescript
interface ArticleListParams {
  page?: number; // 页码，默认 1
  pageSize?: number; // 每页数量，默认 10
  typeId?: number; // 分类ID
  labelId?: number; // 标签ID
  status?: "published"; // 只获取已发布文章
  keyword?: string; // 搜索关键词
}
```

**响应数据**:

```typescript
interface ArticleListResponse {
  list: Article[];
  total: number;
  page: number;
  pageSize: number;
}

interface Article {
  id: number;
  title: string;
  summary: string;
  coverImage: string;
  viewCount: number;
  status: "published";
  type: {
    id: number;
    typeName: string;
  };
  labels: {
    id: number;
    labelName: string;
  }[];
  createdAt: string;
}
```

#### GET /api/articles/:id

获取文章详情

**响应数据**:

```typescript
interface ArticleDetail {
  id: number;
  title: string;
  summary: string;
  content: string; // HTML 内容
  coverImage: string;
  viewCount: number;
  type: Category;
  labels: Tag[];
  createdAt: string;
  updatedAt: string;
}
```

### 分类相关

#### GET /api/types

获取分类列表

**响应数据**:

```typescript
interface CategoryListResponse {
  list: Category[];
  total: number;
  page: number;
  pageSize: number;
}

interface Category {
  id: number;
  typeName: string;
  articleCount: number;
}
```

### 标签相关

#### GET /api/labels

获取标签列表

**响应数据**:

```typescript
interface TagListResponse {
  list: Tag[];
  total: number;
  page: number;
  pageSize: number;
}

interface Tag {
  id: number;
  labelName: string;
  articleCount: number;
}
```

### 评论相关

#### GET /api/comments

获取评论列表

**查询参数**:

```typescript
interface CommentListParams {
  page?: number;
  pageSize?: number;
  articleId?: number; // 按文章筛选
  status?: "approved"; // 只获取已审核评论
}
```

**响应数据**:

```typescript
interface CommentListResponse {
  list: Comment[];
  total: number;
  page: number;
  pageSize: number;
}

interface Comment {
  id: number;
  articleId: number;
  parentId: number | null;
  authorName: string;
  authorEmail: string;
  content: string;
  likeCount: number;
  status: "approved";
  createAt: string;
  replies?: Comment[];
}
```

#### POST /api/comments

发布评论（公开接口，无需认证）

**请求体**:

```typescript
interface CreateCommentData {
  articleId: number;
  parentId?: number;
  authorName: string;
  authorEmail: string;
  content: string;
}
```

### 网站配置

#### GET /api/settings

获取网站配置

**响应数据**:

```typescript
interface SettingsResponse {
  [key: string]: {
    value: string;
    type: "text" | "image" | "html" | "boolean";
    description: string;
  };
}
```

常用配置项：

- `site_name`: 网站名称
- `site_description`: 网站描述
- `site_logo`: 网站Logo
- `site_author`: 博主名称
- `site_bio`: 博主简介

## 项目结构建议

```
myblog-blog/
├── public/                 # 静态资源
├── src/
│   ├── api/               # API 接口
│   │   └── index.ts
│   ├── components/        # 公共组件
│   │   ├── layout/        # 布局组件
│   │   │   ├── Header.vue
│   │   │   ├── Footer.vue
│   │   │   ├── Sidebar.vue
│   │   │   └── Layout.vue
│   │   ├── common/        # 通用组件
│   │   │   ├── ArticleCard.vue
│   │   │   ├── Comment.vue
│   │   │   ├── Pagination.vue
│   │   │   └── Loading.vue
│   │   └── ui/            # UI 组件
│   ├── composables/       # 组合式函数
│   │   ├── useArticle.ts
│   │   ├── useComment.ts
│   │   └── useSettings.ts
│   ├── layouts/           # 页面布局
│   │   └── default.vue
│   ├── pages/             # 页面组件
│   │   ├── index.vue      # 首页
│   │   ├── article/       # 文章相关
│   │   │   ├── [id].vue   # 文章详情
│   │   │   └── index.vue  # 文章列表
│   │   ├── category/      # 分类页面
│   │   │   ├── [id].vue
│   │   │   └── index.vue
│   │   ├── tag/           # 标签页面
│   │   │   ├── [id].vue
│   │   │   └── index.vue
│   │   ├── archive.vue    # 归档页面
│   │   ├── about.vue      # 关于页面
│   │   └── search.vue     # 搜索页面
│   ├── stores/            # 状态管理
│   │   ├── article.ts
│   │   ├── category.ts
│   │   ├── tag.ts
│   │   └── settings.ts
│   ├── types/             # 类型定义
│   │   └── index.ts
│   ├── utils/             # 工具函数
│   │   ├── request.ts
│   │   ├── format.ts
│   │   └── constants.ts
│   ├── styles/            # 样式文件
│   │   ├── main.css
│   │   ├── variables.css
│   │   └── components.css
│   ├── App.vue
│   └── main.ts
├── .env                   # 环境变量
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 页面设计建议

### 首页设计

```
┌─────────────────────────────────────┐
│              Header                 │
│  [Logo] [Nav: 首页 分类 标签 归档 关于] │
├─────────────────────────────────────┤
│                                     │
│         搜索框                      │
│                                     │
├─────────────────────────────────────┤
│  精选文章 / 最新文章                 │
│  ┌─────────────────┐ ┌─────────────┐ │
│  │   文章卡片        │ │   文章卡片   │ │
│  │  [封面图]        │ │  [封面图]   │ │
│  │  标题            │ │  标题       │ │
│  │  摘要            │ │  摘要       │ │
│  │  [分类] [标签]    │ │  [分类] [标签]│ │
│  └─────────────────┘ └─────────────┘ │
│                                     │
│  分页组件                           │
├─────────────────────────────────────┤
│              Footer                 │
│  © 2024 MyBlog | 关于 | RSS         │
└─────────────────────────────────────┘
```

### 文章详情页设计

```
┌─────────────────────────────────────┐
│              Header                 │
├─────────────────────────────────────┤
│  面包屑导航: 首页 > 分类 > 文章标题   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐ │
│  │        文章标题                  │ │
│  ├─────────────────────────────────┤ │
│  │  作者 | 发布时间 | 阅读量         │ │
│  ├─────────────────────────────────┤ │
│  │  [分类标签] [标签1] [标签2]       │ │
│  ├─────────────────────────────────┤ │
│  │                                 │ │
│  │        文章内容                  │ │
│  │        (富文本)                  │ │
│  │                                 │ │
│  └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│  分享按钮 | 点赞按钮 | 评论按钮       │
├─────────────────────────────────────┤
│  相关文章推荐                        │
├─────────────────────────────────────┤
│  评论区                              │
│  ┌─────────────────┐                 │
│  │   评论列表       │                 │
│  │   嵌套回复       │                 │
│  └─────────────────┘                 │
│  评论表单                            │
└─────────────────────────────────────┘
```

## 组件架构设计

### 核心组件

#### 1. Layout 组件

```vue
<template>
  <div class="layout">
    <Header />
    <main class="main-content">
      <slot />
    </main>
    <Footer />
  </div>
</template>
```

#### 2. ArticleCard 组件

```vue
<template>
  <article class="article-card">
    <img v-if="article.coverImage" :src="article.coverImage" alt="封面" />
    <h3>{{ article.title }}</h3>
    <p class="summary">{{ article.summary }}</p>
    <div class="meta">
      <span class="category">{{ article.type.typeName }}</span>
      <span v-for="tag in article.labels" :key="tag.id" class="tag">
        {{ tag.labelName }}
      </span>
      <time>{{ formatDate(article.createdAt) }}</time>
    </div>
  </article>
</template>
```

#### 3. Comment 组件

```vue
<template>
  <div class="comment">
    <div class="comment-header">
      <span class="author">{{ comment.authorName }}</span>
      <time>{{ formatDate(comment.createAt) }}</time>
    </div>
    <div class="comment-content" v-html="comment.content"></div>
    <div class="comment-actions">
      <button @click="likeComment">👍 {{ comment.likeCount }}</button>
      <button @click="showReplyForm = true">回复</button>
    </div>
    <!-- 回复表单 -->
    <CommentForm
      v-if="showReplyForm"
      :parentId="comment.id"
      :articleId="comment.articleId"
      @submitted="onReplySubmitted"
    />
    <!-- 子评论 -->
    <div v-if="comment.replies" class="replies">
      <Comment
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
      />
    </div>
  </div>
</template>
```

### 组合式函数

#### useArticle

```typescript
export function useArticle() {
  const articles = ref<Article[]>([]);
  const loading = ref(false);
  const total = ref(0);

  const fetchArticles = async (params: ArticleListParams = {}) => {
    loading.value = true;
    try {
      const response = await api.article.getList(params);
      articles.value = response.data.list;
      total.value = response.data.total;
    } finally {
      loading.value = false;
    }
  };

  return {
    articles: readonly(articles),
    loading: readonly(loading),
    total: readonly(total),
    fetchArticles,
  };
}
```

#### useSettings

```typescript
export function useSettings() {
  const settings = ref<Record<string, any>>({});

  const fetchSettings = async () => {
    const response = await api.setting.getList();
    settings.value = response.data;
  };

  const getSetting = (key: string) => {
    return settings.value[key]?.value;
  };

  return {
    settings: readonly(settings),
    fetchSettings,
    getSetting,
  };
}
```

## 状态管理设计

### Pinia Store 结构

```typescript
// stores/article.ts
export const useArticleStore = defineStore("article", {
  state: () => ({
    articles: [] as Article[],
    currentArticle: null as ArticleDetail | null,
    categories: [] as Category[],
    tags: [] as Tag[],
    loading: false,
  }),

  actions: {
    async fetchArticles(params?: ArticleListParams) {
      this.loading = true;
      try {
        const response = await api.article.getList(params);
        this.articles = response.data.list;
      } finally {
        this.loading = false;
      }
    },

    async fetchArticleDetail(id: number) {
      this.loading = true;
      try {
        const response = await api.article.getDetail(id);
        this.currentArticle = response.data;
      } finally {
        this.loading = false;
      }
    },
  },
});
```

## SEO 和性能优化

### SEO 优化

1. **动态 Meta 标签**

```typescript
useHead({
  title: article.title,
  meta: [
    { name: "description", content: article.summary },
    { property: "og:title", content: article.title },
    { property: "og:description", content: article.summary },
    { property: "og:image", content: article.coverImage },
  ],
});
```

2. **结构化数据**

```typescript
useJsonld({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.title,
  description: article.summary,
  author: {
    "@type": "Person",
    name: settings.site_author,
  },
});
```

### 性能优化

1. **图片优化**
   - 使用 WebP 格式
   - 懒加载
   - 响应式图片

2. **代码分割**
   - 路由懒加载
   - 组件异步加载

3. **缓存策略**
   - API 响应缓存
   - 静态资源缓存

## 部署建议

### 静态站点生成 (SSG)

使用 VitePress 或 Nuxt.js 生成静态站点：

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["vue", "vue-router"],
          ui: ["element-plus"],
        },
      },
    },
  },
});
```

### CDN 部署

- 静态资源部署到 CDN
- API 保持在服务器上
- 配置缓存策略

## 总结

本参考文档基于现有的 MyBlog 后端 API 和管理后台经验，为前台项目提供了完整的设计指南。前台项目应注重用户体验、内容展示和性能优化，同时保持与后端 API 的兼容性。

关键要点：

- 使用 Vue 3 + TypeScript 技术栈
- 采用组合式 API 和 Pinia 状态管理
- 注重 SEO 和性能优化
- 保持响应式设计
- 提供良好的用户交互体验

通过遵循这些设计原则，可以构建一个现代化、高性能的个人博客前台网站。</content>
<parameter name="filePath">d:\myblog\copliot-myblog-blog-reference.md
