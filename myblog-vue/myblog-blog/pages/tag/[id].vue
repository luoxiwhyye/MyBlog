<template>
  <div class="tag-detail">
    <nav class="breadcrumb">
      <NuxtLink to="/">首页</NuxtLink>
      <span>&gt;</span>
      <NuxtLink to="/tag">标签</NuxtLink>
      <span>&gt;</span>
      <span>{{ tagName }}</span>
    </nav>

    <h1>{{ tagName }}</h1>
    <p class="stats">共 {{ total }} 篇文章</p>

    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      加载中...
    </div>
    <div v-else-if="articles.length === 0" class="no-articles">该标签下暂无文章</div>
    <div v-else class="articles-grid">
      <ArticleCard v-for="article in articles" :key="article.id" :article="article" />
    </div>
    <Pagination :total="total" :page="currentPage" :page-size="pageSize" @update="handlePageUpdate" />
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";
import { articleApi, tagApi } from "~/api";
import type { Article, PaginatedResponse, Tag } from "~/types";

const route = useRoute();
const currentPage = ref(1);
const pageSize = ref(10);
const tagId = computed(() => Number(route.params.id));

const fetchAllTags = async () => {
  const pageSize = 100;
  let page = 1;
  let total = 0;
  const items: Tag[] = [];

  do {
    const response = await tagApi.getList({ page, pageSize });
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

const { data: tags } = await useAsyncData("tag-options", fetchAllTags, {
  default: () => [],
});

const { data: articlePage, pending } = await useAsyncData(
  () => `tag-articles-${tagId.value}-${currentPage.value}-${pageSize.value}`,
  () =>
    articleApi
      .getList({
        page: currentPage.value,
        pageSize: pageSize.value,
        labelId: tagId.value,
        status: "published",
      })
      .then((response) => response.data),
  {
    watch: [tagId, currentPage, pageSize],
    default: emptyArticlePage,
  },
);

const articles = computed(() => articlePage.value.list);
const total = computed(() => articlePage.value.total);
const tagName = computed(() => {
  return tags.value.find((item) => item.id === tagId.value)?.labelName || "标签详情";
});

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page;
  pageSize.value = size;
};

watch(tagId, () => {
  currentPage.value = 1;
});

usePageSeo({
  title: computed(() => tagName.value),
  description: computed(() => `${tagName.value} 标签下的博客文章列表。`),
});
</script>

<style scoped>
.tag-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.breadcrumb {
  margin-bottom: 20px;
  color: #666;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.breadcrumb a {
  color: #666;
  text-decoration: none;
}

.breadcrumb a:hover {
  color: #007bff;
}

.tag-detail h1 {
  font-size: 32px;
  margin-bottom: 8px;
  color: #333;
  text-align: center;
}

.stats {
  text-align: center;
  color: #64748b;
  margin-bottom: 26px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-articles {
  text-align: center;
  padding: 40px;
  color: #999;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}
</style>
