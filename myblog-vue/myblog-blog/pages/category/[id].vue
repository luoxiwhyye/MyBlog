<template>
  <div class="category-detail">
    <!-- 面包屑：页面级导航，置于页头卡之上（卡内只留标题与文章数）。
         原先塞在页头卡右上角，与顶栏导航在同一屏构成两层重复导航。 -->
    <nav class="breadcrumb">
      <NuxtLink to="/home">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        {{ t('nav.home') }}
      </NuxtLink>
      <span class="breadcrumb-sep">/</span>
      <NuxtLink to="/category">{{ t('nav.category') }}</NuxtLink>
      <span class="breadcrumb-sep">/</span>
      <span class="breadcrumb-current">{{ categoryName }}</span>
    </nav>

    <PageHeader
      :title="categoryName"
      :description="t('common.articleCount', { count: total })"
    />

    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      {{ t('archive.loading') }}
    </div>
    <EmptyState
      v-else-if="articles.length === 0"
      :message="t('category.emptyArticles')"
      :description="t('category.emptyArticlesDesc')"
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
import { articleApi, categoryApi } from "~/api";
import type { Article, Category, PaginatedResponse } from "~/types";

const { t } = useI18n();
const route = useRoute();
const currentPage = ref(1);
const pageSize = ref(7);
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
  return (
    categories.value.find((item) => item.id === categoryId.value)?.typeName ||
    t("category.notFound")
  );
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

// 面包屑结构化数据（BreadcrumbList）
useBreadcrumbJsonLd([
  { name: t("nav.home"), url: "/home" },
  { name: t("nav.category"), url: "/category" },
  { name: categoryName.value, url: `/category/${categoryId.value}` },
]);
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.category-detail {
  margin: 0 auto;
}

/* 面包屑（页面级，在页头卡之上）：靠左对齐。
   自带 line-height 铉住行盒 —— 拉丁字体与中文字体的 ascent/descent 比例不同，
   不铉行盒时中英文的垂直位置会差几像素。 */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 0 0 $spacing-2;
  font-size: 14px;
  line-height: 20px;
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
  color: var(--color-accent-deep);
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

/* 窄屏：分类名过长时会把面包屑挤成多行 —— 按视口百分比限宽，保证单行 */
@media (max-width: 768px) {
  .breadcrumb-current {
    max-width: 38vw;
  }
}

.loading {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-secondary);
}

.articles-grid {
  display: grid;
  /* auto-fill 保留空轨道：仅一篇时卡片不拉伸占满整个容器，自然留白。
     ⚠️ 必须带 min(100%, …)：只写 minmax(350px, 1fr) 时，窄屏（≤360px）容器比 350px 还窄，
     卡片会溢出被 body 的 overflow-x: clip 裁掉右边一块（看不到滚动条，只看到内容被切）。 */
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 350px), 1fr));
  gap: $spacing-5;
  margin-bottom: $spacing-5;
}
</style>
