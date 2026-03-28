# 个人博客后端系统

一个使用 Express.js 和 MySQL 构建的完整博客管理系统后端 API。

## 技术栈

- **运行环境**: Node.js + Express.js
- **数据库**: MySQL 8.0+
- **认证**: JWT (JSON Web Tokens)
- **文件上传**: Multer
- **密码加密**: Bcryptjs
- **其他**: Cors, Helmet, Morgan

## 功能模块

1. **分类管理** - 创建、编辑、删除、查询分类
2. **标签管理** - 创建、编辑、删除、查询标签
3. **文章管理** - 创建、编辑、删除、发布文章，支持软删除和恢复
4. **评论管理** - 发布、审核、删除评论，支持嵌套回复和点赞
5. **博主管理** - 登录、身份验证、资料更新、密码修改
6. **网站配置** - 管理网站配置项（名称、描述、logo等）
7. **文件上传** - 图片上传和 CDN 管理

## 项目结构

```
myblog-express/
├── config/              # 配置文件
│   ├── database.js      # 数据库连接池配置
│   ├── jwt.js           # JWT 配置
│   └── upload.js        # Multer 文件上传配置
├── controllers/         # 控制器（业务逻辑）
├── models/              # 数据模型（数据库操作）
├── routes/              # 路由定义
├── middleware/          # 自定义中间件
│   ├── auth.js          # JWT 认证
│   ├── role.js          # 角色权限
│   ├── errorHandler.js  # 错误处理
│   └── validator.js     # 参数验证
├── utils/               # 工具函数
├── uploads/             # 文件上传目录
├── scripts/             # 初始化脚本
├── app.js               # Express 应用配置
├── server.js            # 服务启动入口
├── database.sql         # 数据库初始化脚本
├── .env                 # 环境变量配置
└── package.json         # 依赖管理

```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并修改配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，设置数据库连接信息：

```env
# 数据库配置
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=myblog

# JWT 密钥（生产环境务必修改）
JWT_SECRET=your-secret-key-change-in-production
```

### 3. 初始化数据库

#### 方式一：使用 SQL 脚本

```bash
# 在 MySQL 客户端中执行
mysql -u root -p < database.sql
```

#### 方式二：手动创建数据库

```sql
CREATE DATABASE IF NOT EXISTS myblog CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE myblog;
-- 然后执行 database.sql 中的表创建语句
```

### 4. 初始化博主账户

```bash
# 自动创建 .env 中配置的博主账户
node scripts/initBlogger.js
```

或者在启动服务时自动创建（需在 server.js 中调用）

### 5. 启动服务

```bash
# 开发环境
npm run dev

# 生产环境
npm start
```

服务将运行在 `http://localhost:3000`

## API 文档

### 基础信息

- **基础 URL**: `/api/v1`
- **认证方式**: `Bearer Token` (JWT)
- **请求格式**: `application/json`
- **响应格式**: `application/json`

### 通用响应格式

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

### 认证

所有需要认证的接口，需要在请求头中添加 JWT token：

```
Authorization: Bearer <your_jwt_token>
```

## 主要接口列表

### 分类管理

- `GET /api/v1/types` - 获取分类列表
- `POST /api/v1/types` - 创建分类
- `PUT /api/v1/types/:id` - 更新分类
- `DELETE /api/v1/types/:id` - 删除分类

### 标签管理

- `GET /api/v1/labels` - 获取标签列表
- `POST /api/v1/labels` - 创建标签
- `PUT /api/v1/labels/:id` - 更新标签
- `DELETE /api/v1/labels/:id` - 删除标签

### 文章管理

- `GET /api/v1/articles` - 获取文章列表
- `GET /api/v1/articles/:id` - 获取文章详情
- `GET /api/v1/articles/trash` - 获取回收站文章
- `POST /api/v1/articles` - 创建文章
- `PUT /api/v1/articles/:id` - 更新文章
- `DELETE /api/v1/articles/:id` - 删除文章（软删除）
- `PUT /api/v1/articles/:id/restore` - 恢复文章

### 评论管理

- `GET /api/v1/comments` - 获取评论列表
- `POST /api/v1/comments` - 发布评论
- `DELETE /api/v1/comments/:id` - 删除评论
- `PUT /api/v1/comments/:id/status` - 更新评论状态
- `POST /api/v1/comments/:id/like` - 点赞评论

### 博主管理

