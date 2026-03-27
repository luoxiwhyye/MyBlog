@workspace 我正在开发一个 Vue 3 个人博客后台管理系统，使用 Pinia 进行状态管理，Element Plus 作为 UI 组件库。后端 API 基础地址为 `http://localhost:3000/api/v1`，使用 JWT Bearer Token 进行认证。

请帮我创建 `src/utils/request.js` 文件，封装一个基于 axios 的请求实例。要求如下：

1. 创建一个 axios 实例，设置 `baseURL` 为上述后端地址。
2. 请求拦截器：从 localStorage 中获取 token，并将其添加到请求头的 `Authorization` 字段中（格式：`Bearer ${token}`）。
3. 响应拦截器：
   - 如果响应状态码为 200，直接返回 `response.data`（即后端返回的 `{ code, message, data }` 结构）。
   - 如果响应状态码为 401（未授权），则清除 localStorage 中的 token，并跳转到登录页面。
   - 如果响应状态码为其他错误，则使用 `ElMessage` 组件（Element Plus）显示 `response.data.message` 或 '请求失败' 的错误提示。
4. 最后导出这个 axios 实例。

@workspace 请帮我创建 `src/api/index.js` 文件。在这个文件中，导入上一步创建的 `request` 实例，并根据以下后端接口文档，定义所有 API 请求函数。请按照模块进行分组和导出，例如：`export const article = { getList, getDetail, create, update, delete }`。

后端接口文档请参考我之前提供的 `博客系统API文档`。你需要为以下所有模块定义函数：

- 分类管理
- 标签管理
- 文章管理
- 评论管理
- 博主管理（登录、获取信息、更新信息、修改密码）
- 网站配置管理
- 文件上传

请确保函数命名清晰，并正确传递参数（如分页参数 `page`, `pageSize`，路径参数 `id`，请求体数据等）。

@workspace 请帮我创建 `src/stores/user.js` 文件，用于管理用户（博主）的登录状态和信息。

要求：

1. 使用 Pinia 的 `defineStore`，store 名为 `useUserStore`。
2. State 需要包含：`token` (string | null), `userInfo` (object | null)。
3. Actions 需要包含：
   - `login(userData)`: 接收用户名和密码，调用 `api/blogger.login` 接口。登录成功后，将返回的 `token` 和 `blogger` 信息保存到 state 和 localStorage 中。
   - `logout()`: 清除 state 中的 token 和 userInfo，并清除 localStorage。
   - `fetchUserInfo()`: 从后端获取最新的博主信息并更新到 state。如果 token 存在但 userInfo 为空，则在应用初始化时调用此方法。
4. Getters 可以包含一个 `isLoggedIn`，用于判断用户是否已登录。

@workspace 请帮我完善 `src/router/index.js` 文件。我需要定义以下路由，并实现全局前置守卫。

1. 定义路由：
   - 登录页：`/login`
   - 后台布局：`/admin`，作为所有后台页面的父级路由。
   - 后台子路由：
     - 仪表盘：`/admin/dashboard`
     - 文章管理：`/admin/articles`
     - 写文章/编辑文章：`/admin/articles/edit/:id?` (问号表示可选，用于区分新建和编辑)
     - 分类管理：`/admin/types`
     - 标签管理：`/admin/labels`
     - 评论管理：`/admin/comments`
     - 个人资料：`/admin/profile`
     - 网站配置：`/admin/settings`

2. 全局前置守卫：
   - 判断目标路由是否以 `/admin` 开头（需要登录）。
   - 如果是，检查 `useUserStore` 中的 `token` 是否存在。
   - 如果 token 不存在，则重定向到 `/login`，并携带 `redirect` 参数，以便登录后跳回原页面。
   - 如果 token 存在，但 `userInfo` 为空，可以在此处调用 `fetchUserInfo` 获取用户信息。
   - 登录页 (`/login`) 如果已登录，应重定向到 `/admin/dashboard`。

@workspace 请帮我创建 `src/views/Login.vue` 登录页面。使用 Vue 3 Composition API (`<script setup>`) 和 Element Plus 组件。

要求：

1. 页面中央是一个卡片式的登录表单，包含用户名、密码输入框和登录按钮。
2. 使用 `reactive` 或 `ref` 定义表单数据 `loginForm` 和校验规则。
3. 登录按钮点击时，调用 `useUserStore` 中的 `login` action。
4. 登录成功：使用 `ElMessage` 提示成功，并获取路由 `query` 中的 `redirect` 参数，跳转到指定页面（默认为 `/admin/dashboard`）。
5. 登录失败：使用 `ElMessage` 显示错误信息。
6. 添加一个简单的“记住我”功能（可选），用于保存用户名。

@workspace 请帮我创建 `src/layouts/AdminLayout.vue` 后台管理系统的布局组件。使用 Element Plus 的布局容器。

要求：

