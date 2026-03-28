# 项目上下文

我正在开发一个个人博客后端系统，使用Express.js框架。
项目目录: myblog-express
数据库: MySQL (已完成表结构设计)
认证方式: JWT Bearer Token

# 技术栈要求

- Node.js + Express.js
- MySQL2 驱动（使用连接池）
- 遵循 RESTful API 设计规范
- 统一使用 ES6+ 语法

# 代码规范

1. 使用 `require` 引入模块（非 import）
2. 错误处理使用 try-catch，并通过 next(error) 传递给错误处理中间件
3. 所有异步操作使用 async/await
4. 数据库查询使用参数化查询防止 SQL 注入
5. 文件上传使用 multer 中间件
6. JWT 验证中间件需要检查 token 并解析用户信息到 req.user
7. 响应格式统一使用 `{ code, message, data }` 结构

# 项目结构

myblog-express/
├── config/ # 配置文件（数据库、JWT等）
├── models/ # 数据模型（对应数据库表）
├── controllers/ # 控制器（业务逻辑）
├── routes/ # 路由定义
├── middleware/ # 自定义中间件
├── utils/ # 工具函数
├── uploads/ # 临时上传目录
├── app.js # Express应用初始化
└── server.js # 服务启动入口

@workspace
请帮我创建以下配置文件：

1. config/database.js - 创建MySQL连接池配置，从环境变量读取数据库信息
2. config/jwt.js - JWT配置，包括secret和过期时间
3. config/upload.js - multer配置文件，设置文件存储路径和文件大小限制

要求：

- 使用 dotenv 读取环境变量
- 数据库连接池配置合理（connectionLimit: 10）
- 文件上传限制：图片最大5MB，允许格式 jpg/jpeg/png/gif/webp
- 上传文件重命名：时间戳\_随机数.原扩展名

@workspace
请创建以下中间件：

1. middleware/auth.js - JWT认证中间件
   - 从 Authorization header 提取 token
   - 验证 token 并解析用户信息到 req.user
   - 如果 token 无效，返回 401 错误

2. middleware/role.js - 角色权限中间件
   - 提供 requireRole(role) 函数，检查 req.user.role
   - role 可以是 'admin' 或 'guest'
   - 权限不足返回 403 错误

3. middleware/errorHandler.js - 全局错误处理中间件
   - 统一处理所有错误，返回标准错误响应格式
   - 区分开发环境和生产环境的错误信息

4. middleware/validator.js - 请求参数验证中间件
   - 使用 express-validator
   - 提供通用的验证规则（分页参数、ID参数等）

@workspace
请创建以下工具函数：

1. utils/response.js - 统一响应格式函数
   - success(res, data, message, code) - 成功响应
   - error(res, message, code) - 错误响应

2. utils/pagination.js - 分页工具
   - 解析 page 和 pageSize 参数
   - 计算 offset 和 limit
   - 生成分页响应数据

3. utils/upload.js - 上传到CDN的工具函数
   - uploadToCDN(localPath, remotePath) 函数
   - 返回 CDN URL
   - 注意：先实现本地存储，后续可替换为 OSS

4. utils/dateFormat.js - 日期格式化函数
   - formatDateTime(date) - 返回 'YYYY-MM-DD HH:mm:ss' 格式

@workspace
根据我的接口文档，请创建以下数据模型文件（models/目录）：

1. models/Type.js - 分类模型
2. models/Label.js - 标签模型
3. models/Article.js - 文章模型（包含软删除逻辑）
4. models/Comment.js - 评论模型
5. models/Blogger.js - 博主模型
6. models/Setting.js - 网站配置模型

每个模型文件应该包含：

- 对应数据库表的基本 CRUD 操作函数
- 使用参数化查询
- 导出函数供 controller 使用

特别注意：

- Article 模型需要实现软删除（deleted_at 字段）
- Comment 模型需要支持嵌套回复（parent_id）
- 所有查询都需要处理分页参数

@workspace
请实现分类管理模块：

1. controllers/typeController.js - 实现以下方法：
   - getTypes - 分页查询分类，返回包含 articleCount 的分类列表
   - createType - 创建新分类，需要 admin 权限
   - updateType - 更新分类信息
   - deleteType - 删除分类（检查是否有文章关联）

