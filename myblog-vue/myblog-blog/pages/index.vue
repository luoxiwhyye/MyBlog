<template>
  <div class="home-page">
    <!-- 全屏欢迎区 — 不受 max-width 约束，自然撑满视口 -->
    <section class="welcome">
      <div class="welcome-content">
        <h1 class="welcome-title">{{ siteName }}</h1>
        <p class="welcome-desc">{{ siteDescription }}</p>
        <div class="welcome-arrow" @click="scrollToContent">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
    </section>

    <div class="home-body" ref="contentRef">
      <div class="home-grid">
        <section class="articles-section">
          <div class="section-header">
            <h2>{{ t('home.hero.latest') }}</h2>
          </div>
          <div class="articles-content">
            <div v-if="loading" class="loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              {{ t('article.loading') }}
            </div>
            <div v-else-if="articles.length === 0" class="no-articles">{{ t('archive.noArticles') }}</div>
            <div v-else class="articles-grid">
              <ArticleCard
                v-for="article in articles"
                :key="article.id"
                class="home-article-card"
                :article="article"
              />
            </div>
          </div>
          <div class="pagination-wrap">
            <Pagination
              :total="total"
              :page="currentPage"
              :page-size="pageSize"
              @update="handlePageUpdate"
            />
          </div>
        </section>

        <aside class="sidebar">
          <section class="widget">
            <h3>{{ t('home.hero.hot') }}</h3>
            <ol class="hot-list">
              <li v-for="(item, idx) in hotArticles" :key="item.id">
                <span class="hot-rank" :class="{ 'top3': idx < 3 }">{{ idx + 1 }}</span>
                <div class="hot-info">
                  <NuxtLink :to="`/article/${item.id}`">{{ item.title }}</NuxtLink>
                  <span class="hot-meta">{{ item.viewCount }} {{ t('home.reads') }} · {{ item.type.typeName }}</span>
                </div>
              </li>
            </ol>
          </section>

          <section class="widget">
            <h3>{{ t('home.hero.categories') }}</h3>
            <ul class="category-list">
              <li v-for="category in visibleCategories" :key="category.id">
                <NuxtLink :to="`/category/${category.id}`">{{ category.typeName }}</NuxtLink>
                <span>{{ category.articleCount }}</span>
              </li>
            </ul>
            <button
              v-if="categories.length > categoryPreviewCount"
              class="toggle-btn"
              type="button"
              @click="categoryExpanded = !categoryExpanded"
            >
              {{ categoryExpanded ? t('home.hero.collapseCategories') : t('home.hero.expandCategories') }}
            </button>
          </section>

          <section class="widget">
            <h3>{{ t('home.hero.tags') }}</h3>
            <div class="tag-cloud">
              <NuxtLink v-for="tag in visibleTags" :key="tag.id" :to="`/tag/${tag.id}`" class="tag-link">
                {{ tag.labelName }}
              </NuxtLink>
            </div>
            <button
              v-if="tags.length > tagPreviewCount"
              class="toggle-btn"
              type="button"
              @click="tagExpanded = !tagExpanded"
            >
              {{ tagExpanded ? t('home.hero.collapseTags') : t('home.hero.expandTags') }}
            </button>
          </section>

          <section class="widget">
            <h3>{{ t('home.hero.friends') }}</h3>
            <ul class="friend-links">
              <li v-for="link in friendLinks" :key="link.name">
                <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.name }}</a>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";
import { articleApi, categoryApi, tagApi } from "~/api";
import type { Article, Category, FriendLink, PaginatedResponse, Tag } from "~/types";

const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();
const { t } = useI18n();

await Promise.all([settingsStore.ensureSettings(), bloggerStore.ensureProfile()]);

const contentRef = ref<HTMLElement | null>(null);
const currentPage = ref(1);
const pageSize = ref(10);
const categoryExpanded = ref(false);
const tagExpanded = ref(false);

const categoryPreviewCount = 6;
const tagPreviewCount = 16;

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

const { data: articlePage, pending } = await useAsyncData(
  () => `home-articles-${currentPage.value}-${pageSize.value}`,
  () =>
    articleApi
      .getList({
        page: currentPage.value,
        pageSize: pageSize.value,
        status: "published",
      })
      .then((response) => response.data),
  {
    watch: [currentPage, pageSize],
    default: emptyArticlePage,
  },
);

const { data: categoriesData } = await useAsyncData("home-categories", fetchAllCategories, {
  default: () => [],
});

const { data: tagsData } = await useAsyncData("home-tags", fetchAllTags, {
  default: () => [],
});

const loading = computed(() => pending.value);
const articles = computed(() => articlePage.value.list);
const total = computed(() => articlePage.value.total);
const categories = computed(() => categoriesData.value);
const tags = computed(() => tagsData.value.slice(0, 20));

const visibleCategories = computed(() => {
  if (categoryExpanded.value) {
    return categories.value;
  }

  return categories.value.slice(0, categoryPreviewCount);
});

const visibleTags = computed(() => {
  if (tagExpanded.value) {
    return tags.value;
  }

  return tags.value.slice(0, tagPreviewCount);
});

const siteName = computed(() => settingsStore.getSetting("site_name") || "MyBlog");
const siteDescription = computed(
  () => settingsStore.getSetting("site_description") || "一个个人博客",
);

