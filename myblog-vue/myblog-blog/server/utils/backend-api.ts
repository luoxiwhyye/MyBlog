import type { ApiResponse, Article, Category, PaginatedResponse, Tag } from "~/types";

export const fetchBackend = async <T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
) => {
  const runtimeConfig = useRuntimeConfig();
  const baseUrl = runtimeConfig.apiBase.replace(/\/$/, "");
  return $fetch<ApiResponse<T>>(`${baseUrl}${path}`, { query });
};

const fetchAllPages = async <T>(
  path: string,
  pageSize = 100,
  query?: Record<string, string | number | boolean | undefined>,
) => {
  let page = 1;
  let total = 0;
  const items: T[] = [];

  do {
    const response = await fetchBackend<PaginatedResponse<T>>(path, {
      ...query,
      page,
      pageSize,
    });
    items.push(...(response.data.list || []));
    total = response.data.total || 0;
    page += 1;
  } while (items.length < total);

  return items;
};

export const fetchAllArticles = () =>
  fetchAllPages<Article>("/articles", 1000, { status: "published" });

export const fetchAllCategories = () => fetchAllPages<Category>("/types");

export const fetchAllTags = () => fetchAllPages<Tag>("/labels");