2. routes/typeRoutes.js - 定义路由：
   - GET /api/v1/types - 查询分类（公开）
   - POST /api/v1/types - 创建分类（需认证）
   - PUT /api/v1/types/:id - 更新分类（需认证）
   - DELETE /api/v1/types/:id - 删除分类（需认证）

要求：

- 使用中间件 auth 和 requireRole('admin')
- 删除前检查是否有文章使用该分类，如有则返回错误提示
- 查询时统计每个分类下的文章数量

@workspace
请实现标签管理模块（参考分类管理）：

- controllers/labelController.js
- routes/labelRoutes.js

实现类似分类管理的功能，包括分页查询、创建、更新、删除。

@workspace
请实现文章管理模块（最复杂的功能）：

1. controllers/articleController.js - 实现以下方法：
   - getArticles - 分页查询文章
     - 支持按 typeId, labelId, status, keyword 筛选
     - 支持按 created_at, view_count 排序
     - 博主可以看到所有状态的文章，访客只能看到 published
     - 返回文章列表包含分类和标签信息
   - getArticleById - 获取文章详情
     - 自动增加浏览次数（使用事务）
     - 返回完整的文章内容
   - createArticle - 创建文章
     - 接收 multipart/form-data（标题、内容、封面、标签ID等）
     - 封面图片上传到 CDN
     - 处理标签关联（标签ID用逗号分隔）
   - updateArticle - 更新文章
     - 支持部分字段更新
     - 如果更新封面，删除旧封面（可选）
   - deleteArticle - 软删除文章
     - 设置 deleted_at 字段
   - restoreArticle - 恢复软删除的文章
     - 将 deleted_at 设为 NULL
   - getTrashArticles - 获取已删除文章列表（回收站）

2. routes/articleRoutes.js - 定义路由：
   - GET /api/v1/articles - 查询文章
   - GET /api/v1/articles/trash - 回收站列表（需认证）
   - GET /api/v1/articles/:id - 文章详情
   - POST /api/v1/articles - 创建文章（需认证）
   - PUT /api/v1/articles/:id - 更新文章（需认证）
   - DELETE /api/v1/articles/:id - 软删除（需认证）
   - PUT /api/v1/articles/:id/restore - 恢复文章（需认证）

要求：

- 使用事务处理文章创建（文章+标签关联）
- 封面图片使用 multer 处理，上传后调用 uploadToCDN
- 软删除使用 deleted_at 字段，查询时默认过滤 deleted_at IS NULL
- 标签关联使用中间表 article_labels

@workspace
请实现评论管理模块：

1. controllers/commentController.js - 实现：
   - getComments - 分页查询评论
     - 支持按 articleId 筛选
     - 支持嵌套回复（parent_id 关联）
     - 博主可见所有状态，访客只能看到 approved
   - createComment - 发布评论
     - 访客需要提供 authorName, authorEmail
     - 博主可选是否使用博主身份（读取 req.user）
     - 支持回复评论（parentId）
   - deleteComment - 删除评论
     - 博主可以删除任何评论
     - 普通用户只能删除自己的评论（需要验证邮箱或token）
   - updateCommentStatus - 审核评论（博主）
     - 状态值: pending/approved/spam/deleted
   - likeComment - 点赞评论
     - 增加 likeCount
     - 需要防重复点赞（简单实现可用 IP 限制）

2. routes/commentRoutes.js - 定义路由：
   - GET /api/v1/comments - 查询评论
   - POST /api/v1/comments - 发布评论
   - DELETE /api/v1/comments/:id - 删除评论
   - PUT /api/v1/comments/:id/status - 审核（需认证）
   - POST /api/v1/comments/:id/like - 点赞

要求：

- 实现嵌套回复数据结构（查询时递归组装）
- 评论发布后默认状态为 pending（待审核）
- 删除自己的评论需要验证作者身份（通过 authorEmail 或 token）

@workspace
请实现博主管理模块：

1. controllers/bloggerController.js - 实现：
   - login - 博主登录
     - 验证用户名和密码（使用 bcryptjs）
     - 生成 JWT token，payload 包含 id, username, role='admin'
     - 返回 token 和博主信息（不含密码）
   - getProfile - 获取博主信息
     - 从 req.user 获取博主ID
     - 返回博主信息（不含密码）
   - updateProfile - 更新博主信息
     - 支持更新 email, bio
     - 支持上传头像（multipart/form-data）
     - 头像上传到 CDN
   - changePassword - 修改密码
     - 验证旧密码
     - 加密新密码后更新

