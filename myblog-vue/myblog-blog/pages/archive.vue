<template>
  <div class="archive">
    <PageHeader
      :title="t('archive.title')"
      :description="t('archive.desc')"
    />

    <!-- 搜索 / 按时间筛选 / 排序 工具栏 -->
    <div class="archive-toolbar">
      <el-input
        v-model="keyword"
        :placeholder="t('archive.searchPlaceholder')"
        clearable
        class="toolbar-search"
        @input="resetPage"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <el-select
        v-model="selectedYear"
        :placeholder="t('archive.filterYear')"
        clearable
        class="toolbar-select"
        @change="onYearChange"
      >
        <el-option
          v-for="year in availableYears"
          :key="year"
          :label="year"
          :value="year"
        />
      </el-select>

      <el-select
        v-model="selectedMonth"
        :placeholder="t('archive.filterMonth')"
        clearable
        class="toolbar-select toolbar-month"
        :disabled="!selectedYear"
        @change="resetMonth"
      >
        <el-option
          v-for="month in availableMonths"
          :key="month.value"
          :label="month.label"
          :value="month.value"
        />
      </el-select>

      <el-select
        v-model="sortBy"
        class="toolbar-select toolbar-sort"
        :aria-label="t('archive.sortBy')"
      >
        <el-option :label="t('archive.sortNewest')" value="newest" />
        <el-option :label="t('archive.sortViews')" value="views" />
        <el-option :label="t('archive.sortTitle')" value="title" />
      </el-select>
    </div>

    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      {{ t('archive.loading') }}
    </div>
    <EmptyState
      v-else-if="visibleArticles.length === 0"
      :message="t('archive.noArticles')"
      :description="t('archive.noArticlesDesc')"
      :action-text="t('notFound.backHome')"
      action-to="/home"
    />
    <div v-else class="archive-list">
      <!-- 年份汇总卡片 -->
      <div class="archive-summary">
        <div class="summary-item">
          <span class="summary-num">{{ visibleArticles.length }}</span>
          <span class="summary-label">{{ t('archive.summaryTotal') }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-num">{{ yearsCount }}</span>
          <span class="summary-label">{{ t('archive.summaryYears') }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-num">{{ totalViews }}</span>
          <span class="summary-label">{{ t('archive.summaryViews') }}</span>
        </div>
      </div>

      <!-- 时间线 -->
      <div v-for="(yearGroup, gi) in groupedArticles" :key="yearGroup.year" class="year-group" v-reveal="gi * 60">
        <h2 class="year-title">
          <span class="year-badge">{{ yearGroup.year }}</span>
          <span class="year-count">{{ t('archive.articleCount', { count: yearGroup.months.reduce((sum, m) => sum + m.articles.length, 0) }) }}</span>
        </h2>
        <div class="month-groups">
          <div v-for="monthGroup in yearGroup.months" :key="monthGroup.month" class="month-group">
            <!-- monthGroup.month 是补零的字符串（用于分组排序，如 "09"），展示时去掉前导零 -->
            <h3 class="month-title">{{ Number(monthGroup.month) }}{{ t('archive.month') }}</h3>
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
import { Loading, Search } from "@element-plus/icons-vue";
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

// ===== 搜索 / 按时间筛选 / 排序 状态 =====
// 站内搜索入口统一为 /archive?q=xxx（独立搜索页已移除），故此处支持从 URL 预填关键词。
// 注意：只做「URL → 关键词」单向同步，不回写 URL——归档页带 isr 缓存，
// 若把用户每次输入都写进 query 会产生大量缓存键。
const route = useRoute();
const keyword = ref(typeof route.query.q === "string" ? route.query.q : "");

// 其它入口（如 404 页搜索框）跳到 /archive?q= 时同步关键词
watch(
  () => route.query.q,
  (value) => {
    keyword.value = typeof value === "string" ? value : "";
  },
);

const selectedYear = ref<string | number | null>(null);
const selectedMonth = ref<string | number | null>(null);
const sortBy = ref<"newest" | "views" | "title">("newest");

// 全部可选年份（基于全量数据，不随筛选变化），降序
const availableYears = computed(() =>
  [...new Set(articles.value.map((a) => new Date(a.createdAt).getFullYear()))].sort(
    (a, b) => b - a,
  ),
);

// 基于所选年份的可用月份（1-12），降序；未选年份时返回空
const availableMonths = computed(() => {
  if (!selectedYear.value) return [];
  const year = Number(selectedYear.value);
  const months = new Set(
    articles.value
      .filter((a) => new Date(a.createdAt).getFullYear() === year)
      .map((a) => new Date(a.createdAt).getMonth() + 1),
  );
  return [...months].sort((a, b) => b - a).map((m) => ({ value: m, label: `${m}${t('archive.month')}` }));
});

// 切换年份时，清空月份筛选
const onYearChange = () => {
  selectedMonth.value = null;
};

const resetMonth = () => {
  /* 月份筛选为实时响应式（computed），无需额外处理 */
};

// 过滤 + 排序后的可见文章：搜索（标题/摘要命中）、年份筛选、月份筛选、排序
const visibleArticles = computed(() => {
  let list = articles.value;

  const kw = keyword.value.trim().toLowerCase();
  if (kw) {
    list = list.filter(
      (a) =>
        (a.title || "").toLowerCase().includes(kw) ||
        (a.summary || "").toLowerCase().includes(kw),
    );
  }

  const sy = selectedYear.value;
  if (sy !== null && sy !== undefined && sy !== "") {
    list = list.filter((a) => new Date(a.createdAt).getFullYear() === Number(sy));
  }

  const sm = selectedMonth.value;
  if (sm !== null && sm !== undefined && sm !== "") {
    list = list.filter((a) => new Date(a.createdAt).getMonth() + 1 === Number(sm));
  }

  const sorted = [...list];
  switch (sortBy.value) {
    case "views":
      sorted.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
      break;
    case "title":
      sorted.sort((a, b) => a.title.localeCompare(b.title));
      break;
    default:
      sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }
  return sorted;
});

const yearsCount = computed(() => groupedArticles.value.length);

const totalViews = computed(() =>
  visibleArticles.value.reduce((sum, article) => sum + (article.viewCount || 0), 0),
);

const groupedArticles = computed(() => {
  const groups: Record<string, Record<string, Article[]>> = {};

  visibleArticles.value.forEach((article) => {
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

// 筛选为实时响应式（computed），无需额外重置分页
const resetPage = () => {
  /* 空操作保留：交互即时反馈 */
};

usePageSeo({
  title: t('archive.title'),
  description: t('archive.desc'),
});

// 归档页 JSON-LD（Blog，含文章列表）
useArchiveJsonLd(articles);
</script>

<style lang="scss" scoped>
@use "../assets/css/abstracts/variables" as *;

.archive {
  max-width: 800px;
  margin: 0 auto;
}

.loading {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-secondary);
}

/* 汇总卡片 */
.archive-summary {
  display: grid;
  /* 容器查询：随宽度平滑增减列（每列 ≥180px 或容器全宽），移动端不强制单列 */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
  gap: $spacing-5;
  margin-bottom: $spacing-8;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(4px, 1.2vw, 6px);
  padding: clamp($spacing-5, 2.5vw, 20px);
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  transition:
    box-shadow var(--transition-bounce),
    border-color 0.3s,
    transform var(--transition-bounce);
}

/* hover 对齐 category / friends 的卡片配方：抬升 + 品牌描边 + 双层阴影 */
.summary-item:hover {
  box-shadow: var(--shadow-elevated), var(--shadow-glow);
  border-color: var(--color-category);
  transform: translateY(-2px);
}

.summary-num {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-accent);
  font-variant-numeric: tabular-nums;
}

.summary-label {
  font-size: clamp(12px, 3vw, 13px);
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
  /* 原为 var(--shadow-md), var(--shadow-glow)，而 --shadow-md 全站未定义（只有同名 Sass 变量）：
     CSS 变量替换后值非法会让**整条声明**归 none，连 --shadow-glow 也一起丢掉，
     徽标因此完全没有阴影。改用已定义且同为静态档的 --shadow-card。 */
  box-shadow: var(--shadow-card), var(--shadow-glow);
}

.year-count {
  font-size: 14px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* ===== 时间轴 =====
   竖线与圆点都挂在 .month-group 上（同一定位上下文），这样两者能用同一个 $tl-x
   表达中心 X，圆心必然落在线上。
   原先圆点挂在 .month-title 上，而 .month-title 位于 .month-group 的 22.5px 左内边距之
   内，需要跨元素换算 —— 实测圆心比线心偏左 6.5px，且竖线从圆点下方 6px 才开始，
   每个圆点都跟时间轴断开了。 */
$tl-x: 8px; // 竖线 / 圆点共用的中心 X（相对 .month-group 左边缘）
$tl-line-w: 2px;
$tl-line-left: $tl-x - 1px;
$tl-dot: 8px;
$tl-dot-left: $tl-x - 4px;
$tl-dot-top: 6px; // 圆点中心 = 6 + 4 = 10px，与月份标题（高 20px）中线重合
$tl-dot-center: 10px;

.month-group {
  margin-bottom: $spacing-5;
  position: relative;
  padding-left: $spacing-6;
}

/* 竖线：从本组圆点中心向下贯通到下组圆点中心（跨越组间距）；末组止于自身底部，
   避免在线尾多出一小截悬空的线。 */
.month-group::before {
  content: "";
  position: absolute;
  left: $tl-line-left;
  top: $tl-dot-center;
  bottom: calc(-1 * (#{$spacing-5} + #{$tl-dot-center}));
  width: $tl-line-w;
  border-radius: $tl-line-w;
  background: linear-gradient(180deg, var(--color-category), transparent);
}

.month-group:last-child::before {
  bottom: 0;
}

/* 圆点：与竖线共用 $tl-x，圆心恰好落在线上 */
.month-group::after {
  content: "";
  position: absolute;
  left: $tl-dot-left;
  top: $tl-dot-top;
  width: $tl-dot;
  height: $tl-dot;
  border-radius: 50%;
  background: var(--color-category);
  box-shadow: 0 0 0 3px var(--color-category-soft);
}

.month-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
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
  /* --bg-hover 在亮 / 暗主题都已定义，原先的 rgba(245,245,245,0.6) 兜底永远不会生效，
     却是个硬编码的亮色值（暗色下若真回退会明显不对）→ 去掉。 */
  background: var(--bg-hover);
  border: 1px solid var(--glass-border);
  transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.article-item:hover {
  background: var(--bg-card);
  border-color: var(--color-category-soft);
  box-shadow: var(--shadow-card);
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

/* 键盘可达性：与 friends 的卡片一致，补焦点描边 */
.article-link:focus-visible {
  outline: 2px solid var(--color-category);
  outline-offset: 2px;
  border-radius: $border-radius-base;
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

/* 搜索 / 按时间筛选 / 排序 工具栏 */
.archive-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: $spacing-6;
  padding: $spacing-4;
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

.toolbar-search {
  flex: 1;
  min-width: 0;
}

.toolbar-select {
  width: 150px;
  flex-shrink: 0;
}

.toolbar-month {
  width: 130px;
  flex-shrink: 0;
}

.toolbar-sort {
  width: 160px;
  flex-shrink: 0;
}

/* 时间线整体背景：与博客背景图片隔离，提升阅读体验 */
.archive-list {
  padding: $spacing-6;
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

@media (max-width: 576px) {
  .archive-toolbar {
    flex-direction: column;
  }

  .toolbar-search,
  .toolbar-select,
  .toolbar-month,
  .toolbar-sort {
    width: 100%;
  }

  .archive-list {
    padding: $spacing-4;
  }
}
</style>
