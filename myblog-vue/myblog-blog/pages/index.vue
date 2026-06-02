<template>
  <div class="home">
    <div class="hero">
      <h1>{{ siteName }}</h1>
      <p>{{ siteDescription }}</p>
      <div class="search-box">
        <el-input
          v-model="searchQuery"
          placeholder="搜索文章..."
          size="large"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>
    </div>

    <div class="home-grid">
      <section class="articles-section">
        <div class="section-header">
          <h2>最新文章</h2>
        </div>
        <div class="articles-content">
          <div v-if="loading" class="loading">
            <el-icon class="is-loading">
              <Loading />
            </el-icon>
            加载中...
          </div>
          <div v-else-if="articles.length === 0" class="no-articles">暂无文章</div>
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
          <h3>热门文章</h3>
          <ul class="hot-list">
            <li v-for="item in hotArticles" :key="item.id">
              <NuxtLink :to="`/article/${item.id}`">{{ item.title }}</NuxtLink>
              <span>{{ item.viewCount }} 阅读</span>
            </li>
          </ul>
        </section>

        <section class="widget">
          <h3>分类导航</h3>
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
            {{ categoryExpanded ? "收起分类" : "展开分类" }}
          </button>
        </section>

        <section class="widget">
          <h3>标签云</h3>
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
            {{ tagExpanded ? "收起标签" : "展开标签" }}
          </button>
        </section>

        <section class="widget">
          <h3>友情链接</h3>
          <ul class="friend-links">
            <li v-for="link in friendLinks" :key="link.name">
              <a :href="link.url" target="_blank" rel="noopener noreferrer">{{ link.name }}</a>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading, Search } from "@element-plus/icons-vue";
import { articleApi, categoryApi, tagApi } from "~/api";
import type { Article, Category, FriendLink, PaginatedResponse, Tag } from "~/types";

const settingsStore = useSettingsStore();
const router = useRouter();

await settingsStore.ensureSettings();

const searchQuery = ref("");
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

const handleSearch = () => {
  const keyword = searchQuery.value.trim();
  if (keyword) {
    router.push({ path: "/search", query: { q: keyword } });
  }
};

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page;
  pageSize.value = size;
};

usePageSeo({
  title: "首页",
  description: siteDescription,
});
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  padding: 56px 20px;
  background: radial-gradient(circle at 30% 20%, #22d3ee, transparent 45%),
    linear-gradient(130deg, #0f766e 0%, #164e63 60%, #0f172a 100%);
  color: #ffffff;
  border-radius: 16px;
  margin-bottom: 28px;
}

.hero h1 {
  font-size: 44px;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.hero p {
  font-size: 17px;
  margin-bottom: 24px;
  opacity: 0.92;
}

.search-box {
  max-width: 540px;
  margin: 0 auto;
}

.home-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 320px;
  gap: 24px;
  align-items: stretch;
}

.articles-section {
  grid-column: 1 / 3;
  display: flex;
  flex-direction: column;
}

.section-header {
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 26px;
  color: #18263c;
}

.loading,
.no-articles {
  text-align: center;
  padding: 40px;
  color: #64748b;
  background: #f8fbff;
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
}

.sidebar {
  grid-column: 3 / 4;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.widget {
  border: 1px solid #e7edf6;
  border-radius: 12px;
  background: #ffffff;
  padding: 16px;
}

.widget h3 {
  font-size: 18px;
  color: #16213e;
  margin-bottom: 14px;
}

.hot-list,
.category-list,
.friend-links {
  list-style: none;
}

.hot-list li,
.category-list li,
.friend-links li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.hot-list a,
.category-list a,
.friend-links a {
  color: #0f172a;
  text-decoration: none;
}

.hot-list span,
.category-list span {
  color: #64748b;
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
  padding: 6px 12px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  text-decoration: none;
  font-size: 13px;
}

.toggle-btn {
  margin-top: 12px;
  border: none;
  background: transparent;
  color: #0f766e;
  cursor: pointer;
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
  .hero {
    padding: 42px 18px;
  }

  .hero h1 {
    font-size: 34px;
  }

  .articles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
