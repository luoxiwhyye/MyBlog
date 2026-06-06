export interface Article {
  id: number;
  title: string;
  summary: string;
  content?: string;
  coverImage?: string;
  viewCount: number;
  status: "published" | "draft";
  type: Category;
  labels: Tag[];
  createdAt: string;
  updatedAt?: string;
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
  status: "approved" | "pending" | "spam" | "deleted";
  createdAt: string;
  createAt?: string;
  replies?: Comment[];
}

export interface ArticleListParams {
  page?: number;
  pageSize?: number;
  typeId?: number;
  labelId?: number;
  status?: "published";
  keyword?: string;
}

export interface CommentListParams {
  page?: number;
  pageSize?: number;
  articleId?: number;
  status?: "approved";
  sortBy?: "latest" | "hottest";
  topLevelOnly?: boolean;
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
  name: string;
  url: string;
}

export interface BloggerProfile {
  id: number;
  nickname: string;
  avatar: string;
  bio: string;
  createdAt: string;
}
