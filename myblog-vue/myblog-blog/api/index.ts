import request from "~/utils/request";
import type {
  Article,
  Category,
  Tag,
  Comment,
  ArticleListParams,
  CommentListParams,
  ApiResponse,
  PaginatedResponse,
  Settings,
} from "~/types";

const toRequestParams = <T extends object>(params?: T) => {
  return params as Record<string, string | number | boolean | undefined> | undefined;
};

export const articleApi = {
  getList: (
    params?: ArticleListParams,
  ): Promise<ApiResponse<PaginatedResponse<Article>>> =>
    request.get("/articles", { params: toRequestParams(params) }),

  getDetail: (id: number): Promise<ApiResponse<Article>> =>
    request.get(`/articles/${id}`),
};

export const categoryApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Category>>> =>
    request.get("/types", { params: toRequestParams(params) }),
};

export const tagApi = {
  getList: (params?: {
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse<PaginatedResponse<Tag>>> =>
    request.get("/labels", { params: toRequestParams(params) }),
};

export const commentApi = {
  getList: (
    params?: CommentListParams,
  ): Promise<ApiResponse<PaginatedResponse<Comment>>> =>
    request.get("/comments", { params: toRequestParams(params) }),

  create: (data: {
    articleId: number;
    parentId?: number;
    authorName: string;
    authorEmail: string;
    content: string;
  }): Promise<ApiResponse<Comment>> => request.post("/comments", data),

  like: (id: number): Promise<ApiResponse<void>> =>
    request.post(`/comments/${id}/like`),
};

export const settingsApi = {
  getAll: (): Promise<ApiResponse<Settings>> => request.get("/settings"),
};
