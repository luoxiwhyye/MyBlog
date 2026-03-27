# 项目上下文

我正在开发一个个人博客后端系统，使用 Express.js + MySQL。
项目目录: myblog-express
已完成: 博主表（Blogger）的模型定义和基本 CRUD

# 当前问题

我的博客系统没有实现注册接口，博主账号需要通过初始化方式创建。
需求：当后端系统启动时，自动检查博主表是否存在博主账号，如果不存在则自动创建默认博主。

# 技术栈要求

- Node.js + Express.js
- MySQL2 驱动（使用连接池）
- bcryptjs 用于密码哈希
- dotenv 读取环境变量
- 遵循项目现有的代码规范（require 引入、async/await、try-catch）

# 现有相关文件

- models/Blogger.js - 博主模型，包含数据库操作方法
- config/database.js - 数据库连接池配置
- app.js / server.js - 应用入口文件

# 任务要求

## 1. 创建博主初始化模块

在 `utils/` 目录下创建 `initBlogger.js` 文件，实现以下功能：

```javascript
// utils/initBlogger.js
/**
 * 初始化博主账号
 * 检查博主表，如果没有博主则创建默认博主
 * @returns {Promise<boolean>} 是否执行了初始化
 */
async function initBlogger() { ... }
```

````

**具体逻辑：**

1. 查询博主表，获取博主数量
2. 如果数量 > 0，跳过初始化，打印日志 "博主账号已存在，跳过初始化"
3. 如果数量 === 0，创建默认博主账号：
   - 默认用户名: 从环境变量 `BLOGGER_USERNAME` 读取，默认为 `admin`
   - 默认密码: 从环境变量 `BLOGGER_PASSWORD` 读取，默认为 `admin123`
   - 默认邮箱: 从环境变量 `BLOGGER_EMAIL` 读取，默认为 `admin@blog.com`
   - 默认角色: `admin`
   - 使用 bcryptjs 对密码进行哈希加密（saltRounds = 10）
4. 创建成功后打印日志，并输出默认账号信息（密码需提示修改）
5. 使用 try-catch 处理错误，打印错误日志但不阻止应用启动

## 2. 集成到应用启动流程

在 `server.js` 或 `app.js` 中，数据库连接成功后调用 `initBlogger()`：

```javascript
// server.js 示例
const { initBlogger } = require('./utils/initBlogger');

// 数据库连接成功后
pool.getConnection(async (err, connection) => {
  if (err) { ... }
  console.log('数据库连接成功');
  await initBlogger(); // 执行初始化
  // 启动服务器...
});
```

## 3. 环境变量配置

在 `.env.example` 文件中添加以下配置项（用于文档说明）：

```bash
# 博主初始化配置
BLOGGER_USERNAME=admin          # 默认博主用户名
BLOGGER_PASSWORD=admin123       # 默认博主密码（生产环境务必修改）
BLOGGER_EMAIL=admin@blog.com    # 默认博主邮箱
```

## 4. 安全注意事项

- 默认密码仅用于首次初始化，生产环境应强制要求修改
- 初始化日志中输出密码时需要添加 ⚠️ 警告标识
- 密码哈希使用 bcryptjs，不得明文存储

## 5. 代码规范要求

- 使用 `require` 引入模块
- 所有异步操作使用 `async/await`
- 数据库查询使用参数化查询（如果涉及）
- 错误处理使用 try-catch，打印错误但不抛出（避免阻塞启动）
- 添加详细的 JSDoc 注释

## 6. 日志输出示例

```
✅ 数据库连接成功
📝 博主账号不存在，开始初始化...
✅ 博主初始化成功
📝 默认账号: admin
🔐 默认密码: admin123
⚠️  请及时修改默认密码！
服务器启动成功，端口: 3000
```

如果博主已存在：

```
✅ 数据库连接成功
✅ 博主账号已存在，跳过初始化
服务器启动成功，端口: 3000
```

---

请帮我生成 `utils/initBlogger.js` 文件，并修改 `server.js` 集成该模块。

```

```
````