2. routes/bloggerRoutes.js - 定义路由：
   - POST /api/v1/blogger/login - 登录（公开）
   - GET /api/v1/blogger/profile - 获取信息（需认证）
   - PUT /api/v1/blogger/profile - 更新信息（需认证）
   - PUT /api/v1/blogger/password - 修改密码（需认证）

要求：

- 密码加密使用 bcryptjs
- 默认博主账户从环境变量读取初始用户名和密码
- 头像更新时需要处理旧头像的删除（可选）

@workspace
请实现网站配置管理模块：

1. controllers/settingController.js - 实现：
   - getSettings - 获取所有配置
     - 返回 key-value 对象格式
     - 图片类型的配置直接返回 URL
   - getSettingByKey - 获取单个配置
   - updateSettings - 批量更新配置
     - 接收 multipart/form-data
     - 文本配置在 settings 对象中
     - 图片配置单独文件字段
     - 图片上传后更新对应 key 的 setting_value 为 CDN URL

2. routes/settingRoutes.js - 定义路由：
   - GET /api/v1/settings - 获取所有配置（公开）
   - GET /api/v1/settings/:key - 获取单个配置（公开）
   - PUT /api/v1/settings - 更新配置（需认证）

要求：

- 配置表结构：id, setting_key, setting_value, setting_type(text/image), description
- 支持动态添加配置项（通过数据库）
- 图片上传复用之前的 uploadToCDN 函数

@workspace
请实现通用文件上传接口：

1. controllers/uploadController.js - 实现：
   - uploadImage - 上传图片
     - 使用 multer 处理文件上传
     - 保存到临时目录后上传到 CDN
     - 返回图片 URL

2. routes/uploadRoutes.js - 定义路由：
   - POST /api/v1/upload/image - 上传图片（需认证）

要求：

- 限制文件类型和大小
- 统一使用 uploadToCDN 函数处理
- 返回标准响应格式

@workspace
请完善 app.js 和 server.js：

1. app.js - Express应用配置
   - 引入所有中间件（helmet, cors, morgan, express.json）
   - 注册所有路由
   - 注册全局错误处理中间件
   - 404 处理中间件

2. server.js - 服务启动
   - 导入 app
   - 监听端口
   - 添加优雅关闭逻辑（关闭数据库连接）

要求：

- 所有配置从环境变量读取
- 中间件顺序正确
- 错误处理在最后

以下是根据您提供的SQL语句生成的接口文档，包含完整的RESTful API定义、权限控制说明及特殊功能实现方案。

---

# 博客系统API文档

## 基础信息

- **基础URL**: `/api/v1`
- **认证方式**: JWT Bearer Token
- **权限分级**:
  - **访客**: 可发布评论、删除自己的评论
  - **博主**: 可进行所有操作（需管理员权限）
- **请求格式**: `application/json`
- **响应格式**: `application/json`

## 通用响应结构

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

---

## 1. 分类管理接口

### 1.1 分页查询分类

- **URL**: `/types`
- **Method**: `GET`
- **权限**: 所有用户
- **请求参数**:
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | page | int | 否 | 页码，默认1 |
  | pageSize | int | 否 | 每页数量，默认10 |
- **响应示例**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "typeName": "技术",
        "articleCount": 5
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 10
  }
}
```

### 1.2 创建分类

- **URL**: `/types`
- **Method**: `POST`
- **权限**: 博主
- **请求体**:

```json
{
  "typeName": "技术"
}
```

### 1.3 更新分类

- **URL**: `/types/{id}`
- **Method**: `PUT`
- **权限**: 博主

### 1.4 删除分类

- **URL**: `/types/{id}`
- **Method**: `DELETE`
- **权限**: 博主

---

## 2. 标签管理接口

### 2.1 分页查询标签

- **URL**: `/labels`
- **Method**: `GET`
- **权限**: 所有用户
- **请求参数**: 同分类分页

### 2.2 创建标签

- **URL**: `/labels`
- **Method**: `POST`
- **权限**: 博主

### 2.3 更新标签

- **URL**: `/labels/{id}`
- **Method**: `PUT`
- **权限**: 博主

### 2.4 删除标签

- **URL**: `/labels/{id}`
- **Method**: `DELETE`
- **权限**: 博主

---

## 3. 文章管理接口

### 3.1 分页查询文章

- **URL**: `/articles`
- **Method**: `GET`
- **权限**: 所有用户
- **请求参数**:
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | page | int | 否 | 页码，默认1 |
  | pageSize | int | 否 | 每页数量，默认10 |
  | typeId | int | 否 | 分类ID |
  | labelId | int | 否 | 标签ID |
  | status | string | 否 | 状态：draft/published（博主可见草稿） |
  | keyword | string | 否 | 标题模糊搜索 |
  | sortBy | string | 否 | 排序字段：created_at/view_count，默认created_at |
- **响应示例**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "title": "文章标题",
        "summary": "摘要",
        "coverImage": "https://cdn.example.com/cover.jpg",
        "viewCount": 100,
        "status": "published",
        "type": {
          "id": 1,
          "typeName": "技术"
        },
        "labels": [
          {
            "id": 1,
            "labelName": "MySQL"
          }
        ],
        "createdAt": "2024-01-01 12:00:00"
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 10
  }
}
```

