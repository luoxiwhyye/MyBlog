# MyBlog 前台项目工作交接说明文档

## 1. 文档目的

本文档用于当前 `myblog-vue/myblog-blog` 项目的工作交接，帮助后续接手同事快速理解：

- 项目当前状态
- 技术架构与关键目录
- 已完成的核心功能
- 前后端集成方式
- SEO 设计
- 工具箱模块设计
- 本地开发、构建与部署方式
- 已知风险与后续优化建议

---

## 2. 项目概况

### 2.1 项目定位

该项目是 **MyBlog 的前台站点**，当前已从原先的 Vue 3 + Vite SPA 重构为 **Nuxt 3 + TypeScript** 应用。

当前项目同时承载两类能力：

1. **博客前台**
   - 首页
   - 文章详情
   - 分类
   - 标签
   - 归档
   - 关于
   - 搜索

2. **编程工具箱**
   - 独立路由空间 `/tools`
   - 客户端渲染
   - 无需登录、无需后端数据库
   - 纯前端计算

### 2.2 当前完成状态

当前项目已完成：

- Nuxt 3 架构迁移
- 博客前台页面迁移
- 基础 SEO 能力接入
- `robots.txt` 与 `sitemap.xml`
- 通过 Nuxt server route 代理后端 API
- 工具箱模块全量落地
- `npm run type-check` 通过
- `npm run build` 通过

---

## 3. 技术栈

### 3.1 核心技术

| 类别 | 方案 |
| --- | --- |
| 前端框架 | Nuxt 3 |
| 语言 | TypeScript |
| UI 组件 | Element Plus |
| 状态管理 | Pinia |
| 路由 | Nuxt Pages 约定式路由 |
| Markdown/代码高亮 | markdown-it + highlight.js |
| 日期处理 | dayjs |
| 工具计算 | 浏览器原生 API + Web Worker |

### 3.2 运行要求

- Node.js `20.19+`
- npm

---

## 4. 目录结构说明

以下是当前项目中最重要的目录：

```text
myblog-blog/
├─ api/                    # 前端 API 封装，复用 Express 接口契约
├─ assets/                 # 全局样式
├─ components/             # 通用组件、布局组件、工具箱组件
├─ composables/            # 可复用逻辑（SEO、工具逻辑）
├─ config/                 # 工具箱元数据配置
├─ layouts/                # Nuxt 布局
├─ pages/                  # 页面与路由
├─ plugins/                # Nuxt 插件
├─ public/                 # 静态资源，如 favicon、robots.txt
├─ server/                 # 服务端路由、后端 API 代理、sitemap
├─ stores/                 # Pinia store
├─ types/                  # 类型定义
├─ utils/                  # 通用工具方法与工具箱算法
├─ app.vue                 # 应用根组件
├─ nuxt.config.ts          # Nuxt 配置
├─ README.md               # 项目基础说明
└─ 工作交接说明文档.md       # 当前交接文档
```

---

## 5. 页面与路由说明

### 5.1 博客页面

| 路由 | 说明 | 文件 |
| --- | --- | --- |
| `/` | 首页 | `pages/index.vue` |
| `/article/[id]` | 文章详情页 | `pages/article/[id].vue` |
| `/category` | 分类列表页 | `pages/category/index.vue` |
| `/category/[id]` | 分类详情页 | `pages/category/[id].vue` |
| `/tag` | 标签列表页 | `pages/tag/index.vue` |
| `/tag/[id]` | 标签详情页 | `pages/tag/[id].vue` |
| `/archive` | 归档页 | `pages/archive.vue` |
| `/about` | 关于页 | `pages/about.vue` |
| `/search` | 搜索页 | `pages/search.vue` |

### 5.2 工具箱页面

| 路由 | 说明 | 文件 |
| --- | --- | --- |
| `/tools` | 工具箱首页 | `pages/tools/index.vue` |
| `/tools/[category]/[tool]` | 工具详情页 | `pages/tools/[category]/[tool].vue` |

### 5.3 渲染策略

- **博客页面**：默认 SSR / 服务端渲染友好
- **工具箱页面**：页面级 `definePageMeta({ ssr: false })`

这里要特别注意：

- 之前曾尝试通过 `nuxt.config.ts` 的 `routeRules` 对 `/tools/**` 关闭 SSR
- 该方案在 `nuxt dev` 下触发了 `#app-manifest` 解析错误
- 当前已改为 **页面级 `ssr: false`**
- 工具详情页中的 `ClientOnly` 也已经移除，否则会导致只渲染空占位节点

这部分属于已经踩过的坑，后续不要回退。

---

## 6. 布局与全局结构

### 6.1 默认布局

文件：`layouts/default.vue`

职责：

- 挂载 `Header` / `Footer`
- 提供博客页面公共骨架
- 统一输出全站级 SEO 头信息

### 6.2 工具箱布局

文件：`layouts/tools.vue`

职责：

- 复用全站 `Header` / `Footer`
- 提供工具箱独立的页面骨架
- 提供左侧工具导航 / 移动端抽屉 / 快捷切换弹窗
- 提供 `Ctrl/Cmd + K` 工具快速切换