- `POST /api/v1/blogger/login` - 登录
- `GET /api/v1/blogger/profile` - 获取博主信息
- `PUT /api/v1/blogger/profile` - 更新博主信息
- `PUT /api/v1/blogger/password` - 修改密码

### 配置管理

- `GET /api/v1/settings` - 获取所有配置
- `GET /api/v1/settings/:key` - 获取单个配置
- `PUT /api/v1/settings` - 更新配置

### 文件上传

- `POST /api/v1/upload/image` - 上传图片

## 权限说明

| 接口                | 访客 | 博主 |
| ------------------- | ---- | ---- |
| 查询分类/标签/文章  | ✅   | ✅   |
| 发布/删除自己的评论 | ✅   | ✅   |
| 删除他人评论        | ❌   | ✅   |
| 文章/评论/分类管理  | ❌   | ✅   |
| 博主身份验证        | ❌   | ✅   |

## 数据库表说明

### type 表 - 分类

- `id` - 分类ID
- `typeName` - 分类名称
- `createdAt` - 创建时间

### label 表 - 标签

- `id` - 标签ID
- `labelName` - 标签名称
- `createdAt` - 创建时间

### article 表 - 文章

- `id` - 文章ID
- `title` - 标题
- `summary` - 摘要
- `content` - 内容
- `coverImage` - 封面图片 URL
- `typeId` - 分类ID
- `status` - 状态（draft/published）
- `viewCount` - 浏览次数
- `createdAt` - 创建时间
- `updatedAt` - 更新时间
- `deletedAt` - 删除时间（软删除）

### article_label 表 - 文章标签关联

- `articleId` - 文章ID
- `labelId` - 标签ID

### comment 表 - 评论

- `id` - 评论ID
- `articleId` - 所属文章ID
- `parentId` - 父评论ID（支持嵌套）
- `authorName` - 评论者名称
- `authorEmail` - 评论者邮箱
- `content` - 评论内容
- `status` - 状态（pending/approved/spam）
- `likeCount` - 点赞数
- `createdAt` - 创建时间

### blogger 表 - 博主

- `id` - 博主ID
- `username` - 用户名
- `password` - 加密密码
- `email` - 邮箱
- `avatar` - 头像 URL
- `bio` - 个人简介
- `role` - 角色（admin/guest）
- `createdAt` - 创建时间
- `updatedAt` - 更新时间

### setting 表 - 配置

- `settingKey` - 配置键
- `settingValue` - 配置值
- `settingType` - 类型（text/image）
- `description` - 描述

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（自动重启）
npm run dev

# 运行生产服务器
npm start

# 初始化博主账户
node scripts/initBlogger.js
```

## 环境变量配置

| 变量           | 说明           | 默认值          |
| -------------- | -------------- | --------------- |
| PORT           | 服务端口       | 3000            |
| NODE_ENV       | 环境           | development     |
| DB_HOST        | 数据库主机     | localhost       |
| DB_USER        | 数据库用户     | root            |
| DB_PASSWORD    | 数据库密码     | (空)            |
| DB_NAME        | 数据库名       | myblog          |
| JWT_SECRET     | JWT 密钥       | your-secret-key |
| JWT_EXPIRES_IN | token 过期时间 | 7d              |

## 错误处理

所有错误响应格式统一为：

```json
{
  "code": 400,
  "message": "错误信息",
  "data": null
}
```

## 文件上传

- **支持格式**: JPG, PNG, GIF, WebP
- **最大大小**: 5MB
- **保存位置**: `/uploads/` 目录
- **文件命名**: `{timestamp}_{random}.{ext}`

## 生产环境建议

1. **修改 JWT_SECRET** - 使用强密钥
2. **启用 HTTPS** - 使用 SSL 证书
3. **数据库备份** - 定期备份数据
4. **日志记录** - 配置日志系统
5. **速率限制** - 添加请求限流
6. **CORS 配置** - 限制跨域来源
7. **文件存储** - 替换为真实 CDN/OSS
8. **错误监控** - 集成错误追踪服务

## 常见问题

### 数据库连接失败

检查 `.env` 文件中的数据库配置是否正确，确保 MySQL 服务已启动。

### JWT token 过期

需要重新调用登录接口获取新的 token。

### 文件上传失败

检查 `/uploads/` 目录权限，确保有写入权限。

## 许可证

MIT

## 联系方式

如有问题，请提交 Issue 或 Pull Request。
