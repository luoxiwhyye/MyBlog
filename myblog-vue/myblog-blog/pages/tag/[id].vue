<template>
  <div class="tag-detail">
    <nav class="breadcrumb">
      <NuxtLink to="/home">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        首页
      </NuxtLink>
      <span class="breadcrumb-sep">/</span>
      <NuxtLink to="/tag">标签</NuxtLink>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-current">{{ tagName }}</span>
    </nav>

    <h1>{{ tagName }}</h1>
    <p class="stats">共 {{ total }} 篇文章</p>

    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      加载中...
    </div>
    <EmptyState
      v-else-if="articles.length === 0"
      message="该标签下暂无文章"
      description="换个标签看看吧，或者稍后回来。"
      action-text="返回首页"
      action-to="/home"
    />
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

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.tag-detail {
  max-width: 1400px;
  margin: 0 auto;
}

.breadcrumb {
  margin-bottom: $spacing-6;
  margin-top: $spacing-2;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card-lg);
  font-size: 14px;
}

.breadcrumb a {
  color: var(--text-secondary);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;
}

.breadcrumb a:hover {
  color: var(--color-accent);
}

.breadcrumb-sep {
  color: var(--text-muted);
  font-size: 12px;
  user-select: none;
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}

.tag-detail h1 {
  font-size: 32px;
  margin-bottom: 8px;
  color: var(--text-primary);
  text-align: center;
  text-shadow: var(--text-shadow-on-bg), var(--text-glow);
}

.stats {
  text-align: center;
  color: var(--text-muted);
  margin-bottom: $spacing-6;
}

.loading {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-secondary);
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: $spacing-5;
  margin-bottom: $spacing-5;
}
</style>
