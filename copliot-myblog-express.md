# MyBlog Express 后端系统

## 项目概述

MyBlog Express 是一个基于 Node.js 和 Express.js 构建的个人博客管理系统后端 API。该系统提供了完整的博客管理功能，包括文章管理、分类管理、标签管理、评论管理、用户认证、文件上传等模块。后端采用 RESTful API 设计，使用 MySQL 数据库存储数据，支持 JWT 身份认证和文件上传功能。

## 技术栈

- **运行环境**: Node.js 18+
- **Web 框架**: Express.js 5.x
- **数据库**: MySQL 8.0+
- **ORM**: 原生 SQL 查询 (使用 mysql2)
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcryptjs
- **文件上传**: Multer
- **安全**: Helmet, CORS
- **日志**: Morgan
- **验证**: express-validator
- **其他工具**: dotenv, dayjs

## 功能模块

### 1. 用户认证 (Blogger)

- JWT Token 认证
- 博主登录/登出
- 个人资料管理
- 密码修改
- 头像上传

### 2. 文章管理 (Article)

- 文章的增删改查
- 草稿和发布状态管理
- 软删除和恢复功能
- 文章封面图片上传
- 分类和标签关联
- 文章浏览统计
- 回收站管理

### 3. 分类管理 (Type)

- 分类的增删改查
- 关联文章数量统计

### 4. 标签管理 (Label)

- 标签的增删改查
- 关联文章数量统计

### 5. 评论管理 (Comment)

- 评论的发布、审核、删除
- 嵌套回复支持
- 评论点赞功能
- 按文章筛选评论
- 评论状态管理 (待审核/已审核/垃圾评论/已删除)

### 6. 网站配置 (Setting)

- 动态配置项管理
- 支持文本、图片、HTML、布尔值类型配置
- 网站基本信息配置 (名称、描述、Logo等)

### 7. 文件上传 (Upload)

- 图片上传功能
- 支持多种图片格式
- 文件大小限制和类型验证

### 8. 仪表盘 (Dashboard)

- 网站统计数据
- 文章总数、评论总数、浏览总量、待审核评论数

## 项目结构

```
myblog-express/
├── config/              # 配置文件
│   ├── database.js      # 数据库连接池配置
│   ├── jwt.js           # JWT 配置
│   └── upload.js        # Multer 文件上传配置
├── controllers/         # 控制器（业务逻辑层）
│   ├── articleController.js    # 文章控制器
│   ├── bloggerController.js    # 博主控制器
│   ├── commentController.js    # 评论控制器
│   ├── dashboardController.js  # 仪表盘控制器
│   ├── labelController.js      # 标签控制器
│   ├── settingController.js    # 配置控制器
│   ├── typeController.js       # 分类控制器
│   └── uploadController.js     # 上传控制器
├── models/              # 数据模型（数据库操作层）
│   ├── Article.js       # 文章模型
│   ├── Blogger.js       # 博主模型
│   ├── Comment.js       # 评论模型
│   ├── Label.js         # 标签模型
│   ├── Setting.js       # 配置模型
│   └── Type.js          # 分类模型
├── routes/              # 路由定义
│   ├── articleRoutes.js # 文章路由
│   ├── bloggerRoutes.js # 博主路由
│   ├── commentRoutes.js # 评论路由
│   ├── dashboardRoutes.js # 仪表盘路由
│   ├── labelRoutes.js   # 标签路由
│   ├── settingRoutes.js # 配置路由
│   ├── typeRoutes.js    # 分类路由
│   └── uploadRoutes.js  # 上传路由
├── middleware/          # 中间件
│   ├── auth.js          # JWT 认证中间件
│   ├── role.js          # 角色权限中间件
│   ├── errorHandler.js  # 全局错误处理
│   └── validator.js     # 请求参数验证
├── utils/               # 工具函数
│   ├── dateFormat.js    # 日期格式化
│   ├── pagination.js    # 分页工具
│   ├── response.js      # 响应格式化
│   └── upload.js        # 上传工具
├── scripts/             # 初始化脚本
│   └── initBlogger.js   # 博主初始化脚本
├── uploads/             # 文件上传目录
├── validators/          # 验证规则（预留）
├── app.js               # Express 应用配置
├── server.js            # 服务器启动文件
├── database.sql         # 数据库初始化脚本
├── package.json         # 项目依赖
├── .env                 # 环境变量配置
└── README.md            # 项目说明
```

## 安装和运行

### 环境要求

- Node.js 18.0+
- MySQL 8.0+
- npm 或 yarn

### 1. 克隆项目

