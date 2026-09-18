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
    /** 按名称模糊检索（后端过滤，非当前页前端过滤） */
    keyword?: string
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
      contentFormat: 'html' | 'markdown'
      coverImage: string
      typeId: number
      labelIds: number[]
      status: 'draft' | 'published'
      /** 是否开放评论区（后台可下线单篇文章的评论区） */
      commentEnabled: boolean
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
  batchUpdateStatus: (data: {
    ids: number[]
    status: 'draft' | 'published'
  }): Promise<ApiResponse<{ affected: number }>> => {
    return request.put('/articles/batch/status', data)
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
    /** 层级筛选：all 全部 / top 仅父评论 / reply 仅回复 */
    level?: 'all' | 'top' | 'reply'
  }): Promise<
    ApiResponse<
      PaginatedResponse<{
        id: number
        articleId: number
        parentId: number | null
        authorName: string
        authorEmail: string
        authorUrl?: string
        content: string
        likeCount: number
        status: 'pending' | 'approved' | 'deleted'
        createdAt: string
        /** 访客是否勾选「有人回复我时，邮件通知我」 */
        notifyEmail: boolean
        /**
         * 父评论状态（父评论为 null）；管理端接口才返回。
         * 非 approved 表示这条回复的父评论没通过审核，审核本条会被后端拒绝。
         */
        parentStatus: 'pending' | 'approved' | 'deleted' | null
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
    authorUrl?: string
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
    data: { status: 'pending' | 'approved' | 'deleted' },
  ): Promise<ApiResponse> => {
    return request.put(`/comments/${id}/status`, data)
  },
  /** 批量改状态：传入顶层评论会连带其后代，affected 为实际纳入范围的行数 */
  batchUpdateStatus: (data: {
    ids: number[]
    status: 'pending' | 'approved' | 'deleted'
  }): Promise<ApiResponse<{ affected: number; requested: number }>> => {
    return request.put('/comments/batch/status', data)
  },
  like: (id: number): Promise<ApiResponse<{ likeCount: number }>> => {
    return request.post(`/comments/${id}/like`)
  },
}

// 留言板管理
export const messageBoard = {
  getList: (params?: {
    page?: number
    pageSize?: number
    status?: string
  }): Promise<
    ApiResponse<
      PaginatedResponse<{
        id: number
        authorName: string
        authorEmail: string
        authorUrl?: string
        authorIp?: string
        content: string
        status: 'pending' | 'approved' | 'deleted'
        createdAt: string
      }>
    >
  > => {
    return request.get('/message-board', { params })
  },
  delete: (id: number): Promise<ApiResponse> => {
    return request.delete(`/message-board/${id}`)
  },
  restore: (id: number): Promise<ApiResponse> => {
    return request.put(`/message-board/${id}/restore`)
  },
  hardDelete: (id: number): Promise<ApiResponse> => {
    return request.delete(`/message-board/${id}/hard`)
  },
  updateStatus: (
    id: number,
    data: { status: 'pending' | 'approved' | 'deleted' },
  ): Promise<ApiResponse> => {
    return request.put(`/message-board/${id}/status`, data)
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
        nickname: string
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
      nickname: string
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
  exists: (): Promise<ApiResponse<{ exists: boolean }>> => {
    return request.get('/blogger/exists')
  },
  init: (data: {
    username: string
    password: string
    nickname?: string
    email?: string
  }): Promise<ApiResponse> => {
    return request.post('/blogger/init', data)
  },
  reset: (data: {
    username: string
    password: string
    nickname?: string
    email?: string
  }): Promise<ApiResponse> => {
    return request.post('/blogger/reset', data)
  },
}

// 网站配置管理
export interface CustomSettingItem {
  key: string
  value: string
  type: string
  description: string
}

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
  create: (data: {
    key: string
    value: string
    type?: string
    description?: string
  }): Promise<ApiResponse<CustomSettingItem>> => {
    return request.post('/settings', data)
  },
  updateByKey: (
    key: string,
    data: { value?: string; type?: string; description?: string },
  ): Promise<ApiResponse<CustomSettingItem>> => {
    return request.put(`/settings/${key}`, data)
  },
  updateBatch: (
    data: Record<string, { value: string; type?: string; description?: string }>,
  ): Promise<ApiResponse> => {
    return request.put('/settings', { settings: data })
  },
  remove: (key: string): Promise<ApiResponse> => {
    return request.delete(`/settings/${key}`)
  },
}

// 友链管理
export interface FriendLinkItem {
  id: number
  name: string
  url: string
  avatar?: string
  description?: string
  email?: string
  status: boolean
  isSticky: boolean
  clickCount: number
  createdAt: string
  updatedAt: string
}