### 6.3 根组件

文件：`app.vue`

职责：

- 渲染全局 Loading Indicator
- 挂载 `NuxtLayout` 与 `NuxtPage`

---

## 7. SEO 实现说明

### 7.1 全站 SEO

关键文件：

- `nuxt.config.ts`
- `layouts/default.vue`
- `composables/usePageSeo.ts`
- `utils/seo.ts`

全站能力包括：

- `titleTemplate`
- 默认 `description`
- Open Graph
- Twitter Card
- `author`
- favicon
- canonical

### 7.2 页面级 SEO

博客页面通过 `usePageSeo.ts` 动态输出：

- 页面 title
- description
- og meta
- twitter meta
- canonical

文章页额外输出：

- `article:published_time`
- `article:modified_time`
- `article:tag`

### 7.3 robots / sitemap

关键文件：

- `public/robots.txt`
- `server/routes/sitemap.xml.ts`
- `server/utils/backend-api.ts`

说明：

- `robots.txt` 提供抓取规则
- `sitemap.xml` 服务端动态生成
- sitemap 中包含静态路由和可抓取的动态文章/分类/标签路由

---

## 8. 前后端集成说明

### 8.1 后端来源

前端并不直接重写博客后端，而是继续复用 `myblog-express` 提供的 API。

### 8.2 代理方式

关键文件：

- `server/api/v1/[...segments].ts`
- `api/index.ts`
- `utils/request.ts`

当前访问方式：

- 前端统一请求 `/api/v1/*`
- Nuxt server route 再代理到真实后端
- 真实后端地址由 `runtimeConfig.apiBase` 决定

### 8.3 环境变量

在 `nuxt.config.ts` 中使用：

```env
NUXT_API_BASE=http://localhost:3000/api/v1
NUXT_SITE_URL=http://localhost:3001
```

说明：

- `NUXT_API_BASE`：Express 后端地址
- `NUXT_SITE_URL`：当前前台站点绝对地址，用于 canonical / OG / sitemap

---

## 9. 状态管理说明

### 9.1 Store

当前较关键的 store 是：

- `stores/settings.ts`

职责：

- 拉取全站设置
- 缓存 settings
- 提供 `ensureSettings()` 确保页面侧可直接读取设置值
- 提供 `getSetting(key)` 读取单项配置

### 9.2 常用设置项

包括但不限于：

- `site_name`
- `site_description`
- `site_author`
- `site_logo`
- `site_favicon`
- `site_icp`
- `site_bio`
- `friend_links`

这些字段会用于：

- 页面显示
- SEO 输出
- Header / Footer 渲染

---

## 10. 工具箱模块说明

### 10.1 模块定位

工具箱是当前项目新增的重要功能模块，特点如下：

- 路由空间独立：`/tools`
- 纯前端处理
- 不依赖数据库
- 不要求登录
- 与博客主体解耦

### 10.2 工具箱目录

```text
components/tools/
├─ ToolLayout.vue
├─ ToolInput.vue
├─ ToolOutput.vue
├─ ToolControls.vue
├─ ToolSidebar.vue
└─ ToolWorkbench.vue

config/
└─ tools.ts

composables/
└─ useTool.ts

types/
└─ tool.ts

utils/tools/
├─ encoding.ts
├─ formatter.ts
├─ crypto.ts
├─ text.ts
├─ color.ts
├─ processor.ts
└─ processor.worker.ts
```

### 10.3 核心设计

工具箱采用 **配置驱动 + 通用工作台 + 纯函数算法** 的结构：

1. `config/tools.ts` 定义工具元数据
2. `pages/tools/[category]/[tool].vue` 根据路由读取工具配置
3. `ToolWorkbench.vue` 统一挂接输入、控制区、输出区
4. `useTool.ts` 负责状态管理、处理逻辑、防抖、持久化、导出、复制等
5. `processor.ts` 根据工具 id 调度具体算法
6. `processor.worker.ts` 在浏览器 Worker 中执行计算

### 10.4 已实现工具清单

#### 编解码

- Base64 编解码
- URL 编解码
- Unicode 转换
- HTML Entity 编解码

#### 格式化

- JSON 格式化
- JSON 压缩
- SQL 格式化
- XML 格式化

#### 哈希与时间

- MD5 生成
- SHA-1 / SHA-256 / SHA-512
- 时间戳转换

#### 文本处理

- 正则测试
- 字符统计
- 大小写转换

#### 颜色工具

- HEX ↔ RGB
- 颜色选择器

### 10.5 已实现的体验增强

- 输入防抖处理
- 输入大小限制（默认 1MB）
- localStorage 记忆最近输入和选项
- 复制结果
- 清空输入
- 示例填充
- 输入输出交换（支持的工具）
- 结果导出为文件
- `Ctrl/Cmd + K` 快捷切换工具
- Worker 异步计算

### 10.6 工具箱的关键文件职责

#### `types/tool.ts`

定义：

- 工具元数据类型
- 输入字段类型
- 工具选项类型
- 工具结果结构

