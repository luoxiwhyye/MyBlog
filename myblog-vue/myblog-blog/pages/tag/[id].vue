<template>
  <div class="tag-detail">
    <!-- 页头卡：面包屑 + 标题 + 文章数 合成一张卡 -->
    <PageHeader
      :title="tagName"
      :description="t('common.articleCount', { count: total })"
    >
      <nav class="breadcrumb">
        <NuxtLink to="/home">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          {{ t('nav.home') }}
        </NuxtLink>
        <span class="breadcrumb-sep">/</span>
        <NuxtLink to="/tag">{{ t('nav.tag') }}</NuxtLink>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current">{{ tagName }}</span>
      </nav>
    </PageHeader>

    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      {{ t('archive.loading') }}
    </div>
    <EmptyState
      v-else-if="articles.length === 0"
      :message="t('tag.emptyArticles')"
      :description="t('tag.emptyArticlesDesc')"
      :action-text="t('notFound.backHome')"
      action-to="/home"
    />
    <div v-else class="articles-grid">
      <ArticleCard v-for="(article, i) in articles" :key="article.id" :article="article" v-reveal="i * 40" />
    </div>
    <Pagination :total="total" :page="currentPage" :page-size="pageSize" @update="handlePageUpdate" />
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";
import { articleApi, tagApi } from "~/api";
import type { Article, PaginatedResponse, Tag } from "~/types";

const { t } = useI18n();
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
  return (
    tags.value.find((item) => item.id === tagId.value)?.labelName ||
    t("tag.notFound")
  );
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

// 面包屑结构化数据（BreadcrumbList）
useBreadcrumbJsonLd([
  { name: t("nav.home"), url: "/home" },
  { name: t("nav.tag"), url: "/tag" },
  { name: tagName.value, url: `/tag/${tagId.value}` },
]);
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.tag-detail {
  margin: 0 auto;
}

/* 面包屑（在页头卡内）：靠右对齐、与标题同一行 */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
  flex-shrink: 0;
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

.loading {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-secondary);
}

.articles-grid {
  display: grid;
  /* auto-fill 保留空轨道：仅一篇时卡片不拉伸占满整个容器，自然留白 */
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: $spacing-5;
  margin-bottom: $spacing-5;
}
</style>
