export interface Article {
  id: number;
  title: string;
  summary: string;
  content?: string;
  contentFormat?: "html" | "markdown" | string;
  coverImage?: string;
  viewCount: number;
  status: "published" | "draft";
  isPinned?: boolean;
  isFeatured?: boolean;
  type: Category;
  labels: Tag[];
  createdAt: string;
  updatedAt?: string;
}

/** 文章导航（上一篇/下一篇 / 相关推荐）轻量结构 */
export interface ArticleNav {
  id: number;
  title: string;
  summary?: string;
  coverImage?: string;
  viewCount?: number;
  createdAt: string;
  type: Category | null;
}

export interface AdjacentArticles {
  prev: ArticleNav | null;
  next: ArticleNav | null;
}

/** 相关推荐列表项：在导航结构上补充「为什么相关」的信息 */
export interface RelatedArticle extends ArticleNav {
  /** 相关性得分（共享标签 ×2 + 同分类 ×1）；后端已过滤为 > 0 */
  relevanceScore?: number;
  /** 与当前文章共享的标签名，用于前台展示 */
  sharedLabels?: string[];
}

export interface Category {
  id: number;
  typeName: string;
  articleCount: number;
}

export interface Tag {
  id: number;
  labelName: string;
  articleCount: number;
}

export interface Comment {
  id: number;
  articleId: number;
  parentId: number | null;
  authorName: string;
  authorEmail: string;
  authorUrl?: string;
  content: string;
  likeCount: number;
  status: "approved" | "pending" | "deleted";
  createdAt: string;
  createAt?: string;
  replies?: Comment[];
  /** 是否同意「有人回复我时，邮件通知我」（提交时使用；默认不传 = 不接收） */
  notifyEmail?: boolean;
}

export interface ArticleListParams {
  page?: number;
  pageSize?: number;
  typeId?: number;
  labelId?: number;
  status?: "published";
  keyword?: string;
  /** 排序字段：对应后端白名单键 created_at/updated_at/view_count/title */
  sortBy?: "created_at" | "updated_at" | "view_count" | "title";
}

export interface CommentListParams {
  page?: number;
  pageSize?: number;
  articleId?: number;
  status?: "approved";
  sortBy?: "latest" | "hottest";
  topLevelOnly?: boolean;
}

/** 全局搜索（命令面板）结果项 — 刻意不含 content，避免每次输入都传输正文 */
export interface SearchItem {
  id: number;
  title: string;
  summary: string;
  coverImage?: string;
  createdAt: string;
  typeName: string;
}

export interface SearchResult {
  keyword: string;
  /** meilisearch=全文检索引擎；like=引擎不可用已降级为模糊匹配；none=未传关键词 */
  engine: "meilisearch" | "like" | "none";
  total: number;
  list: SearchItem[];
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Settings {
  [key: string]: {
    value: string;
    type: "text" | "image" | "html" | "boolean";
    description: string;
  };
}

export interface FriendLink {
  id: number;
  name: string;
  url: string;
  avatar?: string;
  description?: string;
  email?: string;
  status?: boolean;
  isSticky?: boolean;
  clickCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MessageBoard {
  id: number;
  authorName: string;
  authorEmail: string;
  authorUrl?: string;
  authorIp?: string;
  content: string;
  status: "pending" | "approved" | "deleted";
  createdAt: string;
  /** 是否同意「留言通过审核后，邮件通知我」（提交时使用；默认不传 = 不接收） */
  notifyEmail?: boolean;
}

export interface BloggerProfile {
  id: number;
  nickname: string;
  avatar: string;
  bio: string;
  createdAt: string;
}
