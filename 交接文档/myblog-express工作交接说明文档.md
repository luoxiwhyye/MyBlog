# MyBlog Express 工作交接说明文档

## 1. 文档目的

本文档用于 `myblog-express` 项目的工作交接，帮助接手同事快速理解：

- 项目定位
- 技术架构
- 启动方式
- 目录结构
- 路由与控制器分工
- 数据模型
- 认证授权机制
- 上传与静态资源
- 与前台/后台的联动关系
- 已知风险与建议

---

## 2. 项目概况

### 2.1 项目定位

`myblog-express` 是 MyBlog 的 **REST API 后端服务**，为以下两个前端项目提供数据与业务支持：

1. `myblog-vue/myblog-admin`
2. `myblog-vue/myblog-blog`

### 2.2 当前职责

后端主要承担：

- 博主登录认证
- 文章管理
- 分类管理
- 标签管理
- 评论管理
- 网站配置管理
- 图片上传
- 仪表盘统计
- 上传静态资源访问

### 2.3 技术栈

| 类别       | 方案              |
| ---------- | ----------------- |
| 运行时     | Node.js           |
| Web 框架   | Express 5         |
| 数据库     | MySQL             |
| 驱动       | mysql2/promise    |
| 认证       | JWT               |
| 密码加密   | bcryptjs          |
| 文件上传   | multer            |
| 安全中间件 | helmet            |
| 跨域       | cors              |
| 日志       | morgan            |
| 参数校验   | express-validator |

---

## 3. 目录结构

```text
myblog-express/
├─ config/                   # 数据库、JWT、上传配置
├─ controllers/              # 控制器
├─ middleware/               # 认证、角色、校验、错误处理中间件
├─ models/                   # 数据访问层
├─ routes/                   # 路由定义
├─ scripts/                  # 初始化脚本
├─ uploads/                  # 上传文件目录
├─ utils/                    # 通用工具
├─ app.js                    # Express 应用装配
├─ server.js                 # 服务启动入口
├─ myblog.sql                # 数据库结构/初始化 SQL
├─ package.json
└─ 工作交接说明文档.md
```

---

## 4. 启动与运行方式

### 4.1 scripts

`package.json` 中的脚本：

```json
{
  "start": "node server.js",
  "dev": "nodemon server.js",
  "init-blogger": "node scripts/initBlogger.js"
}
```

### 4.2 本地开发

```bash
npm install
npm run dev
```

### 4.3 生产启动

```bash
npm run start
```

### 4.4 启动入口

关键文件：`server.js`

职责：

- 加载 `app.js`
- 读取环境变量
- 初始化数据库连接
- 执行 `initBlogger()`
- 启动 HTTP 服务
- 处理优雅关闭
- 处理未捕获异常 / 未处理 Promise 拒绝

---

## 5. 应用装配说明

关键文件：`app.js`

### 5.1 中间件

当前已启用：

- `helmet`
- `cors`
- `morgan`
- `express.json()`
- `express.urlencoded()`

### 5.2 静态资源

`/uploads` 被配置为静态目录，用于：

- 文章封面图
- 头像
- 站点图片类配置项

且已设置跨域响应头，方便前台与后台跨域访问上传资源。

### 5.3 API 前缀

统一前缀：

```text
/api/v1
```

### 5.4 已注册路由

| 路由前缀            | 说明           |
| ------------------- | -------------- |
| `/api/v1/types`     | 分类           |
| `/api/v1/labels`    | 标签           |
| `/api/v1/articles`  | 文章           |
| `/api/v1/comments`  | 评论           |
| `/api/v1/blogger`   | 博主认证与资料 |
| `/api/v1/settings`  | 站点设置       |
| `/api/v1/upload`    | 上传           |
| `/api/v1/dashboard` | 仪表盘统计     |

### 5.5 全局错误处理

在所有路由后统一处理：

- 404 JSON 响应
- `errorHandler` 全局错误处理中间件

---

## 6. 数据库说明

### 6.1 配置

关键文件：`config/database.js`

当前通过 `mysql2/promise` 创建连接池，支持：

- 连接复用
- keepAlive
- 启动时探活