1. 使用 `<el-container>` 构建页面结构。
2. 侧边栏 (`<el-aside>`)：
   - 宽度可折叠，使用 `el-menu` 组件。
   - 菜单项根据之前定义的路由配置生成，包括：仪表盘、文章管理、分类管理、标签管理、评论管理、个人资料、网站配置。
   - 菜单项支持图标（使用 Element Plus 图标）。
   - 点击菜单项时，使用 `router.push` 进行路由跳转，并高亮当前激活的菜单。
3. 头部 (`<el-header>`)：
   - 左侧显示一个折叠侧边栏的按钮。
   - 右侧显示博主头像（如果有）、昵称和一个下拉菜单，下拉菜单包含“个人资料”和“退出登录”选项。
   - “退出登录”选项点击时，调用 `useUserStore` 的 `logout` 方法，并跳转到登录页。
4. 主体 (`<el-main>`)：用于渲染当前路由对应的页面组件。
5. 底部 (`<el-footer>`)：显示版权信息，例如“© 2026 MyBlog 后台管理系统”。

@workspace 请帮我创建 `src/views/article/ArticleList.vue` 文章管理列表页。使用 Vue 3 Composition API 和 Element Plus 组件。

要求：

1. 页面顶部是一个搜索和筛选栏：
   - 搜索框：按标题模糊搜索。
   - 分类下拉选择框：从 `api/type.getList` 接口获取分类列表。
   - 状态下拉选择框：草稿/已发布。
   - “搜索”按钮和“重置”按钮。
   - “写文章”按钮，点击跳转到 `/admin/articles/edit`。
2. 文章列表使用 `<el-table>` 展示，包含字段：ID、封面缩略图、标题、分类、标签、浏览数、状态、创建时间、操作。
3. 操作列包含：“编辑”、“删除”（软删除）按钮。删除时需弹出 `ElMessageBox` 确认框。
4. 表格支持分页，使用 `<el-pagination>` 组件。当前页码、每页条数变化时，重新加载列表数据。
5. 页面加载时，以及筛选、分页条件变化时，调用 `api/article.getList` 接口获取数据。
6. 建议：在表格上方增加一个“回收站”按钮，点击可跳转到 `/admin/articles/trash` 页面（暂不实现，但留出位置）。

@workspace 请帮我创建 `src/views/article/ArticleEditor.vue` 文章编辑/创建页面。这是一个功能复杂的页面，需要使用 Vue 3 Composition API 和富文本编辑器（请集成一个简单的富文本编辑器，例如 `@vueup/vue-quill`）。

要求：

1. 页面功能：支持创建新文章和编辑已有文章。根据路由参数 `id` 来判断是编辑模式（有 id）还是创建模式（无 id）。
2. 表单结构：
   - 标题 (el-input)
   - 分类 (el-select，数据从 `api/type.getList` 获取)
   - 标签 (el-select，支持多选，数据从 `api/label.getList` 获取)
   - 封面图片 (el-upload，用于上传图片，调用 `api/upload.image` 接口，成功后显示图片 URL 并存储)
   - 摘要 (el-input，或 el-input 的 textarea 类型)
   - 内容 (富文本编辑器)
   - 状态 (el-radio-group，选项：草稿/发布)
3. 页面底部有“保存草稿”和“发布文章”两个按钮。
4. 在编辑模式下，页面加载时需调用 `api/article.getDetail` 获取文章详情，并回填到表单中。同时，处理标签回填（从接口返回的 labels 数组中提取 id）。
5. 提交时，收集表单数据，构建 `FormData` 对象（因为可能包含封面文件）。调用 `api/article.create` 或 `api/article.update` 接口。
6. 操作成功后，使用 `ElMessage` 提示成功，并跳转回文章列表页。
7. 操作失败时，使用 `ElMessage` 显示错误信息。
8. 建议：在页面顶部增加一个“返回列表”按钮，点击可跳转回 `/admin/articles` 页面。

@workspace 请帮我创建 `src/views/article/ArticleEditor.vue` 文章编辑/创建页面。这是一个功能复杂的页面，需要使用 Vue 3 Composition API 和富文本编辑器（请集成一个简单的富文本编辑器，例如 `@vueup/vue-quill`）。

要求：

1. 页面功能：支持创建新文章和编辑已有文章。根据路由参数 `id` 来判断是编辑模式（有 id）还是创建模式（无 id）。
2. 表单结构：
   - 标题 (el-input)
   - 分类 (el-select，数据从 `api/type.getList` 获取)
   - 标签 (el-select，支持多选，数据从 `api/label.getList` 获取)
   - 封面图片 (el-upload，用于上传图片，调用 `api/upload.image` 接口，成功后显示图片 URL 并存储)
   - 摘要 (el-input，或 el-input 的 textarea 类型)
   - 内容 (富文本编辑器)
   - 状态 (el-radio-group，选项：草稿/发布)
