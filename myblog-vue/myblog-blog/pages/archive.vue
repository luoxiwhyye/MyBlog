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
      <!-- 年份汇总卡片 -->
      <div class="archive-summary">
        <div class="summary-item">
          <span class="summary-num">{{ articles.length }}</span>
          <span class="summary-label">文章总数</span>
        </div>
        <div class="summary-item">
          <span class="summary-num">{{ yearsCount }}</span>
          <span class="summary-label">年份跨度</span>
        </div>
        <div class="summary-item">
          <span class="summary-num">{{ totalViews }}</span>
          <span class="summary-label">累计阅读</span>
        </div>
      </div>

      <!-- 时间线 -->
      <div v-for="yearGroup in groupedArticles" :key="yearGroup.year" class="year-group">
        <h2 class="year-title">
          <span class="year-badge">{{ yearGroup.year }}</span>
          <span class="year-count">{{ yearGroup.months.reduce((sum, m) => sum + m.articles.length, 0) }} 篇</span>
        </h2>
        <div class="month-groups">
          <div v-for="monthGroup in yearGroup.months" :key="monthGroup.month" class="month-group">
            <h3 class="month-title">{{ monthGroup.month }}月</h3>
            <ul class="article-list">
              <li v-for="article in monthGroup.articles" :key="article.id" class="article-item">
                <NuxtLink :to="`/article/${article.id}`" class="article-link">
                  <span class="dot" aria-hidden="true"></span>
                  <span class="article-title">{{ article.title }}</span>
                </NuxtLink>
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

const yearsCount = computed(() => groupedArticles.value.length);

const totalViews = computed(() =>
  articles.value.reduce((sum, article) => sum + (article.viewCount || 0), 0),
);

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
  margin-bottom: 24px;
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

/* 汇总卡片 */
.archive-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 40px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 12px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.summary-num {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-accent);
  font-variant-numeric: tabular-nums;
}

.summary-label {
  font-size: 13px;
  color: var(--text-muted);
}

/* 年份分组 */
.year-group {
  margin-bottom: 40px;
  position: relative;
}

.year-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.year-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 18px;
  border-radius: 999px;
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, var(--color-accent), rgba(71, 85, 105, 0.65));
  box-shadow: var(--shadow-md);
}

.year-count {
  font-size: 14px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* 月份分组 */
.month-group {
  margin-bottom: 20px;
  position: relative;
  padding-left: 28px;
}

.month-group::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 24px;
  bottom: -8px;
  width: 2px;
  background: linear-gradient(180deg, var(--border-color), transparent);
}

.month-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  position: relative;
}

.month-title::before {
  content: "";
  position: absolute;
  left: -25px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-light);
}

.article-list {
  list-style: none;
  padding: 0;
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.article-item:hover {
  background: var(--bg-card);
}

.article-link {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  text-decoration: none;
  color: var(--text-primary);
}

.article-link:hover .article-title {
  color: var(--color-accent);
}

.dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border-color);
  transition: background-color 0.2s, transform 0.2s;
}

.article-link:hover .dot {
  background: var(--color-accent);
  transform: scale(1.4);
}

.article-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  transition: color 0.2s;
}

.date {
  color: var(--text-muted);
  font-size: 13px;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 576px) {
  .archive-summary {
    grid-template-columns: 1fr;
  }
}
</style>