默认环境变量：

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=myblog
```

### 6.2 数据表

根据现有代码和 README，核心表包括：

- `blogger`
- `article`
- `type`
- `label`
- `article_label`
- `comment`
- `setting`

数据库结构参考：

- `myblog.sql`

---

## 7. 模型层说明

当前模型文件：

- `models/Article.js`
- `models/Blogger.js`
- `models/Comment.js`
- `models/Label.js`
- `models/Setting.js`
- `models/Type.js`

这些模型承担的职责主要是：

- 直接访问 MySQL
- 封装 CRUD 查询
- 屏蔽 SQL 细节

当前项目并未使用 ORM，而是**手写模型 + SQL** 风格。

---

## 8. 控制器与路由说明

### 8.1 控制器列表

当前控制器：

- `articleController.js`
- `bloggerController.js`
- `commentController.js`
- `dashboardController.js`
- `labelController.js`
- `settingController.js`
- `typeController.js`
- `uploadController.js`

### 8.2 路由文件列表

当前路由：

- `routes/articleRoutes.js`
- `routes/bloggerRoutes.js`
- `routes/commentRoutes.js`
- `routes/dashboardRoutes.js`
- `routes/labelRoutes.js`
- `routes/settingRoutes.js`
- `routes/typeRoutes.js`
- `routes/uploadRoutes.js`

### 8.3 文章路由示例

`routes/articleRoutes.js` 当前覆盖：

- 公开文章列表
- 回收站列表
- 文章详情
- 新建文章
- 更新文章
- 软删除
- 恢复
- 彻底删除

说明：

- 公开读取支持访客访问
- 写操作要求认证 + 管理员角色
- 创建/更新文章时支持封面上传

---

## 9. 鉴权与权限控制

### 9.1 相关文件

- `config/jwt.js`
- `middleware/auth.js`
- `middleware/role.js`
- `controllers/bloggerController.js`

### 9.2 当前机制

后端使用 JWT：

- 登录成功后返回 token
- 前端通过 `Authorization: Bearer <token>` 传递

### 9.3 角色控制

当前代码中存在：

```js
requireRole("admin");
```

说明：

- 后端支持角色控制中间件
- 管理后台相关写操作需要管理员权限

### 9.4 可选鉴权

在文章详情、文章列表等公开接口中使用：

- `auth.optionalAuth`

说明：

- 访客可访问公开内容
- 管理员访问时可看到更多状态内容（如草稿）

---

## 10. 参数校验与错误处理

### 10.1 相关文件

- `middleware/validator.js`
- `middleware/errorHandler.js`

### 10.2 当前校验方式

使用 `express-validator` 做：

- 分页参数校验
- 整数 ID 校验
- 请求参数合法性校验

常见组合：

```js
validatePagination;
validateIntId;
handleValidationErrors;
```

### 10.3 错误处理

统一返回 JSON 响应格式：

```json
{
  "code": 404,
  "message": "请求的资源不存在",
  "data": null
}
```

整体响应结构约定为：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {}
}
```

---

## 11. 上传能力说明

### 11.1 相关文件

- `config/upload.js`
- `controllers/uploadController.js`
- `routes/uploadRoutes.js`
- `uploads/`

### 11.2 用途

上传能力主要服务于：

- 文章封面
- 博主头像
- 站点图片类配置

### 11.3 当前特点

- 使用 `multer`
- 上传文件保存在本地 `uploads/`
- 通过 `/uploads` 静态暴露

说明：

- 当前是本地文件存储方案
- 没有接对象存储

---

## 12. 初始化逻辑

### 12.1 博主初始化

关键文件：

- `utils/initBlogger`
- `scripts/initBlogger.js`
- `server.js`

当前服务启动时会执行：

```js
await initBlogger();
```

目的：

- 确保博主账号初始化
- 避免系统在首次启动时没有管理员账号

### 12.2 注意点

即使初始化失败，当前服务仍会继续启动：

```js
服务器启动成功（初始化失败）
```

这意味着：

- 服务可用不代表初始化成功
- 如果后台无法登录，要优先检查初始化逻辑与数据库数据

---

## 13. 与前后端项目的关系

### 13.1 对后台 `myblog-admin`

提供：

- 登录
- 内容管理
- 设置管理
- 评论审核
- 仪表盘数据

### 13.2 对前台 `myblog-blog`

提供：

- 文章公开数据
- 分类/标签数据
- 评论提交与读取
- 站点设置
- sitemap 动态所需数据来源

因此这个后端是整个博客系统的核心数据枢纽。

---

## 14. 环境变量建议

当前代码中已经使用或建议使用的环境变量包括：

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=myblog
JWT_SECRET=your-secret
JWT_EXPIRES_IN=7d
```

说明：

- `FRONTEND_ORIGIN` 会影响 CORS 与上传静态资源访问头
- `JWT_SECRET` 必须在生产环境中显式配置

---

## 15. 本地联调方式

建议按如下顺序启动：

1. 启动 MySQL，并导入 `myblog.sql`
2. 启动 `myblog-express`
3. 启动 `myblog-admin`
4. 启动 `myblog-blog`

默认开发地址通常为：

- 后端：`http://localhost:3000`
- 后台：Vite 默认端口
- 前台：Nuxt 当前默认 `http://localhost:3001`

---

## 16. 已知风险与建议

### 16.1 当前风险

1. **初始化失败仍继续启动**
   - 虽然有利于服务不中断
   - 但会掩盖初始化问题

2. **本地文件上传方案较简单**
   - 不适合大规模生产部署
   - 不支持云端存储

3. **模型层为手写 SQL**
   - 灵活，但维护时需要小心 SQL 与返回结构一致性

4. **缺少自动化测试信息**
   - 当前未见测试体系

### 16.2 后续建议

1. 增加接口测试或最少的 smoke test
2. 为上传链路增加文件类型/大小控制说明
3. 为初始化流程增加更明确日志
4. 视部署情况考虑迁移到对象存储
5. 统一整理环境变量模板和部署说明

---

## 17. 建议优先阅读的文件

- `package.json`
- `app.js`
- `server.js`
- `config/database.js`
- `config/jwt.js`
- `config/upload.js`
- `middleware/auth.js`
- `middleware/role.js`
- `middleware/validator.js`
- `routes/articleRoutes.js`
- `controllers/articleController.js`
- `controllers/bloggerController.js`
- `models/Article.js`
- `models/Setting.js`

---

## 18. 交接结论

`myblog-express` 当前是一个**可支撑前后台的博客 REST API 服务**，结构清晰，职责明确：

- `routes` 负责路由组织
- `controllers` 负责业务逻辑
- `models` 负责数据库访问
- `middleware` 负责鉴权、校验、错误处理

后续维护重点建议放在：

1. 环境变量与部署规范化
2. 上传与静态资源策略
3. 初始化流程可观测性
4. 自动化测试与接口稳定性
