<template>
  <div class="search">
    <div class="page-header">
      <el-button class="home-btn" plain @click="goHome">{{ t('search.backHome') }}</el-button>
      <h1>{{ t('search.title') }}</h1>
    </div>
    <div class="search-input">
      <el-input
        v-model="query"
        :placeholder="t('search.placeholder')"
        size="large"
        clearable
        @keyup.enter="handleSearch"
      >
        <template #suffix>
          <el-button :icon="Search" size="large" @click="handleSearch" />
        </template>
      </el-input>
    </div>

    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      {{ t('search.searching') }}
    </div>
    <div v-else-if="articles.length === 0 && query" class="no-results">{{ t('search.noResults') }}</div>
    <div v-else-if="articles.length > 0" class="results">
      <div class="results-header">
        <p class="results-count">{{ t('search.foundResults', { total }) }}</p>
        <el-select v-model="sortBy" class="sort-select" placeholder="排序方式">
          <el-option :label="t('search.sortRelevance')" value="relevance" />
          <el-option :label="t('search.sortDate')" value="date" />
        </el-select>
      </div>

      <div class="results-list">
        <article v-for="article in sortedArticles" :key="article.id" class="result-item">
          <h3>
            <NuxtLink :to="`/article/${article.id}`" v-html="highlightText(article.title)"></NuxtLink>
          </h3>
          <p class="summary" v-html="highlightText(article.summary || '')"></p>
          <div class="meta">
            <span>{{ formatDate(article.createdAt) }}</span>
            <span>{{ article.type.typeName }}</span>
            <span>{{ article.viewCount }} 阅读</span>
            <span>预计阅读 {{ estimateReadTime(article.content || article.summary || "") }}</span>
          </div>
        </article>
      </div>

      <Pagination :total="total" :page="currentPage" :page-size="pageSize" @update="handlePageUpdate" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading, Search } from "@element-plus/icons-vue";
import { articleApi } from "~/api";
import type { Article, PaginatedResponse } from "~/types";
import { estimateReadTime, formatDate } from "~/utils/format";

const route = useRoute();
const router = useRouter();

const { t } = useI18n();

const query = ref(typeof route.query.q === "string" ? route.query.q : "");
const currentPage = ref(1);
const pageSize = ref(10);
const sortBy = ref<"relevance" | "date">("relevance");

const emptyArticlePage = (): PaginatedResponse<Article> => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
});

const { data: articlePage, pending } = await useAsyncData(
  () => `search-${query.value}-${currentPage.value}-${pageSize.value}`,
  async () => {
    const keyword = query.value.trim();
    if (!keyword) {
      return emptyArticlePage();
    }

    const response = await articleApi.getList({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword,
      status: "published",
    });

    return response.data;
  },
  {
    watch: [query, currentPage, pageSize],
    default: emptyArticlePage,
  },
);

const articles = computed(() => articlePage.value.list);
const total = computed(() => articlePage.value.total);

const countRelevance = (article: Article, keyword: string) => {
  const lowerKeyword = keyword.toLowerCase();
  const text = `${article.title} ${article.summary || ""} ${article.content || ""}`.toLowerCase();
  const matches = text.match(
    new RegExp(lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
  );
  return matches?.length || 0;
};

const sortedArticles = computed(() => {
  const list = [...articles.value];
  if (sortBy.value === "date") {
    return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  const keyword = query.value.trim();
  if (!keyword) {
    return list;
  }

  return list.sort((a, b) => countRelevance(b, keyword) - countRelevance(a, keyword));
});

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightText = (text: string) => {
  const keyword = query.value.trim();
  if (!keyword) {
    return text;
  }

  return text.replace(new RegExp(`(${escapeRegExp(keyword)})`, "gi"), "<mark>$1</mark>");
};

const handleSearch = () => {
  const keyword = query.value.trim();
  if (keyword) {
    currentPage.value = 1;
    router.replace({ path: "/search", query: { q: keyword } });
  }
};

const goHome = () => {
  router.push("/home");
};

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page;
  pageSize.value = size;
};

watch(
  () => route.query.q,
  (newQuery) => {
    query.value = typeof newQuery === "string" ? newQuery : "";
    currentPage.value = 1;
  },
);

usePageSeo({
  title: computed(() => (query.value ? `搜索：${query.value}` : "搜索")),
  description: computed(() =>
    query.value ? `搜索与“${query.value}”相关的博客文章。` : "搜索博客中的文章内容。",
  ),
});
</script>

<style lang="scss" scoped>
@use "../assets/css/abstracts/variables" as *;

.search {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  position: relative;
  min-height: $spacing-10;
  margin-bottom: $spacing-8;
}

.search h1 {
  text-align: center;
  font-size: 32px;
  margin: 0;
  color: var(--text-primary);
  text-shadow: var(--text-shadow-on-bg);
}

.home-btn {
  position: absolute;
  left: 0;
  top: 0;
}

.search-input {
  max-width: 600px;
  margin: 0 auto $spacing-8;
}

.loading {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-secondary);
}

.no-results {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-muted);
}

.results-count {
  color: var(--text-secondary);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sort-select {
  width: 160px;
}

.results-list {
  display: grid;
  gap: 14px;
  margin-bottom: 20px;
}

.result-item {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  padding: 16px;
  transition:
    box-shadow var(--transition-bounce),
    border-color 0.3s,
    transform var(--transition-bounce);
}

.result-item:hover {
  box-shadow: var(--shadow-elevated), var(--shadow-glow);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.result-item h3 {
  margin-bottom: 8px;
}

.result-item h3 a {
  color: var(--text-primary);
  text-decoration: none;
}

.summary {
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-muted);
}

.meta span {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  line-height: 22px;
}

:deep(mark) {
  background: var(--color-fav-soft);
  padding: 0 2px;
  border-radius: 2px;
}

@media (max-width: 768px) {
  .page-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .home-btn {
    position: static;
    align-self: flex-start;
  }

  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