#### `config/tools.ts`

定义：

- 工具分类
- 工具条目
- 每个工具的：
  - 名称
  - 描述
  - 图标
  - 输入项
  - 配置项
  - 示例
  - 输出文件类型

#### `composables/useTool.ts`

处理：

- 输入状态
- 选项状态
- 防抖处理
- Worker 调度
- 本地缓存
- 复制 / 导出 / 清空 / 示例 / 交换

#### `utils/tools/processor.ts`

按 `toolId` 路由到具体算法函数。

#### `utils/tools/processor.worker.ts`

在浏览器 Worker 中执行工具计算，避免主线程卡顿。

---

## 11. 已踩坑与修复记录

### 11.1 `routeRules + ssr: false` 导致 dev 报错

问题：

- 在 `nuxt.config.ts` 中对 `/tools/**` 使用 `routeRules: { ssr: false }`
- `npm run dev` 报：
  - `Failed to resolve import "#app-manifest"`

结论：

- 该方式在当前 Nuxt 版本下 dev 兼容性不好

处理：

- 删除 `routeRules`
- 改为在工具页页面级使用：

```ts
definePageMeta({
  layout: "tools",
  ssr: false,
})
```

### 11.2 `ClientOnly` 导致工具区只渲染空 span

问题：

- 工具详情页已是客户端渲染页面
- 外面又包了一层 `ClientOnly`
- 导致最终 slot 区域只出现一个空占位节点

处理：

- 移除工具页中的 `ClientOnly`
- 直接渲染 `ToolWorkbench`

### 11.3 类型与构建问题

曾修复的问题包括：

- API query 参数类型不兼容
- `ToolControls` 联合类型访问 `min/max/step` 报错
- 工具选项合并后出现 `undefined` 类型问题
- 引用了不存在的 Element Plus 图标 `DocumentCode`
- `$fetch` body 类型不匹配

这些问题都已经修复，并通过了类型检查和构建验证。

---

## 12. 本地开发说明

### 12.1 安装依赖

```bash
npm install
```

### 12.2 启动开发环境

```bash
npm run dev
```

默认地址：

```text
http://localhost:3001
```

### 12.3 类型检查

```bash
npm run type-check
```

### 12.4 生产构建

```bash
npm run build
```

### 12.5 预览构建结果

```bash
node .output/server/index.mjs
```

---

## 13. 构建与运行现状

### 13.1 当前验证结论

当前项目已确认：

- `npm run type-check` 通过
- `npm run build` 通过
- `npm run dev` 可启动

### 13.2 当前非阻塞告警

构建中仍存在以下非阻塞项：

1. **chunk 体积偏大**
   - 部分客户端 chunk 超过 500 kB
   - 不影响构建成功
   - 但后续可继续优化拆包

2. **Node Deprecation Warning**
   - 来自部分上游依赖的 `DEP0155`
   - 当前不影响功能和构建
   - 暂不作为阻塞项处理

---

## 14. 后续优化建议

### 14.1 优先级高

1. **优化前端 chunk 大小**
   - 工具箱逻辑可进一步拆分
   - 可考虑细化动态导入
   - 必要时为大组件手动分 chunk

2. **为工具箱补充自动化测试**
   - 当前主要依赖人工验证
   - 建议为纯函数工具添加单元测试

3. **补充错误监控**
   - 例如 Worker 初始化失败、浏览器剪贴板不可用等场景

### 14.2 优先级中

1. **优化工具箱首页搜索与分类体验**
2. **增加工具使用统计埋点**
3. **继续完善 README 与开发文档**

### 14.3 优先级低

1. **暗色主题适配增强**
2. **导出文件命名规则优化**
3. **命令面板键盘上下选择支持**

---

## 15. 交接时建议重点关注的文件

如果后续同事需要快速接手，建议优先阅读这些文件：

### 核心配置

- `nuxt.config.ts`
- `package.json`

### 博客 SEO / 主体能力

- `layouts/default.vue`
- `composables/usePageSeo.ts`
- `server/routes/sitemap.xml.ts`
- `server/api/v1/[...segments].ts`

### 工具箱核心

- `pages/tools/index.vue`
- `pages/tools/[category]/[tool].vue`
- `layouts/tools.vue`
- `config/tools.ts`
- `types/tool.ts`
- `composables/useTool.ts`
- `components/tools/ToolWorkbench.vue`
- `utils/tools/processor.ts`
- `utils/tools/processor.worker.ts`

### 设置与接口

- `stores/settings.ts`
- `api/index.ts`
- `utils/request.ts`

---

## 16. 交接结论

当前项目已经处于 **可继续开发、可本地运行、可生产构建** 的状态。

当前最重要的事实如下：

- 博客前台已完成 Nuxt 化
- SEO 基础能力已接入
- 工具箱模块已完整接入并可切换使用
- 工具页采用页面级 CSR，避免影响博客 SSR
- 类型检查与生产构建均已通过

如果后续要继续迭代，建议先从：

1. 工具箱拆包优化
2. 纯函数单测补齐
3. 交互体验增强

这三个方向开始。

