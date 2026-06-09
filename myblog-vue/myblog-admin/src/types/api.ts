// API 类型定义文档
// 此文档定义了前端项目中使用的所有 API 接口类型
// 后端开发时请参考这些类型来确保接口返回数据格式一致

// 通用响应类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 分页响应类型
export interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 用户信息类型
export interface UserInfo {
  id: number
  username: string
  email: string
  avatar?: string
  bio?: string
}

// 登录响应
export interface LoginResponse {
  token: string
  blogger: UserInfo
}

// 分类类型
export interface Category {
  id: number
  typeName: string
  articleCount: number
}

// 标签类型
export interface Tag {
  id: number
  labelName: string
  articleCount: number
}

// 文章类型
export interface Article {
  id: number
  title: string
  summary?: string
  content: string
  coverImage?: string
  viewCount: number
  status: 'draft' | 'published'
  type: Category
  labels: Tag[]
  createdAt: string
  updatedAt?: string
}

// 文章详情类型
export interface ArticleDetail {
  id: number
  title: string
  summary?: string
  content: string
  coverImage?: string
  typeId: number
  labelIds: number[]
  status: 'draft' | 'published'
}

// 评论类型
export interface Comment {
  id: number
  articleId: number
  parentId: number | null
  authorName: string
  authorEmail: string
  authorUrl?: string
  content: string
  likeCount: number
  status: 'pending' | 'approved' | 'spam' | 'deleted'
  createdAt: string
  replies?: Comment[]
}

// 网站配置类型
// 与 myblog-blog/types/index.ts 中的 Settings 保持一致
export interface Settings {
  [key: string]: {
    value: string
    type: 'text' | 'image' | 'html' | 'boolean'
    description: string
  }
}

// 文件上传响应
export interface UploadResponse {
  url: string
}

// API 请求参数类型

// 文章列表查询参数
export interface ArticleListParams {
  page?: number
  pageSize?: number
  typeId?: number
  labelId?: number
  status?: 'draft' | 'published'
  keyword?: string
  sortBy?: string
}

// 评论列表查询参数
export interface CommentListParams {
  page?: number
  pageSize?: number
  articleId?: number
  status?: string
}

// 文章创建/更新参数
export interface ArticleFormData {
  title: string
  typeId: number
  content: string
  summary?: string
  labelIds: string // 逗号分隔的标签ID字符串，如 "1,2,3"
  status: 'draft' | 'published'
  coverImage?: File | string // 文件对象或URL
}

// 博主信息更新参数
export interface ProfileUpdateData {
  email: string
  bio?: string
  avatar?: File | string
}

// 密码修改参数
export interface PasswordChangeData {
  oldPassword: string
  newPassword: string
}

// 评论状态更新参数
export interface CommentStatusUpdate {
  status: 'pending' | 'approved' | 'spam' | 'deleted'
}

// 网站配置更新参数 (FormData)
export interface SettingsUpdateData {
  [key: string]: string | File
}

// API 端点和方法定义

export interface ApiEndpoints {
  // 分类管理
  types: {
    getList: (params?: {
      page?: number
      pageSize?: number
    }) => Promise<ApiResponse<PaginatedResponse<Category>>>
    create: (data: { typeName: string }) => Promise<ApiResponse<{ id: number }>>
    update: (id: number, data: { typeName: string }) => Promise<ApiResponse>
    delete: (id: number) => Promise<ApiResponse>
  }

  // 标签管理
  labels: {
    getList: (params?: {
      page?: number
      pageSize?: number
    }) => Promise<ApiResponse<PaginatedResponse<Tag>>>
    create: (data: { labelName: string }) => Promise<ApiResponse<{ id: number }>>
    update: (id: number, data: { labelName: string }) => Promise<ApiResponse>
    delete: (id: number) => Promise<ApiResponse>
  }

  // 文章管理
  articles: {
    getList: (params?: ArticleListParams) => Promise<ApiResponse<PaginatedResponse<Article>>>
    getDetail: (id: number) => Promise<ApiResponse<ArticleDetail>>
    create: (data: FormData) => Promise<ApiResponse<{ id: number; coverImageUrl?: string }>>
    update: (id: number, data: FormData) => Promise<ApiResponse<{ coverImageUrl?: string }>>
    delete: (id: number) => Promise<ApiResponse>
    hardDelete: (id: number) => Promise<ApiResponse>
    restore: (id: number) => Promise<ApiResponse>
    getTrash: (params?: {
      page?: number
      pageSize?: number
    }) => Promise<ApiResponse<PaginatedResponse<Article>>>
  }

  // 评论管理
  comments: {
    getList: (params?: CommentListParams) => Promise<ApiResponse<PaginatedResponse<Comment>>>
    create: (data: {
      articleId: number
      parentId?: number
      authorName: string
      authorEmail: string
      content: string
    }) => Promise<ApiResponse<{ id: number }>>
    delete: (id: number) => Promise<ApiResponse>
    restore: (id: number) => Promise<ApiResponse>
    hardDelete: (id: number) => Promise<ApiResponse>
    updateStatus: (id: number, data: CommentStatusUpdate) => Promise<ApiResponse>
    like: (id: number) => Promise<ApiResponse<{ likeCount: number }>>
  }

  // 博主管理
  blogger: {
    login: (data: { username: string; password: string }) => Promise<ApiResponse<LoginResponse>>
    getProfile: () => Promise<ApiResponse<UserInfo>>
    updateProfile: (data: FormData) => Promise<ApiResponse>
    changePassword: (data: PasswordChangeData) => Promise<ApiResponse>
  }

  // 网站配置管理
  settings: {
    getList: () => Promise<ApiResponse<Settings>>
    update: (data: FormData) => Promise<ApiResponse>
    get: (key: string) => Promise<ApiResponse<{ value: string; type: string; description: string }>>
  }

  // 文件上传
  upload: {
    image: (file: File) => Promise<ApiResponse<UploadResponse>>
  }
}

// 注意事项：
// 1. 所有接口返回的数据都应包装在 ApiResponse 中
// 2. 分页接口统一使用 page 和 pageSize 参数
// 3. 文件上传接口使用 FormData，包含文件的字段
// 4. 日期字段统一使用 YYYY-MM-DD HH:mm:ss 格式
// 5. 图片URL应为完整的可访问URL
// 6. 错误处理：code 不为 200 时，前端会显示 message 中的错误信息