### 3.2 创建文章

- **URL**: `/articles`
- **Method**: `POST`
- **权限**: 博主
- **请求体** (multipart/form-data):
  | 字段名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | title | string | 是 | 标题 |
  | typeId | int | 是 | 分类ID |
  | content | string | 是 | 文章内容 |
  | summary | string | 否 | 摘要 |
  | coverImage | file | 否 | 封面图片 |
  | labelIds | string | 否 | 标签ID数组，如"1,2,3" |
  | status | string | 否 | draft/published，默认draft |
- **响应示例**:

```json
{
  "code": 200,
  "data": {
    "id": 1,
    "coverImageUrl": "https://cdn.example.com/cover_123456.jpg"
  }
}
```

### 3.3 更新文章

- **URL**: `/articles/{id}`
- **Method**: `PUT`
- **权限**: 博主
- **请求体**: 同创建文章，支持部分字段更新

### 3.4 软删除文章

- **URL**: `/articles/{id}`
- **Method**: `DELETE`
- **权限**: 博主
- **响应**: 无数据，状态码204

### 3.5 恢复软删除文章

- **URL**: `/articles/{id}/restore`
- **Method**: `PUT`
- **权限**: 博主
- **说明**: 撤销软删除，恢复文章

### 3.6 获取文章详情

- **URL**: `/articles/{id}`
- **Method**: `GET`
- **权限**: 所有用户
- **说明**: 自动增加浏览次数

### 3.7 获取已删除文章列表（回收站）

- **URL**: `/articles/trash`
- **Method**: `GET`
- **权限**: 博主
- **请求参数**: 同分页查询

---

## 4. 评论管理接口

### 4.1 分页查询评论

- **URL**: `/comments`
- **Method**: `GET`
- **权限**: 所有用户
- **请求参数**:
  | 参数名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | page | int | 否 | 页码 |
  | pageSize | int | 否 | 每页数量 |
  | articleId | int | 否 | 文章ID |
  | status | string | 否 | 状态（博主可见所有） |
