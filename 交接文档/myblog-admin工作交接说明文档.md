# MyBlog Admin 工作交接说明文档

## 1. 文档目的

本文档用于 `myblog-vue/myblog-admin` 后台管理前端的工作交接，帮助接手同事快速了解：

- 项目定位与现状
- 技术栈与运行方式
- 目录结构
- 页面与路由设计
- 鉴权与状态管理
- 与后端 `myblog-express` 的接口关系
- 已知注意事项与后续建议

---

## 2. 项目概况

### 2.1 项目定位

`myblog-admin` 是 MyBlog 的**后台管理系统前端**，采用 **Vue 3 + TypeScript + Vite** 技术栈，主要服务于博主本人进行内容管理与站点配置。

### 2.2 当前功能范围

当前后台已覆盖以下能力：

- 登录认证
- 仪表盘
- 文章管理
- 文章编辑
- 分类管理
- 标签管理
- 评论管理
- 个人资料管理
- 网站配置管理

### 2.3 当前状态

该项目当前仍是 **Vue 3 + Vite SPA**，未迁移为 Nuxt。

与前台博客不同，后台目前更偏管理后台应用形态，不以 SEO 为目标。

---

## 3. 技术栈

| 类别 | 方案 |
| --- | --- |
| 框架 | Vue 3 |
| 语言 | TypeScript |
| 构建工具 | Vite |
| 路由 | Vue Router |
| 状态管理 | Pinia |
| UI 组件 | Element Plus |
| HTTP 请求 | Axios |
| 富文本编辑 | `@vueup/vue-quill` |
| 图表 | ECharts |
| 日期处理 | dayjs |

### 3.1 运行要求

- Node.js `20.19+`
- npm

---

## 4. 目录结构

```text
myblog-admin/
├─ public/                      # 静态资源
├─ src/
│  ├─ api/                      # API 封装
│  ├─ layouts/                  # 布局组件
│  ├─ router/                   # 路由配置与守卫
│  ├─ stores/                   # Pinia 状态
│  ├─ types/                    # TS 类型
│  ├─ utils/                    # 请求封装等工具
│  ├─ views/                    # 页面
│  │  ├─ article/
│  │  │  ├─ ArticleList.vue
│  │  │  └─ ArticleEditor.vue
│  │  ├─ Dashboard.vue
│  │  ├─ Login.vue
│  │  ├─ TypeManage.vue
│  │  ├─ LabelManage.vue
│  │  ├─ CommentManage.vue
│  │  ├─ Profile.vue
│  │  └─ Settings.vue
│  ├─ App.vue
│  └─ main.ts
├─ index.html
├─ vite.config.ts
├─ package.json
├─ README.md
└─ 工作交接说明文档.md
```

---

## 5. 页面与路由

关键文件：`src/router/index.ts`