const hotArticles = computed(() => {
  return [...articles.value].sort((a, b) => b.viewCount - a.viewCount).slice(0, 5);
});

const friendLinks = computed<FriendLink[]>(() => {
  const raw = settingsStore.getSetting("friend_links");
  if (!raw) {
    return [
      { name: "Nuxt", url: "https://nuxt.com/" },
      { name: "Element Plus", url: "https://element-plus.org/" },
      { name: "GitHub", url: "https://github.com/" },
    ];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item?.name && item?.url);
    }
  } catch {
    return [];
  }

  return [];
});

const scrollToContent = () => {
  contentRef.value?.scrollIntoView({ behavior: "smooth" });
};

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page;
  pageSize.value = size;
};

usePageSeo({
  title: t('nav.home'),
  description: siteDescription,
});

// JSON-LD 结构化数据（WebSite + SearchAction）
useWebsiteJsonLd();
</script>

<style lang="scss" scoped>
/* ===== 全屏欢迎区 ===== */
.welcome {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
  margin-bottom: 32px;
  margin-top: -12px;
  overflow: hidden;
  width: 100vw;
  margin-left: calc(-50vw + 50%);
}

.welcome::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    160deg,
    rgba(15, 23, 42, 0.55) 0%,
    rgba(51, 65, 85, 0.3) 50%,
    rgba(15, 23, 42, 0.55) 100%
  );
  backdrop-filter: blur(2px);
}

.welcome::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120px;
  background: linear-gradient(to top, var(--bg-primary) 0%, transparent 100%);
  pointer-events: none;
}

.welcome-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 40px 24px;
}

.welcome-title {
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 16px;
  letter-spacing: 1px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}

.welcome-desc {
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  color: rgba(255, 255, 255, 0.85);
  max-width: 560px;
  margin: 0 auto 40px;
  line-height: 1.8;
}

.welcome-arrow {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  animation: bounce 2s infinite;
  transition: color 0.2s;
}

.welcome-arrow:hover {
  color: #ffffff;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
  40% { transform: translateX(-50%) translateY(-8px); }
  60% { transform: translateX(-50%) translateY(-4px); }
}

/* ===== 内容主体 ===== */
.home-body {
  max-width: 1400px;
  margin: 0 auto;
  padding-bottom: 32px;
}

.home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 320px;
  gap: 24px;
  align-items: start;
}

.articles-section {
  grid-column: 1 / 3;
  display: flex;
  flex-direction: column;
}

.section-header {
  margin-bottom: 20px;
  margin-top: 8px;
}

.section-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: 0.5px;
}

.section-header h2::before {
  content: "";
  display: inline-block;
  width: 4px;
  height: 22px;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--color-accent), rgba(71, 85, 105, 0.35));
  flex-shrink: 0;
}

.loading,
.no-articles {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 10px;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 20px;
}

.articles-content {
  flex: 1;
}

.articles-grid :deep(.home-article-card .summary) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  min-height: calc(2 * 1.6em);
  overflow: hidden;
}

.pagination-wrap {
  margin-top: auto;
  padding: 16px 0 0;
}

.sidebar {
  grid-column: 3 / 4;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.widget {
  border: 1px solid var(--border-light);
  border-radius: 12px;
  background: var(--bg-card);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  padding: 20px;
}

.widget h3 {
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
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
  background: linear-gradient(180deg, var(--color-accent), rgba(71, 85, 105, 0.35));
  flex-shrink: 0;
}

.hot-list {
  list-style: none;
  counter-reset: hot-rank;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hot-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 0.2s;
}

.hot-list li:hover {
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
  color: var(--text-muted);
  background: var(--bg-hover);
}

.hot-rank.top3 {
  background: linear-gradient(135deg, var(--color-accent), rgba(71, 85, 105, 0.65));
  color: #fff;
}

.hot-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.hot-info a {
  color: var(--text-primary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.hot-info a:hover {
  color: var(--color-accent);
}

.hot-meta {
  font-size: 12px;
  color: var(--text-muted);
}

.category-list,
.friend-links {
  list-style: none;
}

.category-list li,
.friend-links li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  transition: background 0.2s;
}

.category-list li:hover,
.friend-links li:hover {
  background: var(--bg-hover);
}

.category-list a,
.friend-links a {
  color: var(--text-primary);
  text-decoration: none;
  transition: color 0.2s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

.category-list a:hover,
.friend-links a:hover {
  color: var(--color-accent);
}

.category-list span {
  color: var(--text-muted);
  font-size: 13px;
  flex-shrink: 0;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-link {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  text-decoration: none;
  font-size: 13px;
  opacity: 0.85;
  transition: opacity 0.2s, transform 0.2s, background-color 0.2s;
}

.tag-link:hover {
  opacity: 1;
  transform: scale(1.05);
}

.toggle-btn {
  margin-top: 12px;
  border: none;
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 6px;
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: var(--bg-hover);
}

@media (max-width: 1080px) {
  .home-grid {
    grid-template-columns: 1fr;
  }

  .articles-section,
  .sidebar {
    grid-column: auto;
  }
}

@media (max-width: 768px) {
  .welcome-title {
    font-size: 2rem;
  }

  .welcome-desc {
    font-size: 1rem;
  }

  .articles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
