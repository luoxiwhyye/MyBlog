<template>
  <div class="category-detail">
    <nav class="breadcrumb">
      <NuxtLink to="/">首页</NuxtLink>
      <span>&gt;</span>
      <NuxtLink to="/category">分类</NuxtLink>
      <span>&gt;</span>
      <span>{{ categoryName }}</span>
    </nav>

    <h1>{{ categoryName }}</h1>
    <p class="stats">共 {{ total }} 篇文章</p>

    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      加载中...
    </div>
    <div v-else-if="articles.length === 0" class="no-articles">该分类下暂无文章</div>
    <div v-else class="articles-grid">
      <ArticleCard v-for="article in articles" :key="article.id" :article="article" />
    </div>
    <Pagination :total="total" :page="currentPage" :page-size="pageSize" @update="handlePageUpdate" />
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";
import { articleApi, categoryApi } from "~/api";
import type { Article, Category, PaginatedResponse } from "~/types";

const route = useRoute();
const currentPage = ref(1);
const pageSize = ref(10);
const categoryId = computed(() => Number(route.params.id));

const fetchAllCategories = async () => {
  const pageSize = 100;
  let page = 1;
  let total = 0;
  const items: Category[] = [];

  do {
    const response = await categoryApi.getList({ page, pageSize });
    items.push(...(response.data.list || []));
    total = response.data.total || 0;
    page += 1;
  } while (items.length < total);

  return items;
};

const emptyArticlePage = (): PaginatedResponse<Article> => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
});

const { data: categories } = await useAsyncData("category-options", fetchAllCategories, {
  default: () => [],
});

const { data: articlePage, pending } = await useAsyncData(
  () => `category-articles-${categoryId.value}-${currentPage.value}-${pageSize.value}`,
  () =>
    articleApi
      .getList({
        page: currentPage.value,
        pageSize: pageSize.value,
        typeId: categoryId.value,
        status: "published",
      })
      .then((response) => response.data),
  {
    watch: [categoryId, currentPage, pageSize],
    default: emptyArticlePage,
  },
);

const articles = computed(() => articlePage.value.list);
const total = computed(() => articlePage.value.total);
const categoryName = computed(() => {
  return categories.value.find((item) => item.id === categoryId.value)?.typeName || "分类详情";
});

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page;
  pageSize.value = size;
};

watch(categoryId, () => {
  currentPage.value = 1;
});

usePageSeo({
  title: computed(() => categoryName.value),
  description: computed(() => `${categoryName.value} 分类下的博客文章列表。`),
});
</script>

<style scoped>
.category-detail {
  max-width: 1400px;
  margin: 0 auto;
}

.breadcrumb {
  margin-bottom: 20px;
  color: var(--text-secondary);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.breadcrumb a {
  color: var(--text-secondary);
  text-decoration: none;
}

.breadcrumb a:hover {
  color: var(--color-link);
}

.category-detail h1 {
  font-size: 32px;
  margin-bottom: 8px;
  color: var(--text-primary);
  text-align: center;
}

.stats {
  text-align: center;
  color: var(--text-muted);
  margin-bottom: 26px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.no-articles {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}
</style>
