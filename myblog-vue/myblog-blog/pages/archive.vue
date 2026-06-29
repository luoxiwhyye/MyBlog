<template>
  <div class="archive">
    <h1>{{ t('archive.title') }}</h1>
    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      {{ t('archive.loading') }}
    </div>
    <div v-else-if="articles.length === 0" class="no-articles">{{ t('archive.noArticles') }}</div>
    <div v-else class="archive-list">
      <div v-for="yearGroup in groupedArticles" :key="yearGroup.year" class="year-group">
        <h2>{{ yearGroup.year }}{{ t('archive.year') }}</h2>
        <div class="month-groups">
          <div v-for="monthGroup in yearGroup.months" :key="monthGroup.month" class="month-group">
            <h3>{{ monthGroup.month }}{{ t('archive.month') }}</h3>
            <ul class="article-list">
              <li v-for="article in monthGroup.articles" :key="article.id" class="article-item">
                <NuxtLink :to="`/article/${article.id}`">{{ article.title }}</NuxtLink>
                <span class="date">{{ formatDate(article.createdAt) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";
import { articleApi } from "~/api";
import type { Article } from "~/types";
import { formatDate } from "~/utils/format";

const { t } = useI18n();

const { data: articlePage, pending } = await useAsyncData(
  "archive-articles",
  () =>
    articleApi
      .getList({
        page: 1,
        pageSize: 1000,
        status: "published",
      })
      .then((response) => response.data),
  {
    default: () => ({
      list: [],
      total: 0,
      page: 1,
      pageSize: 1000,
    }),
  },
);

const articles = computed(() => articlePage.value.list);

const groupedArticles = computed(() => {
  const groups: Record<string, Record<string, Article[]>> = {};

  articles.value.forEach((article) => {
    const date = new Date(article.createdAt);
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");

    groups[year] ||= {};
    groups[year][month] ||= [];
    groups[year][month].push(article);
  });

  return Object.keys(groups)
    .sort((a, b) => Number(b) - Number(a))
    .map((year) => ({
      year,
      months: Object.keys(groups[year] || {})
        .sort((a, b) => Number(b) - Number(a))
        .map((month) => ({
          month,
          articles: groups[year]?.[month] || [],
        })),
    }));
});

usePageSeo({
  title: t('archive.title'),
  description: "按时间维度浏览博客文章归档。",
});
</script>

<style lang="scss" scoped>
.archive {
  max-width: 800px;
  margin: 0 auto;
}

.archive h1 {
  text-align: center;
  font-size: 32px;
  margin-bottom: 40px;
  margin-top: 8px;
  color: var(--text-primary);
  text-shadow: var(--text-shadow-on-bg);
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

.year-group {
  margin-bottom: 40px;
}

.year-group h2 {
  font-size: 24px;
  color: var(--text-primary);
  margin-bottom: 20px;
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 10px;
}

.month-group {
  margin-bottom: 20px;
}

.month-group h3 {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.article-list {
  list-style: none;
  padding: 0;
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.article-item a {
  text-decoration: none;
  color: var(--text-primary);
  flex: 1;
}

.article-item a:hover {
  color: var(--color-link);
}

.date {
  color: var(--text-muted);
  font-size: 14px;
  margin-left: 10px;
}
</style>
