# MyBlog

一个覆盖"内容生产 + 内容展示 + 站点配置 + 数据运营"的全栈个人博客系统。

## 项目简介

MyBlog 面向个人博主或小团队内容站点，目标是同时满足：

- 博主高效写作与运营管理
- 读者流畅阅读与互动体验
- 站点视觉与品牌可配置化

## 技术栈

| 层次   | 技术                                                                   |
| ------ | ---------------------------------------------------------------------- |
| 读者端 | Vue 3 · TypeScript · Element Plus · Pinia · markdown-it · highlight.js |
| 管理端 | Vue 3 · TypeScript · Element Plus · Pinia · ECharts · Vue Quill        |
| 后端   | Node.js · Express 5 · MySQL2 · JWT · Multer                            |

## 项目结构

```
myblog/
├── myblog-express/     # 后端服务
├── myblog-vue/
│   ├── myblog-admin/   # 管理端
│   └── myblog-blog/    # 读者端
```

## 功能概览

### 读者端（myblog-blog）

- 首页文章流，分类 / 标签导航
- 全文搜索与结果关键词高亮
- 文章详情、目录导航、Markdown 渲染与代码高亮
- 评论与嵌套回复，支持最新 / 最热排序与分页
- 统一站点 Logo 与 Favicon

### 管理端（myblog-admin）

- 富文本文章编辑（Quill）、封面与摘要管理
- 分类 / 标签管理
- 评论审核与回收站（支持恢复 / 彻底删除）
- 文章软删除、回收站恢复与彻底删除
- 网站配置（Logo、Favicon 图片上传）
- 仪表盘：关键指标、发布趋势图、分类分布图

### 后端服务（myblog-express）

- RESTful API，模块化路由 / 控制器 / 模型分层
- JWT 身份认证与角色中间件
- Multer 文件上传与静态资源托管
- 评论级联删除（事务内递归，无需数据库外键级联）

## 快速开始

### 前置条件

- Node.js >= 18
- MySQL >= 8.0

### 1. 初始化数据库

```bash
# 在 MySQL 中执行
mysql -u root -p < myblog-express/myblog.sql
```

### 2. 配置后端环境变量

在 `myblog-express/` 目录下创建 `.env` 文件：

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=myblog
JWT_SECRET=your_jwt_secret
```

### 3. 启动后端

```bash
cd myblog-express
npm install

# 初始化管理员账号（首次运行）
npm run init-blogger

# 开发模式（热重载）
npm run dev

# 生产模式
npm start
```

### 4. 启动管理端

```bash
cd myblog-vue/myblog-admin
npm install
npm run dev
```

### 5. 启动读者端

```bash
cd myblog-vue/myblog-blog
npm install
npm run dev
```

## 构建部署

```bash
# 管理端构建
cd myblog-vue/myblog-admin
npm run build

# 读者端构建
cd myblog-vue/myblog-blog
npm run build
```

构建产物在各自的 `dist/` 目录，可由 Nginx 或任意静态服务器托管。后端同样可通过 PM2 等工具以生产模式运行。

## 适用场景

- 个人技术博客
- 团队 / 社区内容站点
- 全栈学习与二次开发实训项目

## 未来规划

- 回收站批量操作
- 全文检索能力
- 文章版本管理
- 多角色权限体系
- 多站点 / 插件化扩展支持

## License

ISC
