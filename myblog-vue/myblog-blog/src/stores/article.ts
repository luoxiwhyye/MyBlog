import { defineStore } from "pinia";
import { ref } from "vue";
import { articleApi } from "@/api";
import type { Article, ArticleListParams } from "@/types";

export const useArticleStore = defineStore("article", () => {
  const articles = ref<Article[]>([]);
  const currentArticle = ref<Article | null>(null);
  const loading = ref(false);
  const total = ref(0);

  const fetchArticles = async (params: ArticleListParams = {}) => {
    loading.value = true;
    try {
      const response = await articleApi.getList(params);
      articles.value = response.data.list;
      total.value = response.data.total;
    } finally {
      loading.value = false;
    }
  };

  const fetchArticleDetail = async (id: number) => {
    loading.value = true;
    try {
      const response = await articleApi.getDetail(id);
      currentArticle.value = response.data;
    } finally {
      loading.value = false;
    }
  };

  return {
    articles,
    currentArticle,
    loading,
    total,
    fetchArticles,
    fetchArticleDetail,
  };
});
