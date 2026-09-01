<template>
  <div class="home-page">
    <div class="home-body">
      <!-- 公告栏：极简毛玻璃横向卡片 -->
      <section class="announce-card">
        <span class="announce-label">{{ t('home.announcement') }}</span>
        <p class="announce-text">{{ announcement || t('home.announcementEmpty') }}</p>
      </section>

      <!-- 博主信息卡：头像 + 简介 + 社交链接 + 关于入口 -->
      <section class="profile-card">
        <div class="profile-avatar">
          <img v-if="profileAvatar" :src="profileAvatar" :alt="authorName" />
          <span v-else class="avatar-fallback">{{ (authorName || 'B').slice(0, 1) }}</span>
        </div>
        <div class="profile-info">
          <h2 class="profile-name">{{ authorName }}</h2>
          <p class="profile-bio">{{ bio || t('home.profileEmpty') }}</p>
          <div v-if="socialLinks.length" class="profile-links">
            <a
              v-for="link in socialLinks"
              :key="link.url"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="profile-link"
            >{{ link.name }}</a>
          </div>
        </div>
        <NuxtLink to="/about" class="profile-more">{{ t('home.viewProfile') }}</NuxtLink>
      </section>

      <!-- 文章列表：规律等宽网格，数据少时允许自然留白 -->
      <div v-if="loading" class="loading-skeleton" aria-label="加载中">
        <div class="article-grid">
          <div v-for="n in 3" :key="n" class="skeleton-card">
            <el-skeleton animated>
              <template #template>
                <div class="skeleton-cover"></div>
                <div class="skeleton-line">
                  <el-skeleton-item variant="h3" style="width: 60%" />
                  <el-skeleton-item variant="text" style="width: 90%" />
                  <el-skeleton-item variant="text" style="width: 75%" />
                </div>
              </template>
            </el-skeleton>
          </div>
        </div>
      </div>
      <EmptyState
        v-else-if="articles.length === 0"
        :message="t('archive.noArticles')"
        :description="t('archive.noArticlesDesc')"
        action-text="返回首页"
        action-to="/home"
      />
      <template v-else>
        <div class="article-list-header">
          <h2 class="section-title">{{ t('home.articlesTitle') }}</h2>
          <div class="filter-chips">
            <button
              type="button"
              class="chip"
              :class="{ active: activeTypeId === '' }"
              @click="handleTypeFilter('')"
            >
              {{ t('home.filterAll') }}
              <span class="chip-count">{{ total }}</span>
            </button>
            <button
              v-for="cat in filterChips"
              :key="cat.id"
              type="button"
              class="chip"
              :class="{ active: activeTypeId === cat.id }"
              @click="handleTypeFilter(cat.id)"
            >
              {{ cat.typeName }}
              <span class="chip-count">{{ cat.articleCount }}</span>
            </button>
          </div>
        </div>
        <div class="article-grid">
          <ArticleCard
            v-for="(article, i) in articles"
            :key="article.id"
            :article="article"
            :variant="i === 0 && currentPage === 1 && activeTypeId === '' ? 'hero' : 'grid'"
            :badge="i === 0 && currentPage === 1 ? t('home.hero.latestBadge') : ''"
          />
        </div>
      </template>

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
import { articleApi, categoryApi } from "~/api";
import { getThumbWebpUrl, normalizeAssetUrl } from "~/utils/image";
import type { Article, Category, PaginatedResponse } from "~/types";

const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();
const { t } = useI18n();

await Promise.all([settingsStore.ensureSettings(), bloggerStore.ensureProfile()]);

const currentPage = ref(1);
const pageSize = ref(6);

// 类目筛选 Chip（文章区顶部 "行动号召"）
const activeTypeId = ref<number | "">("");
const filterChips = ref<Category[]>([]);
try {
  const typeRes = await categoryApi.getList({ page: 1, pageSize: 100 });
  filterChips.value = typeRes.data.list || [];
} catch {
  // 分类拉取失败不阻塞列表展示
  filterChips.value = [];
}

const emptyArticlePage = (): PaginatedResponse<Article> => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: 6,
});

const { data: articlePage, pending } = await useAsyncData(
  () => `home-articles-${currentPage.value}-${pageSize.value}-${activeTypeId.value}`,
  () =>
    articleApi
      .getList({
        page: currentPage.value,
        pageSize: pageSize.value,
        status: "published",
        typeId: activeTypeId.value === "" ? undefined : activeTypeId.value,
      })
      .then((response) => response.data),
  { watch: [currentPage, pageSize, activeTypeId], default: emptyArticlePage },
);

const loading = computed(() => pending.value);
const articles = computed(() => articlePage.value.list);
const total = computed(() => articlePage.value.total);

/* ===== 公告 / 博主信息（动态配置，无硬编码假数据） =====
   - 公告：settings 中的 `announcement` 配置项（可空）
   - 社交链接：settings 中的 `social_links`（JSON 数组 [{name,url}]，可空） */
const announcement = computed(() => settingsStore.getSetting("announcement"));