- **响应示例**:

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 1,
        "articleId": 1,
        "parentId": null,
        "authorName": "访客",
        "authorEmail": "guest@example.com",
        "content": "好文章！",
        "likeCount": 10,
        "status": "approved",
        "createAt": "2024-01-01 12:00:00",
        "replies": [] // 嵌套回复列表
      }
    ],
    "total": 20
  }
}
```

### 4.2 发布评论

- **URL**: `/comments`
- **Method**: `POST`
- **权限**: 访客及以上
- **请求体**:

```json
{
  "articleId": 1,
  "parentId": null,
  "authorName": "张三",
  "authorEmail": "zhangsan@example.com",
  "content": "评论内容"
}
```

- **说明**: `parentId` 为可选，用于回复评论

### 4.3 删除评论

- **URL**: `/comments/{id}`
- **Method**: `DELETE`
- **权限**: 博主 或 评论作者
- **说明**:
  - 博主可删除任何评论
  - 访客只能删除自己的评论（基于Token或Session验证）

### 4.4 评论审核

- **URL**: `/comments/{id}/status`
- **Method**: `PUT`
- **权限**: 博主
- **请求体**:

```json
{
  "status": "approved" // pending/approved/spam/deleted
}
```

### 4.5 点赞评论

- **URL**: `/comments/{id}/like`
- **Method**: `POST`
- **权限**: 所有用户
- **响应**:

```json
{
  "code": 200,
  "data": {
    "likeCount": 11
  }
}
```

---

## 5. 博主管理接口

### 5.1 博主登录

- **URL**: `/blogger/login`
- **Method**: `POST`
- **权限**: 所有用户
- **请求体**:

```json
{
  "username": "admin",
  "password": "123456"
}
```

- **响应**:

```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "blogger": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "avatar": "https://...",
      "bio": "博主简介"
    }
  }
}
```

### 5.2 获取博主信息

- **URL**: `/blogger/profile`
- **Method**: `GET`
- **权限**: 博主

### 5.3 更新博主信息

- **URL**: `/blogger/profile`
- **Method**: `PUT`
- **权限**: 博主
- **请求体** (multipart/form-data):
  | 字段名 | 类型 | 必填 | 说明 |
  |--------|------|------|------|
  | email | string | 否 | 邮箱 |
  | bio | string | 否 | 简介 |
  | avatar | file | 否 | 头像图片 |

### 5.4 修改密码

- **URL**: `/blogger/password`
- **Method**: `PUT`
- **权限**: 博主
- **请求体**:

```json
{
  "oldPassword": "123456",
  "newPassword": "654321"
}
```

---

## 6. 网站配置管理接口

### 6.1 获取所有配置

- **URL**: `/settings`
- **Method**: `GET`
- **权限**: 所有用户

### 6.2 更新配置

- **URL**: `/settings`
- **Method**: `PUT`
- **权限**: 博主
- **请求体** (multipart/form-data):
  - 文本配置: `settings[site_name]=我的博客`
  - 图片配置: 使用文件字段

  ```json
  // 文本配置示例
  {
    "site_name": "我的博客",
    "site_description": "技术分享"
  }

  // 图片配置示例（multipart）
  {
    "site_logo": (binary file)
  }
  ```

- **说明**:
  - 对于`setting_type`为`image`的配置，需接收图片文件并上传至CDN
  - 图片上传后返回URL并存储到`setting_value`

### 6.3 获取单个配置

- **URL**: `/settings/{key}`
- **Method**: `GET`
- **权限**: 所有用户

---

## 7. 文件上传接口（通用）

### 7.1 上传图片

- **URL**: `/upload/image`
- **Method**: `POST`
- **权限**: 博主
- **请求体**: `multipart/form-data`，字段名`image`
- **响应**:

```json
{
  "code": 200,
  "data": {
    "url": "https://cdn.example.com/images/xxx.jpg"
  }
}
```

- **说明**: 供文章封面、博主头像、配置图片等复用

---

## 权限控制说明

| 接口类别      | 访客 | 博主 |
| ------------- | ---- | ---- |
| 查询类接口    | ✅   | ✅   |
| 评论发布      | ✅   | ✅   |
| 删除自己评论  | ✅   | ✅   |
| 删除任意评论  | ❌   | ✅   |
| 文章管理      | ❌   | ✅   |
| 分类/标签管理 | ❌   | ✅   |
| 博主管理      | ❌   | ✅   |
| 网站配置管理  | ❌   | ✅   |
| 文件上传      | ❌   | ✅   |

---

## 实现要点说明

1. **封面图/图片存储**:
   - 文章封面、博主头像、配置图片接收后统一上传至对象存储（如OSS）
   - 存储路径格式: `/uploads/{year}/{month}/{filename}_{timestamp}.{ext}`
   - 返回完整URL存储到对应字段

2. **软删除恢复**:
   - 文章软删除: 设置`deleted_at`字段
   - 恢复: 将`deleted_at`设置为`NULL`
   - 查询时默认过滤`deleted_at IS NOT NULL`

3. **Token权限分级**:
   - JWT Payload中包含`role`字段（`admin`/`guest`）
   - 中间件根据角色判断接口权限

4. **分页规范**:
   - 所有分页接口统一使用`page`和`pageSize`
   - 响应包含`total`、`page`、`pageSize`

5. **日期格式**: 统一使用`YYYY-MM-DD HH:mm:ss`

---

-- 1. 分类表
CREATE TABLE `type` (
`id` INT NOT NULL AUTO_INCREMENT COMMENT '分类ID',
`type_name` VARCHAR(50) NOT NULL COMMENT '分类名称',
PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分类表';

-- 2. 标签表
CREATE TABLE `label` (
`id` INT NOT NULL AUTO_INCREMENT COMMENT '标签ID',
`label_name` VARCHAR(50) NOT NULL COMMENT '标签名称',
PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

-- 3. 文章表
CREATE TABLE `article` (
`id` INT NOT NULL AUTO_INCREMENT COMMENT '文章ID',
`type_id` INT NOT NULL COMMENT '分类外键',
`title` VARCHAR(200) NOT NULL COMMENT '文章标题',
`summary` VARCHAR(500) DEFAULT NULL COMMENT '文章摘要',
`content` LONGTEXT NOT NULL COMMENT '文章内容',
`cover_image` VARCHAR(500) DEFAULT NULL COMMENT '封面图',
`view_count` INT NOT NULL DEFAULT 0 COMMENT '浏览次数',
`status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft' COMMENT '发布状态',
`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
`deleted_at` DATETIME DEFAULT NULL COMMENT '删除时间（软删除）',
PRIMARY KEY (`id`),
KEY `idx_type_id` (`type_id`),
KEY `idx_status` (`status`),
KEY `idx_deleted_at` (`deleted_at`),
CONSTRAINT `fk_article_type` FOREIGN KEY (`type_id`) REFERENCES `type` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文章表';

-- 4. 文章-标签关联表
CREATE TABLE `article_label` (
`id` INT NOT NULL AUTO_INCREMENT COMMENT '关联ID',
`article_id` INT NOT NULL COMMENT '文章外键',
`label_id` INT NOT NULL COMMENT '标签外键',
PRIMARY KEY (`id`),
UNIQUE KEY `uk_article_label` (`article_id`, `label_id`),
KEY `idx_article_id` (`article_id`),
KEY `idx_label_id` (`label_id`),
CONSTRAINT `fk_article_label_article` FOREIGN KEY (`article_id`) REFERENCES `article` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT `fk_article_label_label` FOREIGN KEY (`label_id`) REFERENCES `label` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文章-标签关联表';

-- 5. 评论表
CREATE TABLE `comment` (
`id` INT NOT NULL AUTO_INCREMENT COMMENT '评论ID',
`article_id` INT NOT NULL COMMENT '文章外键',
`parent_id` INT DEFAULT NULL COMMENT '父评论ID，用于嵌套评论',
`author_name` VARCHAR(50) NOT NULL COMMENT '昵称',
`author_email` VARCHAR(100) NOT NULL COMMENT '邮箱',
`author_ip` VARCHAR(45) NOT NULL COMMENT 'IP地址',
`content` TEXT NOT NULL COMMENT '评论内容',
`status` ENUM('pending', 'approved', 'spam', 'deleted') NOT NULL DEFAULT 'pending' COMMENT '评论状态',
`like_count` INT NOT NULL DEFAULT 0 COMMENT '点赞数',
`create_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
PRIMARY KEY (`id`),
KEY `idx_article_id` (`article_id`),
KEY `idx_parent_id` (`parent_id`),
KEY `idx_status` (`status`),
KEY `idx_create_at` (`create_at`),
CONSTRAINT `fk_comment_article` FOREIGN KEY (`article_id`) REFERENCES `article` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT `fk_comment_parent` FOREIGN KEY (`parent_id`) REFERENCES `comment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论表';

-- 6. 博主表
CREATE TABLE `blogger` (
`id` INT NOT NULL AUTO_INCREMENT COMMENT '博主ID',
`username` VARCHAR(50) NOT NULL COMMENT '博主账号',
`password_hash` VARCHAR(255) NOT NULL COMMENT '博主哈希密码',
`email` VARCHAR(100) NOT NULL COMMENT '博主电子邮箱',
`avatar` VARCHAR(500) DEFAULT NULL COMMENT '博主头像',
`bio` TEXT DEFAULT NULL COMMENT '个人简介',
`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '博主创建时间',
PRIMARY KEY (`id`),
UNIQUE KEY `uk_username` (`username`),
UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='博主表';

-- 7. 网站配置表
CREATE TABLE `setting` (
`setting_key` VARCHAR(100) NOT NULL COMMENT '配置键名',
`setting_value` TEXT NOT NULL COMMENT '配置值',
`setting_type` ENUM('text', 'image', 'html', 'boolean') NOT NULL DEFAULT 'text' COMMENT '配置类型',
`description` VARCHAR(255) DEFAULT NULL COMMENT '配置项说明',
PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网站配置表';