export const friendLink = {
  getList: (params?: {
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<PaginatedResponse<FriendLinkItem>>> => {
    return request.get('/friend-links', { params })
  },
  getDetail: (id: number): Promise<ApiResponse<FriendLinkItem>> => {
    return request.get(`/friend-links/${id}`)
  },
  create: (data: {
    name: string
    url: string
    avatar?: string
    description?: string
    email?: string
    status?: boolean
    isSticky?: boolean
  }): Promise<ApiResponse<{ id: number }>> => {
    return request.post('/friend-links', data)
  },
  update: (
    id: number,
    data: Partial<{
      name: string
      url: string
      avatar: string
      description: string
      email: string
      status: boolean
      isSticky: boolean
    }>,
  ): Promise<ApiResponse> => {
    return request.put(`/friend-links/${id}`, data)
  },
  delete: (id: number): Promise<ApiResponse> => {
    return request.delete(`/friend-links/${id}`)
  },
}

// 文件上传
export const upload = {
  image: (
    file: File,
    scene:
      | 'avatar'
      | 'article-cover'
      | 'article-content'
      | 'setting-image'
      | 'emoji' = 'article-content',
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

// 表情类型（A：新增 image，图片表情不再硬塞进 emoji）
export type EmojiType = 'emoji' | 'kaomoji' | 'image'

export interface EmojiItem {
  id: number
  content: string
  type: EmojiType
  groupId: number | null
  groupName: string | null
  isCustom: number
  enabled: number
  sortOrder: number
  createdAt: string
}

export interface EmojiGroupItem {
  id: number
  name: string
  cover: string | null
  sortOrder: number
  emojiCount: number
  createdAt: string
}

// 表情管理（管理员 CRUD + 公开 enabled 列表）
export const emoji = {
  getList: (params?: {
    page?: number
    pageSize?: number
    type?: string
    enabled?: boolean
    groupId?: number | string
  }): Promise<ApiResponse<PaginatedResponse<EmojiItem>>> => {
    return request.get('/emoji', { params })
  },
  getEnabled: (): Promise<ApiResponse<Array<EmojiItem>>> => {
    return request.get('/emoji/enabled')
  },
  create: (data: {
    content: string
    type?: EmojiType
    groupId?: number | null
    isCustom?: boolean
    enabled?: boolean
    sortOrder?: number
  }): Promise<ApiResponse<{ id: number }>> => {
    return request.post('/emoji', data)
  },
  update: (
    id: number,
    data: {
      content?: string
      type?: EmojiType
      groupId?: number | null
      isCustom?: boolean
      enabled?: boolean
      sortOrder?: number
    },
  ): Promise<ApiResponse> => {
    return request.put(`/emoji/${id}`, data)
  },
  delete: (id: number): Promise<ApiResponse> => {
    return request.delete(`/emoji/${id}`)
  },
}

// 表情分组管理（名称 + 标识 + 排序；全部需管理员）
export const emojiGroup = {
  getList: (): Promise<ApiResponse<EmojiGroupItem[]>> => {
    return request.get('/emoji-groups')
  },
  create: (data: {
    name: string
    cover?: string | null
    sortOrder?: number
  }): Promise<ApiResponse<{ id: number }>> => {
    return request.post('/emoji-groups', data)
  },
  update: (
    id: number,
    data: { name?: string; cover?: string | null; sortOrder?: number },
  ): Promise<ApiResponse> => {
    return request.put(`/emoji-groups/${id}`, data)
  },
  delete: (id: number): Promise<ApiResponse> => {
    return request.delete(`/emoji-groups/${id}`)
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
  getUnreadCounts: (): Promise<ApiResponse<{ comments: number; messages: number }>> => {
    return request.get('/dashboard/unread-counts')
  },
}

// 缓存管理（管理员）
export const cache = {
  getStats: (): Promise<
    ApiResponse<{
      hits: number
      misses: number
      hitRate: number
      keyCount: number
      startedAt: string
    }>
  > => {
    return request.get('/cache/stats')
  },
  clearAll: (): Promise<ApiResponse<{ cleared: number }>> => {
    return request.post('/cache/clear')
  },
  preheat: (prefixes?: string[]): Promise<ApiResponse<{ prefixes: string[] }>> => {
    return request.post('/cache/preheat', { prefixes })
  },
}

// 性能监控（管理员）
export const metrics = {
  getSnapshot: (): Promise<
    ApiResponse<{
      totalRequests: number
      avgResponseTimeMs: number
      maxResponseTimeMs: number
      errorRate: number
      statusCodes: Record<string, number>
      recentSlow: Array<{
        method: string
        path: string
        ms: number
        status: number
        at: string
      }>
      startedAt: string
    }>
  > => {
    return request.get('/metrics')
  },
}

// 邮件通知（管理员）：查看 SMTP 配置状态 / 真实发一封测试邮件
export const mail = {
  getStatus: (): Promise<
    ApiResponse<{
      /** ok = SMTP 可用；disabled = 未配置（reason 说明缺哪一项） */
      status: 'ok' | 'disabled'
      reason: string
      host: string
      port: number
      /** 是否直连 SSL（= encryption === 'ssl'，保留给旧调用方） */
      secure: boolean
      /** 传输加密方式：ssl（465）/ starttls（587）/ none（不加密） */
      encryption: 'ssl' | 'starttls' | 'none'
      user: string
      from: string
      /** 站点地址（邮件里链接的前缀）；空串 = 邮件里的链接不带域名，收件人点开是空页 */
      siteUrl: string
      /** 站点地址不可用时的告警文案（空 / 本机 / 内网 / 保留域名 / 非法 URL）；空串 = 没问题 */
      siteUrlWarning: string
      /** 通知邮件的实际收件人（博主邮箱） */
      recipient: string
      /** 收件人不可送达时的告警文案（占位地址 / 空）；空串 = 没问题 */
      recipientWarning: string
    }>
  > => {
    return request.get('/mail/status')
  },
  sendTest: (data?: { to?: string }): Promise<ApiResponse<{ to: string }>> => {
    return request.post('/mail/test', data ?? {})
  },
}

// 前端错误监控日志（管理员查看/清空）
export const errorLog = {
  getList: (params?: {
    page?: number
    pageSize?: number
    type?: string
  }): Promise<
    ApiResponse<
      PaginatedResponse<{
        id: number
        title: string
        message: string
        source: string
        line: number | null
        col: number | null
        url: string
        component: string
        ua: string
        occurredAt: string
      }>
    >
  > => {
    return request.get('/error-log', { params })
  },
  clear: (): Promise<ApiResponse<{ affected: number }>> => {
    return request.delete('/error-log')
  },
}