```bash
git clone <repository-url>
cd myblog-express
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制环境变量模板文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：

```env
# 服务器配置
PORT=3000
FRONTEND_ORIGIN=http://localhost:8080

# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=myblog

# JWT 配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# 文件上传配置
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
```

### 4. 初始化数据库

#### 方法一：使用 SQL 脚本

```bash
# 连接到 MySQL
mysql -u root -p

# 创建数据库并执行脚本
CREATE DATABASE myblog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE myblog;
SOURCE database.sql;
```

#### 方法二：手动创建

在 MySQL 中执行 `database.sql` 文件中的 SQL 语句。

### 5. 初始化博主账户

运行初始化脚本创建默认博主账户：

```bash
npm run init-blogger
```

### 6. 启动服务

开发模式：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

服务将在 `http://localhost:3000` 启动。

## API 文档

### 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

### 响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### 认证相关

#### POST /api/blogger/login

用户登录

**请求体**:

```json
{
  "username": "admin",
  "password": "password"
}
```

**响应**:

```json
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "jwt_token_here",
    "blogger": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "avatar": "/uploads/avatar.jpg",
      "bio": "博主简介"
    }
  }
}
```

#### GET /api/blogger/profile

获取个人资料 (需要认证)

#### PUT /api/blogger/profile

更新个人资料 (需要认证)

#### PUT /api/blogger/password

修改密码 (需要认证)

### 文章管理

#### GET /api/articles

获取文章列表

**查询参数**:

- `page`: 页码 (默认 1)
- `pageSize`: 每页数量 (默认 10)
- `typeId`: 分类ID
- `labelId`: 标签ID
- `status`: 状态 (draft/published)
- `keyword`: 搜索关键词

#### GET /api/articles/:id

获取文章详情

#### POST /api/articles

创建文章 (需要认证，FormData)

#### PUT /api/articles/:id

更新文章 (需要认证，FormData)

#### DELETE /api/articles/:id

删除文章 (需要认证)

#### PUT /api/articles/:id/restore

恢复文章 (需要认证)

#### GET /api/articles/trash

获取回收站文章 (需要认证)

### 分类管理

#### GET /api/types

获取分类列表

#### POST /api/types

创建分类 (需要认证)

#### PUT /api/types/:id

更新分类 (需要认证)

#### DELETE /api/types/:id

删除分类 (需要认证)

### 标签管理

#### GET /api/labels

获取标签列表

#### POST /api/labels

创建标签 (需要认证)

#### PUT /api/labels/:id

更新标签 (需要认证)

#### DELETE /api/labels/:id

删除标签 (需要认证)

### 评论管理

#### GET /api/comments

获取评论列表

#### POST /api/comments

发布评论

#### PUT /api/comments/:id/status

更新评论状态 (需要认证)

#### DELETE /api/comments/:id

删除评论 (需要认证)

#### POST /api/comments/:id/like

点赞评论

### 网站配置

#### GET /api/settings

获取所有配置

#### PUT /api/settings

更新配置 (需要认证，FormData)

#### GET /api/settings/:key

获取单个配置

### 文件上传

#### POST /api/upload/image

上传图片 (需要认证)

### 仪表盘

#### GET /api/dashboard/stats

获取统计数据 (需要认证)

## 数据库设计

### 主要数据表

<<<<<<< HEAD
- `blogger`: 博主信息表
- `article`: 文章表
- `type`: 分类表
- `label`: 标签表
- `article_label`: 文章标签关联表
- `comment`: 评论表
- `setting`: 配置表
=======
- `bloggers`: 博主信息表
- `articles`: 文章表
- `types`: 分类表
- `labels`: 标签表
- `article_labels`: 文章标签关联表
- `comments`: 评论表
- `settings`: 配置表
>>>>>>> 51a269d3 (个人博客前台部分)

详细表结构请参考 `database.sql` 文件。

## 部署说明

### 生产环境配置

1. 设置环境变量为生产值
2. 使用 PM2 或其他进程管理器
3. 配置反向代理 (Nginx)
4. 设置 SSL 证书
5. 配置日志轮转
6. 定期备份数据库

### 安全注意事项

1. 修改默认 JWT 密钥
2. 使用强密码
3. 定期更新依赖包
4. 配置防火墙
5. 启用 HTTPS
6. 限制文件上传类型和大小

## 开发说明

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 RESTful API 设计原则
- 使用 async/await 处理异步操作
- 统一错误处理和响应格式

### 测试

目前项目暂无自动化测试，建议后续添加单元测试和集成测试。

### 扩展

项目采用模块化设计，便于扩展新功能。添加新模块时，请遵循现有的目录结构和代码规范。</content>
<parameter name="filePath">d:\myblog\copliot-myblog-express.md
