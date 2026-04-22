import request from '@/utils/request'

// 类型定义
interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

interface PaginatedResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

// 分类管理
export const type = {
  getList: (params?: {
    page?: number
    pageSize?: number
  }): Promise<
    ApiResponse<PaginatedResponse<{ id: number; typeName: string; articleCount: number }>>
  > => {
    return request.get('/types', { params })
  },
  create: (data: { typeName: string }): Promise<ApiResponse<{ id: number }>> => {
    return request.post('/types', data)
  },
  update: (id: number, data: { typeName: string }): Promise<ApiResponse> => {
    return request.put(`/types/${id}`, data)
  },
  delete: (id: number): Promise<ApiResponse> => {
    return request.delete(`/types/${id}`)
  },
}

// 标签管理
export const label = {
  getList: (params?: {
    page?: number
    pageSize?: number
  }): Promise<
    ApiResponse<PaginatedResponse<{ id: number; labelName: string; articleCount: number }>>
  > => {
    return request.get('/labels', { params })
  },
  create: (data: { labelName: string }): Promise<ApiResponse<{ id: number }>> => {
    return request.post('/labels', data)
  },
  update: (id: number, data: { labelName: string }): Promise<ApiResponse> => {
    return request.put(`/labels/${id}`, data)
  },
  delete: (id: number): Promise<ApiResponse> => {
    return request.delete(`/labels/${id}`)
  },
}

// 文章管理
export const article = {
  getList: (params?: {
    page?: number
    pageSize?: number
    typeId?: number
    labelId?: number
    status?: 'draft' | 'published'
    keyword?: string
    sortBy?: string
  }): Promise<
    ApiResponse<
      PaginatedResponse<{
        id: number
        title: string
        summary: string
        coverImage: string
        viewCount: number
        status: 'draft' | 'published'
        type: { id: number; typeName: string }
        labels: { id: number; labelName: string }[]
        createdAt: string
      }>
    >
  > => {
    return request.get('/articles', { params })
  },
  getDetail: (
    id: number,
  ): Promise<
    ApiResponse<{
      id: number
      title: string
      summary: string
      content: string
      coverImage: string
      typeId: number
      labelIds: number[]
      status: 'draft' | 'published'
    }>
  > => {
    return request.get(`/articles/${id}`)
  },
  create: (data: FormData): Promise<ApiResponse<{ id: number; coverImageUrl?: string }>> => {
    return request.post('/articles', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  update: (id: number, data: FormData): Promise<ApiResponse<{ coverImageUrl?: string }>> => {
    return request.put(`/articles/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  delete: (id: number): Promise<ApiResponse> => {
    return request.delete(`/articles/${id}`)
  },
  hardDelete: (id: number): Promise<ApiResponse> => {
    return request.delete(`/articles/${id}/hard`)
  },
  restore: (id: number): Promise<ApiResponse> => {
    return request.put(`/articles/${id}/restore`)
  },
  getTrash: (params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<PaginatedResponse<any>>> => {
    return request.get('/articles/trash', { params })
  },
}

// 评论管理
export const comment = {
  getList: (params?: {
    page?: number
    pageSize?: number
    articleId?: number
    status?: string
  }): Promise<
    ApiResponse<
      PaginatedResponse<{
        id: number
        articleId: number
        parentId: number | null
        authorName: string
        authorEmail: string
        content: string
        likeCount: number
        status: 'pending' | 'approved' | 'spam' | 'deleted'
        createdAt: string
        replies: any[]
      }>
    >
  > => {
    return request.get('/comments', { params })
  },
  create: (data: {
    articleId: number
    parentId?: number
    authorName: string
    authorEmail: string
    content: string
  }): Promise<ApiResponse<{ id: number }>> => {
    return request.post('/comments', data)
  },
  delete: (id: number): Promise<ApiResponse> => {
    return request.delete(`/comments/${id}`)
  },
  restore: (id: number): Promise<ApiResponse> => {
    return request.put(`/comments/${id}/restore`)
  },
  hardDelete: (id: number): Promise<ApiResponse> => {
    return request.delete(`/comments/${id}/hard`)
  },
  updateStatus: (
    id: number,
    data: { status: 'pending' | 'approved' | 'spam' | 'deleted' },
  ): Promise<ApiResponse> => {
    return request.put(`/comments/${id}/status`, data)
  },
  like: (id: number): Promise<ApiResponse<{ likeCount: number }>> => {
    return request.post(`/comments/${id}/like`)
  },
}

// 博主管理
export const blogger = {
  login: (data: {
    username: string
    password: string
  }): Promise<
    ApiResponse<{
      token: string
      blogger: {
        id: number
        username: string
        email: string
        avatar: string
        bio: string
      }
    }>
  > => {
    return request.post('/blogger/login', data)
  },
  getProfile: (): Promise<
    ApiResponse<{
      id: number
      username: string
      email: string
      avatar: string
      bio: string
    }>
  > => {
    return request.get('/blogger/profile')
  },
  updateProfile: (data: FormData): Promise<ApiResponse> => {
    return request.put('/blogger/profile', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  changePassword: (data: { oldPassword: string; newPassword: string }): Promise<ApiResponse> => {
    return request.put('/blogger/password', data)
  },
}

// 网站配置管理
export const setting = {
  getList: (): Promise<
    ApiResponse<
      Record<
        string,
        { value: string; type: 'text' | 'image' | 'html' | 'boolean'; description: string }
      >
    >
  > => {
    return request.get('/settings')
  },
  update: (data: FormData): Promise<ApiResponse> => {
    return request.put('/settings', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  get: (
    key: string,
  ): Promise<ApiResponse<{ value: string; type: string; description: string }>> => {
    return request.get(`/settings/${key}`)
  },
}

// 文件上传
export const upload = {
  image: (
    file: File,
    scene: 'avatar' | 'article-cover' | 'article-content' | 'setting-image' = 'article-content',
    options?: { settingKey?: string },
  ): Promise<ApiResponse<{ url: string }>> => {
    const formData = new FormData()
    formData.append('scene', scene)
    if (options?.settingKey) {
      formData.append('settingKey', options.settingKey)
    }
    formData.append('image', file)
    return request.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// 仪表盘数据
export const dashboard = {
  getStats: (): Promise<
    ApiResponse<{
      totalArticles: number
      totalComments: number
      totalViews: number
      pendingComments: number
    }>
  > => {
    return request.get('/dashboard/stats')
  },
  getCharts: (params?: {
    days?: number
    scope?: 'published' | 'all'
  }): Promise<
    ApiResponse<{
      scope: 'published' | 'all'
      articlePublishTrend: Array<{ date: string; count: number }>
      typeDistribution: Array<{ typeId: number; typeName: string; articleCount: number }>
    }>
  > => {
    return request.get('/dashboard/charts', { params })
  },
}