const socialLinks = computed<Array<{ name: string; url: string }>>(() => {
  const raw = settingsStore.getSetting("social_links");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((i) => i?.name && i?.url);
    }
  } catch {
    // 解析失败视为空
  }
  return [];
});

const authorName = computed(() => bloggerStore.nickname());
const bio = computed(() => bloggerStore.bio());
const profileAvatar = computed(() => {
  const raw = normalizeAssetUrl(
    bloggerStore.avatar() || settingsStore.getSetting("site_logo") || "",
  );
  return raw ? getThumbWebpUrl(raw) : "";
});

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page;
  pageSize.value = size;
};

const handleTypeFilter = (id: number | "") => {
  activeTypeId.value = id;
  currentPage.value = 1;
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
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $spacing-6;
  /* 分页与内容保持自然间距，不再强制撑满屏幕 */
  padding-bottom: $spacing-6;
}

/* 骨架屏加载态：复用文章网格，保持页面结构感 */
.loading-skeleton .skeleton-card {
  padding: $spacing-5;
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

.skeleton-cover {
  height: 0;
  padding-bottom: 62.5%; /* 16/10 封面比例 */
  border-radius: $border-radius-sm;
  background: var(--bg-code);
  margin-bottom: $spacing-4;
}

.skeleton-line {
  display: flex;
  flex-direction: column;
  gap: $spacing-3;
}

.section-title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}

/* ===== 文章区头部：标题 + 类目筛选 Chip ===== */
.article-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: $spacing-3;
}

.article-list-header .section-title {
  margin: 0;
}

/* 筛选项在空间充足时换行到第二行，与标题形成 "双行头部" */
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-2;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: $border-radius-full;
  font-size: $font-size-sm;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  cursor: pointer;
  transition:
    color $transition-fast,
    background-color $transition-fast,
    border-color $transition-fast,
    box-shadow var(--transition-bounce);
}

.chip:hover {
  color: var(--color-category);
  border-color: var(--color-category);
}

.chip.active {
  color: var(--gradient-brand-text, #fff);
  background: var(--gradient-brand, var(--color-category));
  border-color: transparent;
  box-shadow: var(--shadow-glow);
}

/* 分类数量徽标：小圆角胶囊，弱化视觉干扰 */
.chip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: $border-radius-full;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  background: var(--bg-hover);
  transition: color $transition-fast, background-color $transition-fast;
}

.chip:hover .chip-count {
  color: var(--color-category);
  background: var(--color-category-soft);
}

.chip.active .chip-count {
  color: var(--gradient-brand-text, #fff);
  background: rgba(255, 255, 255, 0.25);
}

@media (max-width: 768px) {
  .filter-chips {
    width: 100%;
  }
}

/* ===== 公告栏 ===== */
.announce-card {
  display: flex;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-4 $spacing-5;
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

.announce-label {
  flex-shrink: 0;
  padding: 2px $spacing-3;
  border-radius: $border-radius-full;
  font-size: $font-size-sm;
  font-weight: 600;
  color: var(--color-category);
  background: var(--color-category-soft);
}

.announce-text {
  margin: 0;
  color: var(--text-secondary);
  line-height: $line-height-relaxed;
}

/* ===== 博主信息卡 ===== */
.profile-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-5;
  padding: $spacing-5 $spacing-6;
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

.profile-avatar {
  flex-shrink: 0;
  width: $spacing-20;
  height: $spacing-20;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar img,
.avatar-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-2xl;
  font-weight: 700;
  color: $color-white;
  background: var(--brand-logo-gradient);
}

.profile-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-1;
}

.profile-name {
  margin: 0;
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-bio {
  margin: 0;
  color: var(--text-secondary);
  line-height: $line-height-relaxed;
}

.profile-links {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-3;
  margin-top: $spacing-2;
}

.profile-link {
  font-size: $font-size-sm;
  color: var(--color-accent);
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: var(--color-category);
  }
}

.profile-more {
  flex-shrink: 0;
  padding: $spacing-2 $spacing-4;
  border-radius: $border-radius-full;
  font-size: $font-size-sm;
  color: var(--color-category);
  background: var(--color-category-soft);
  text-decoration: none;
  transition:
    background-color 0.2s,
    box-shadow var(--transition-bounce);
}

.profile-more:hover {
  box-shadow: var(--shadow-glow);
}

/* ===== 文章网格：规律等宽 3/2/1 列，数据不足时自然留白 ===== */
.article-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $spacing-5;
  align-items: stretch;
}

/* 首篇 Featured 重点卡：占满整行（与大屏留白一致），首屏形成 "1 大 + N 小" 层级 */
.article-grid .article-card--hero {
  grid-column: 1 / -1;
}

@media (min-width: 1200px) {
  .article-grid {
    gap: $spacing-6;
  }
}

@media (max-width: 900px) {
  .article-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .article-grid {
    grid-template-columns: 1fr;
  }
}

/* ===== 分页器：自然居中，不与内容脱节 ===== */
.pagination-wrap {
  margin-top: $spacing-2;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}
</style>
