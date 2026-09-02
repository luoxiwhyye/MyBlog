<template>
  <div class="archive">
    <h1>{{ t('archive.title') }}</h1>
    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      {{ t('archive.loading') }}
    </div>
    <EmptyState
      v-else-if="articles.length === 0"
      :message="t('archive.noArticles')"
      :description="t('archive.noArticlesDesc')"
      action-text="返回首页"
      action-to="/home"
    />
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

// 归档需展示全部文章，但后端分页接口 pageSize 上限为 100，故循环分页拉取
const PAGE_SIZE = 100;

const fetchAllArticles = async () => {
  const list: Article[] = [];
  let page = 1;
  let total = 0;

  do {
    const response = await articleApi.getList({
      page,
      pageSize: PAGE_SIZE,
      status: "published",
    });
    if (response.code !== 200 && response.code !== 201) break;
    list.push(...(response.data.list || []));
    total = response.data.total || 0;
    page += 1;
  } while (list.length < total && list.length < 2000);

  return list;
};

const { data: articles, pending } = await useAsyncData(
  "archive-articles",
  fetchAllArticles,
  { default: () => [] },
);

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
@use "../assets/css/abstracts/variables" as *;

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
  padding: $spacing-8;
  color: var(--text-secondary);
}

/* 汇总卡片 */
.archive-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $spacing-4;
  margin-bottom: $spacing-8;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 12px;
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  transition: box-shadow var(--transition-bounce), border-color 0.3s;
}

.summary-item:hover {
  box-shadow: var(--shadow-glow);
  border-color: transparent;
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
  margin-bottom: $spacing-8;
  position: relative;
}

.year-title {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  margin-bottom: $spacing-5;
}

.year-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 18px;
  border-radius: 999px;
  font-size: 17px;
  font-weight: 700;
  color: var(--gradient-brand-text, #fff);
  background: var(--gradient-brand, var(--color-category));
  box-shadow: var(--shadow-md), var(--shadow-glow);
}

.year-count {
  font-size: 14px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* 月份分组 */
.month-group {
  margin-bottom: $spacing-5;
  position: relative;
  padding-left: $spacing-6;
  transition: transform 0.3s;
}

/* 时间轴"曲线/错位"感：相邻月份轻微左右错落 */
.month-group:nth-child(odd) {
  transform: translateX(8px);
}

.month-group:nth-child(even) {
  transform: translateX(-4px);
}

.month-group::before {
  content: "";
  position: absolute;
  left: 7px;
  top: 24px;
  bottom: -8px;
  width: 2px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--color-category), transparent);
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
  background: var(--color-category);
  box-shadow: 0 0 0 3px var(--color-category-soft);
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
  background: var(--color-category-soft);
  transition: background-color 0.2s, transform 0.2s;
}

.article-link:hover .dot {
  background: var(--color-category);
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
