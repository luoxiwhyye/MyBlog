<template>
  <div class="home-page">
    <div class="home-body">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        {{ t('article.loading') }}
      </div>
      <EmptyState
        v-else-if="articles.length === 0"
        :message="t('archive.noArticles')"
        :description="t('archive.noArticlesDesc')"
        action-text="返回首页"
        action-to="/home"
      />
      <div v-else class="bento-grid">
        <template v-for="(article, i) in articles" :key="article.id">
          <div class="bento-item" :class="{ 'bento-item--first': i === 0 }">
            <!-- 第一篇文章视为最新，在卡片内标注 -->
            <ArticleCard :article="article" :badge="i === 0 ? t('home.hero.latestBadge') : ''" />
          </div>
          <!-- 热门文章与第一篇文章并排同一行，撑满等高 -->
          <div v-if="i === 0" class="bento-card bento-hot">
            <section class="widget">
              <h3>{{ t('home.hero.hot') }}</h3>
              <ol class="hot-list">
                <li v-for="(item, idx) in hotArticles" :key="item.id">
                  <NuxtLink :to="`/article/${item.id}`" class="hot-item">
                    <span class="hot-rank" :class="{ 'top3': idx < 3 }">{{ idx + 1 }}</span>
                    <div class="hot-info">
                      <span class="hot-title">{{ item.title }}</span>
                      <span class="hot-meta">{{ item.viewCount }} {{ t('home.reads') }} · {{ item.type.typeName }}</span>
                    </div>
                  </NuxtLink>
                </li>
              </ol>
            </section>
          </div>
        </template>
      </div>

      <div class="pagination-wrap">
        <Pagination
          :total="total"
          :page="currentPage"
          :page-size="pageSize"
          @update="handlePageUpdate"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";
import { articleApi } from "~/api";
import type { Article, PaginatedResponse } from "~/types";

const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();
const { t } = useI18n();

await Promise.all([settingsStore.ensureSettings(), bloggerStore.ensureProfile()]);

const currentPage = ref(1);
const pageSize = ref(4);

const emptyArticlePage = (): PaginatedResponse<Article> => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: 4,
});

const { data: articlePage, pending } = await useAsyncData(
  () => `home-articles-${currentPage.value}-${pageSize.value}`,
  () =>
    articleApi
      .getList({ page: currentPage.value, pageSize: pageSize.value, status: "published" })
      .then((response) => response.data),
  { watch: [currentPage, pageSize], default: emptyArticlePage },
);

// 热门文章：按浏览量单独拉取，最多取 12 篇（与当前页文章解耦）
const { data: hotData } = await useAsyncData(
  "home-hot-articles",
  () =>
    articleApi
      .getList({ page: 1, pageSize: 12, status: "published", sortBy: "view_count" })
      .then((response) => response.data),
  { default: () => emptyArticlePage() },
);

const loading = computed(() => pending.value);
const articles = computed(() => articlePage.value.list);
const total = computed(() => articlePage.value.total);

// 视口宽度：控制热门文章显示篇数及单/双列（SSR 默认按宽屏渲染，防水合不一致）
const viewportWidth = ref(1440);
onMounted(() => {
  viewportWidth.value = window.innerWidth;
  const onResize = () => (viewportWidth.value = window.innerWidth);
  window.addEventListener("resize", onResize);
  onBeforeUnmount(() => window.removeEventListener("resize", onResize));
});

// 宽度 >1280 显示 12 篇两列；否则 6 篇单列
const isWideLayout = computed(() => viewportWidth.value > 1280);
const hotArticles = computed(() =>
  hotData.value.list.slice(0, isWideLayout.value ? 12 : 6),
);

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page;
  pageSize.value = size;
};

const siteName = computed(() => settingsStore.getSetting("site_name") || "MyBlog");
const siteDescription = computed(
  () => settingsStore.getSetting("site_description") || "一个个人博客",
);

usePageSeo({
  title: computed(() => siteName.value),
  description: siteDescription,
});
useWebsiteJsonLd();
</script>

<style lang="scss" scoped>
@use "../assets/css/abstracts/variables" as *;

.home-page {
  padding-top: $spacing-2;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.home-body {
  max-width: 1400px;
  margin: 0 auto;
  /* 分页栏不再预留底部间距（用户要求删除下边距） */
  padding-bottom: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.loading {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card-lg);
}

/* ===== 卡片网格 ===== */
/* 以 6 列作为弹性底模，用 span 控制每行数量：
   - >1280：文章卡 span2（每行3张），热门卡 span4 与首篇文章并排
   - 641~1280：文章卡 span3（每行2张），热门卡 span3 与首篇并排
   - ≤640：全部 span6（每行1张） */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-auto-flow: dense;
  gap: $spacing-5;
  align-items: stretch;
  /* 占据剩余空间，把分页栏推到底部 */
  flex: 1;
}

.bento-item,
.bento-card {
  min-width: 0;
}

/* 普通文章卡：每行3张 */
.bento-item { grid-column: span 2; }
/* 首篇文章：与热门卡并排同一行 */
.bento-item--first { grid-column: span 2; }
/* 热门卡：占剩余4列，与首篇文章等高撑满 */
.bento-hot { grid-column: span 4; }

@media (max-width: 1280px) {
  /* 每行2张文章卡 */
  .bento-item,
  .bento-item--first { grid-column: span 3; }
  /* 热门卡占半行，与首篇并排；内部改为单列 */
  .bento-hot { grid-column: span 3; }
}

@media (max-width: 640px) {
  /* 每行1张 */
  .bento-item,
  .bento-item--first,
  .bento-hot { grid-column: span 6; }
}

/* ===== 特色卡（热门文章 widget） ===== */
.widget {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  padding: $spacing-5;
  transition:
    box-shadow var(--transition-bounce),
    border-color 0.3s,
    transform var(--transition-bounce);
}

.widget:hover {
  box-shadow: var(--shadow-glow);
  border-color: transparent;
  transform: translateY(-1px);
}

.widget h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: $spacing-4;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: 0.3px;
}

.widget h3::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 18px;
  border-radius: 2px;
  background: var(--gradient-brand, linear-gradient(180deg, var(--color-category), var(--color-accent)));
  flex-shrink: 0;
}

/* 热门列表：宽度足够时两列（12篇），否则单列（6篇）。
   行高固定、顶部对齐，下方留白即可（不拉伸填满）。 */
.hot-list {
  list-style: none;
  counter-reset: hot-rank;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: auto;
  column-gap: 12px;
  row-gap: 6px;
  align-content: start;
  flex: 1;
}

@media (max-width: 1280px) {
  .hot-list { grid-template-columns: 1fr; }
}

.hot-list li {
  display: flex;
  align-items: stretch;
}

/* 每个选项固定高度，不随卡片高度拉伸 */
.hot-item {
  height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.2s;
  overflow: hidden;
}

.hot-item:hover {
  background: var(--bg-hover);
}

.hot-rank {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--hot-rank-gradient, linear-gradient(135deg, var(--color-category), var(--color-accent)));
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

/* 前三名加深一档，更醒目 */
.hot-rank.top3 {
  color: #fff;
  background: var(--hot-rank-gradient, linear-gradient(135deg, var(--color-category), var(--color-accent)));
  box-shadow: var(--shadow-glow);
}

.hot-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 1.2;
}

.hot-title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.hot-item:hover .hot-title {
  color: var(--color-accent);
}

.hot-meta {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-wrap {
  margin-top: $spacing-6;
  /* 与上方组件保持间距，且推到底部，避免重叠 */
  padding-top: 4px;
  flex-shrink: 0;
}
</style>
