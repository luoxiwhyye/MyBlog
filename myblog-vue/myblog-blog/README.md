# MyBlog 前台

基于 **Nuxt 3 + TypeScript** 的博客前台工程（SSR/PWA），已从 Vue 3 + Vite SPA 重构为支持 SSR 的 Nuxt 应用，保留原有博客页面能力并复用现有 Express / Spring Boot API 契约（`/api/v1`）。

## 功能特性

- 🏠 页面：`/` 欢迎落地页（SSR）、`/home` 主站（ISR 60s）、文章详情、分类、标签、归档、关于、`/friends` 友链页、留言板、404；全站搜索由命令面板（`Ctrl/Cmd + K`）承载，不设独立搜索页
- 🧰 编程工具箱：编解码 / 格式化 / 哈希加密 / 文本处理 / 颜色工具 / 开发辅助，支持历史快照、收藏、复制反馈
- 📖 文章体验：评论区（回复/@提及）、代码高亮 + 行号 + 一键复制、目录导航、阅读进度、**正文图片灯箱预览**（点击放大/缩放/切换/关闭）、**字号/行距调节**、上一篇/下一篇 + 相关推荐
- 🎨 视觉与动效：主题色体系（后台可切换、按维度/亮暗独立）、暗色模式、滚动入场动画（`v-reveal`）、页面/布局 fade+blur 过渡、移动端 Mobile-First 适配
- 📊 渲染与性能：`/home`、归档/分类/标签 ISR、关于页 SWR、工具页纯客户端渲染；响应式图片 + LCP 优化；骨架屏；全局错误边界
- 🔎 SEO / 可发现性：titleTemplate、description、Open Graph、Twitter Card、canonical、JSON-LD；内置 `robots.txt` / `sitemap.xml` / **`rss.xml`**
- 📱 PWA：可安装（manifest）+ Workbox 缓存（API NetworkFirst、图片 CacheFirst、字体 StaleWhileRevalidate）
- 🔁 通过 Nuxt server route 代理后端 Express / Spring Boot API，并代理 `/uploads/**` 图片

## 技术栈

- **框架**: Nuxt 3（`@pinia/nuxt`、`@nuxt/image`、`@element-plus/nuxt`、`@vite-pwa/nuxt`）
- **语言**: TypeScript
- **渲染模式**: SSR + ISR / SWR / CSR 混合
- **状态管理**: Pinia
- **UI 组件库**: Element Plus
- **富文本**: markdown-it + highlight.js
- **日期处理**: Day.js
- **工具计算**: 浏览器原生 API + Web Worker
- **测试**: Vitest

## 安装和运行

### 环境要求

- Node.js 20.19+（`^20.19.0 || >=22.12.0`）
- npm / yarn / pnpm

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

应用默认运行在 `http://localhost:3001`（监听 `0.0.0.0`，同一 WiFi 下手机可直接访问），并经 Nuxt 内部 `/api/v1/*` 代理转发到后端 API。

### 4. 构建 / 预览 / 校验

```bash
npm run build        # 生成 .output/（Node 服务方式部署）
npm run preview      # 本地预览构建产物
npm run type-check   # nuxt typecheck
npm run test         # vitest 单元测试
```

## 路由与渲染策略

| 路由 | 渲染 |
| --- | --- |
| `/` | 欢迎落地页（SSR，`layouts/landing`，无 Header/Footer） |
| `/home` | 主站（ISR 60s） |
| `/archive` `/category/**` `/tag/**` | ISR 300s |
| `/about` | SWR 600s |
| `/article/**` `/friends` `/message-board` `/maintenance` | SSR |
| `/tools/**` | 纯客户端渲染（`ssr: false`） |
| `/uploads/**` | 代理到后端 |
| `/robots.txt` `/sitemap.xml` `/rss.xml` | Nitro handler |

## 项目结构

```text
api/                  # API 封装（复用原接口契约）
assets/css/           # 设计 Token（variables/mixins/functions）+ 全局样式
components/           # 通用组件（ArticleCard/SkeletonCard/BlogComment/EmptyState/...）与布局组件
composables/          # SEO、TOC、主题色、表情、工具等复用逻辑
config/tools.ts       # 工具箱元数据
layouts/              # Nuxt 布局（含 landing 落地布局）
locales/              # i18n 词条（zh / en）
pages/                # Nuxt 页面与约定式路由
plugins/              # Element Plus、error-boundary（错误边界）、scroll-reveal（滚动动画）
public/               # 静态资源（favicon / PWA 图标）
server/               # Nitro（api/v1 代理 + uploads 代理 + robots/rss/sitemap）
stores/               # Pinia（设置 / 博主 / 主题）
types/                # TypeScript 类型
utils/                # markdown、图片 URL 归一化、seo、gravatar、themeColor、工具计算
```

## 编程工具箱模块

- 入口页 `/tools`；动态工具页 `/tools/[category]/[tool]`；纯客户端渲染，不影响博客主体 SSR
- 已内置工具：
  - **编解码**：Base64、URL、Unicode、HTML Entity
  - **格式化**：JSON 工具、SQL 格式化、XML 格式化
  - **哈希与加密**：MD5、SHA 系列哈希、时间戳转换
  - **文本处理**：正则测试、字符统计、大小写转换
  - **颜色工具**：颜色转换 / 选择器
  - **开发辅助**：JWT 解析、二维码生成、密码生成器、Cron 表达式解析、JSON Diff
- 体验增强：快捷键 （Ctrl/Cmd+K）、历史快照、收藏与记忆、输入防抖、1MB 输入限制、一键复制反馈、示例、清空、交换、结果导出

## API 集成

1. 在 `api/` 中定义接口，`types/` 中定义类型
2. 优先通过 Nuxt 内部 `/api/v1/*` 代理访问后端（经 `server/api/v1/[...segments].ts`）
3. 图片经 `/uploads/**` 代理，避免手机端跨域问题

## 部署

- **Node 服务**：`npm run build` 生成 `.output/`，以 Node 服务方式运行（`node .output/server/index.mjs`）
- **Docker**：见仓库根目录 [docker-compose.yml](../../docker-compose.yml) 与 [DEPLOY.md](../../DEPLOY.md)，已注入 `NUXT_API_BASE` / `NUXT_SITE_URL` 构建参数

## 许可证

MIT