### 5.1 路由结构

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/login` | `views/Login.vue` | 登录页 |
| `/admin/dashboard` | `views/Dashboard.vue` | 仪表盘 |
| `/admin/articles` | `views/article/ArticleList.vue` | 文章列表 |
| `/admin/articles/edit/:id?` | `views/article/ArticleEditor.vue` | 新建/编辑文章 |
| `/admin/types` | `views/TypeManage.vue` | 分类管理 |
| `/admin/labels` | `views/LabelManage.vue` | 标签管理 |
| `/admin/comments` | `views/CommentManage.vue` | 评论管理 |
| `/admin/profile` | `views/Profile.vue` | 个人资料 |
| `/admin/settings` | `views/Settings.vue` | 网站配置 |

### 5.2 布局

关键文件：`src/layouts/AdminLayout.vue`

职责：

- 左侧侧边栏菜单
- 顶部用户区域
- 主内容区
- 底部区域

当前布局中已经接入：

- 站点 logo / 站点名
- 菜单折叠
- 个人资料跳转
- 退出登录

---

## 6. 鉴权与登录机制

### 6.1 当前鉴权方式

后台使用 **JWT Token**。

关键文件：

- `src/stores/user.ts`
- `src/router/index.ts`
- `src/utils/request.ts`

### 6.2 登录状态存储

当前存储方式：

- `localStorage.token`
- `localStorage.userInfo`

### 6.3 路由守卫逻辑

在 `src/router/index.ts` 中：

- `/admin/**` 默认视为受保护路由
- 访问受保护路由时：
  - 有 token：尝试拉取用户信息
  - 无 token：跳转 `/login`
- 已登录访问 `/login` 时：
  - 自动跳转 `/admin/dashboard`

### 6.4 请求拦截器

在 `src/utils/request.ts` 中：

- 请求前自动注入 `Authorization: Bearer <token>`
- 响应 401 时：
  - 清空本地 token
  - 清空用户信息
  - 触发退出登录

---

## 7. API 集成说明

### 7.1 后端地址

当前写死在：

`src/utils/request.ts`

```ts
baseURL: 'http://localhost:3000/api/v1'
```

说明：

- 当前没有走 env 注入
- 后续如果要部署到不同环境，建议把该值改成 `.env` 配置

### 7.2 API 模块

关键文件：`src/api/index.ts`

当前已封装的主要模块：

- `type`
- `label`
- `article`
- `comment`
- `blogger`
- `setting`

### 7.3 与后端接口关系

后台主要依赖 `myblog-express` 提供的 REST API：

| 模块 | 接口前缀 |
| --- | --- |
| 登录/资料 | `/blogger` |
| 文章 | `/articles` |
| 分类 | `/types` |
| 标签 | `/labels` |
| 评论 | `/comments` |
| 设置 | `/settings` |
| 上传 | `/upload` |
| 仪表盘 | `/dashboard` |

---

## 8. 主要页面职责

### 8.1 Login.vue

职责：

- 登录表单
- 提交用户名/密码
- 登录成功后跳转后台首页

### 8.2 Dashboard.vue

职责：

- 展示站点统计数据
- 展示最新评论或概览信息

依赖后端：

- `/dashboard`

### 8.3 ArticleList.vue

职责：

- 分页显示文章
- 根据状态/关键字筛选
- 进入编辑页
- 删除/恢复/彻底删除文章

### 8.4 ArticleEditor.vue

职责：

- 新建或编辑文章
- 配置分类与标签
- 编辑正文
- 上传封面图
- 保存草稿或发布文章

注意：

- 当前使用 `Vue Quill`
- 文章保存使用 `FormData`

### 8.5 TypeManage.vue / LabelManage.vue

职责：

- 分类/标签的增删改查
- 展示关联文章数量

### 8.6 CommentManage.vue

职责：

- 评论列表展示
- 评论状态审核
- 删除/恢复/彻底删除

### 8.7 Profile.vue

职责：

- 修改博主资料
- 上传头像
- 修改密码

### 8.8 Settings.vue

职责：

- 更新全站配置项
- 支持文本/图片等配置
- 与前台 `myblog-blog` 的展示与 SEO 直接联动

---

## 9. Pinia 状态说明

### 9.1 user store

关键文件：`src/stores/user.ts`

职责：

- 存储 token
- 存储 userInfo
- 登录
- 退出
- 拉取用户资料

### 9.2 settings store

关键文件：`src/stores/settings.ts`

职责：

- 管理全站配置
- 为后台布局提供站点 logo / 站点名

---

## 10. 当前后台与前台/后端的关系

### 10.1 与前台博客的关系

后台修改的站点设置、文章、分类、标签、评论，会直接影响：

- `myblog-blog` 前台展示
- 前台 SEO 信息
- 前台导航、页脚、文章详情页、标签页等内容

### 10.2 与后端的关系

后台不直接操作数据库，所有数据都经过 `myblog-express`。

因此：

- 后台异常排查时，前端与后端要联动看
- 如果后台页面空白或数据异常，先看请求是否成功，再看后端接口与数据库

---

## 11. 本地开发与构建

### 11.1 安装依赖

```bash
npm install
```

### 11.2 启动开发

```bash
npm run dev
```

### 11.3 类型检查

```bash
npm run type-check
```

### 11.4 构建

```bash
npm run build
```

### 11.5 预览

```bash
npm run preview
```

---

## 12. 已知问题与建议

### 12.1 当前问题

1. **baseURL 写死**
   - 当前后台请求地址写死为 `http://localhost:3000/api/v1`
   - 不利于多环境部署

2. **localStorage 依赖较重**
   - token 与 userInfo 都保存在浏览器本地
   - 需要注意 token 失效与清理逻辑

3. **README 内容混杂**
   - 现有 README 末尾混入了一些模板式 Vite 文档内容
   - 后续可整理精简

### 12.2 后续建议

1. 把 API 地址改成环境变量
2. 增加统一错误页或空状态页
3. 补充自动化测试
4. 为富文本编辑器上传和内容清洗增加更明确的约束

---

## 13. 建议优先阅读的文件

- `package.json`
- `src/router/index.ts`
- `src/utils/request.ts`
- `src/api/index.ts`
- `src/stores/user.ts`
- `src/layouts/AdminLayout.vue`
- `src/views/article/ArticleEditor.vue`
- `src/views/Settings.vue`

---

## 14. 交接结论

`myblog-admin` 当前是一个**功能完整的博客后台前端项目**，已经具备：

- 登录鉴权
- 内容管理
- 评论管理
- 配置管理

其主要依赖 `myblog-express` 提供 API。后续维护重点应放在：

1. 多环境配置
2. 请求与鉴权稳定性
3. 文章编辑器与上传链路
4. 与前台博客联动验证