3. 页面底部有“保存草稿”和“发布文章”两个按钮。
4. 在编辑模式下，页面加载时需调用 `api/article.getDetail` 获取文章详情，并回填到表单中。同时，处理标签回填（从接口返回的 labels 数组中提取 id）。
5. 提交时，收集表单数据，构建 `FormData` 对象（因为可能包含封面文件）。调用 `api/article.create` 或 `api/article.update` 接口。
6. 操作成功后，使用 `ElMessage` 提示成功，并跳转回文章列表页。
7. 操作失败时，使用 `ElMessage` 显示错误信息。
8. 建议：在页面顶部增加一个“返回列表”按钮，点击可跳转回 `/admin/articles` 页面。

@workspace 请帮我创建 `src/views/TypeManage.vue` 分类管理页面。

要求：

1. 页面包含一个“新增分类”按钮，点击后弹出一个对话框（`el-dialog`），用于输入分类名称。
2. 使用 `<el-table>` 展示所有分类，列包括：ID、分类名称、文章数量、操作。
3. 操作列包含：“编辑”和“删除”按钮。
   - 点击“编辑”弹出对话框，允许修改分类名称。
   - 点击“删除”时，需要调用 `api/type.delete` 接口。如果后端返回分类下有关联文章的错误，需要在前端用 `ElMessage` 展示错误信息。
4. 分类列表支持分页，使用 `<el-pagination>`。
5. 页面加载时，调用 `api/type.getList` 获取数据。

@workspace 请帮我创建 `src/views/LabelManage.vue` 标签管理页面。功能和交互参考分类管理页面。

要求：

1. 包含新增、编辑、删除标签的功能。
2. 使用 `<el-table>` 展示标签列表，列包括：ID、标签名称、文章数量、操作。
3. 支持分页。
4. 调用 `api/label` 模块下对应的接口。

@workspace 请帮我创建 `src/views/CommentManage.vue` 评论管理页面。

要求：

1. 页面顶部有一个筛选栏：按文章 ID 筛选评论。
2. 评论列表以树形结构展示（因为有嵌套回复），可以使用 `<el-table>` 通过 `row-class-name` 或自定义模板来实现缩进效果。列包括：ID、作者、内容、文章 ID、点赞数、状态、创建时间、操作。
3. 操作列包含：
   - “审核”按钮（对于 `pending` 状态的评论），点击后可将其状态改为 `approved` 或 `spam`。
   - “删除”按钮，点击后调用删除接口。
4. 表格支持分页。
5. 页面加载时以及筛选、分页条件变化时，调用 `api/comment.getList` 接口获取数据。
6. 建议：在操作列增加一个“查看文章”按钮，点击后跳转到对应文章的前端页面（例如 `http://localhost:3000/article/{articleId}`）。

@workspace 请帮我创建 `src/views/Profile.vue` 个人资料页面。

要求：

1. 页面分为两部分：博主信息展示/编辑、修改密码。
2. 博主信息部分：
   - 使用 `el-form` 展示：头像（可上传更新）、邮箱、简介。
   - 头像使用 `el-upload` 组件，支持上传新头像。
   - 点击“更新资料”按钮时，调用 `api/blogger.updateProfile` 接口（注意：如果包含头像，需构建 `FormData`）。
3. 修改密码部分：
   - 独立表单，包含：旧密码、新密码、确认新密码。
   - 点击“修改密码”按钮时，调用 `api/blogger.changePassword` 接口。
4. 页面加载时，从 `useUserStore` 中获取 `userInfo` 并回填到表单。同时，也支持调用 `api/blogger.getProfile` 获取最新信息。
5. 操作成功后，使用 `ElMessage` 提示成功。
6. 操作失败时，使用 `ElMessage` 显示错误信息。

@workspace 请帮我创建 `src/views/Settings.vue` 网站配置页面。

要求：

1. 页面功能是动态展示并编辑网站的配置项。
2. 页面加载时，调用 `api/setting.getList` 获取所有配置项。
3. 根据配置项的 `setting_type` (text/image) 动态生成表单项：
   - `text` 类型：使用 `el-input` 组件。
   - `image` 类型：使用 `el-upload` 组件，用于上传图片，上传成功后显示图片预览和 URL。
4. 页面底部有一个“保存所有配置”按钮。
5. 点击保存时，需要遍历所有表单项，构建一个 `FormData` 对象。对于文本配置，将数据放入 `settings` 对象中；对于图片配置，如果有新上传的文件，则将其作为单独的文件字段附加到 `FormData` 中。最后调用 `api/setting.update` 接口。
6. 保存成功后，刷新配置列表或给出成功提示。
7. 保存失败时，使用 `ElMessage` 显示错误信息。

@workspace 请帮我创建 `src/views/Dashboard.vue` 仪表盘页面，用于展示博客的核心数据概览。

要求：

1. 页面顶部展示几个统计卡片（`el-card` 或 `el-statistic`）：总文章数、总评论数、总浏览数、待审核评论数。（这些数据需要后端提供对应的统计接口，如果暂无，可以先写死或留空）。
2. 展示近一周的文章发布趋势图（可以使用 `echarts` 或类似的图表库）。同样，数据需要后端支持。
3. 展示最新的几条评论列表。
4. 这个页面可以最后再实现，但为了结构完整，先创建此文件并放在路由中。

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

---

# 建表语句如下

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
