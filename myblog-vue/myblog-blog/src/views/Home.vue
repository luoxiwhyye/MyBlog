<template>
  <DefaultLayout>
    <div class="home">
      <div class="hero">
        <h1>{{ siteName }}</h1>
        <p>{{ siteDescription }}</p>
        <div class="search-box">
          <el-input
            v-model="searchQuery"
            placeholder="搜索文章..."
            @keyup.enter="handleSearch"
            size="large"
            clearable
          >
            <template #append>
              <el-button @click="handleSearch" :icon="Search" />
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
            <div v-else-if="articles.length === 0" class="no-articles">
              暂无文章
            </div>
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
                <router-link :to="`/article/${item.id}`">{{ item.title }}</router-link>
                <span>{{ item.viewCount }} 阅读</span>
              </li>
            </ul>
          </section>

          <section class="widget">
            <h3>分类导航</h3>
            <ul class="category-list">
              <li v-for="category in visibleCategories" :key="category.id">
                <router-link :to="`/category/${category.id}`">{{ category.typeName }}</router-link>
                <span>{{ category.articleCount }}</span>
              </li>
            </ul>
            <button
              v-if="categories.length > categoryPreviewCount"
              class="toggle-btn"
              type="button"
              @click="categoryExpanded = !categoryExpanded"
            >
              {{ categoryExpanded ? '收起分类' : '展开分类' }}
            </button>
          </section>

          <section class="widget">
            <h3>标签云</h3>
            <div class="tag-cloud">
              <router-link v-for="tag in visibleTags" :key="tag.id" :to="`/tag/${tag.id}`" class="tag-link">
                {{ tag.labelName }}
              </router-link>
            </div>
            <button
              v-if="tags.length > tagPreviewCount"
              class="toggle-btn"
              type="button"
              @click="tagExpanded = !tagExpanded"
            >
              {{ tagExpanded ? '收起标签' : '展开标签' }}
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
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Search, Loading } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ArticleCard from '@/components/common/ArticleCard.vue'
import Pagination from '@/components/common/Pagination.vue'
import { useArticleStore } from '@/stores/article'
import { useSettingsStore } from '@/stores/settings'
import { useTagStore } from '@/stores/tag'
import { useCategoryStore } from '@/stores/category'

interface FriendLink {
  name: string
  url: string
}

const router = useRouter()
const articleStore = useArticleStore()
const settingsStore = useSettingsStore()
const tagStore = useTagStore()
const categoryStore = useCategoryStore()

const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const categoryExpanded = ref(false)
const tagExpanded = ref(false)

const categoryPreviewCount = 6
const tagPreviewCount = 16

const articles = computed(() => articleStore.articles)
const loading = computed(() => articleStore.loading)
const total = computed(() => articleStore.total)
const tags = computed(() => tagStore.tags.slice(0, 20))
const categories = computed(() => categoryStore.categories)
const visibleCategories = computed(() => {
  if (categoryExpanded.value) {
    return categories.value
  }
  return categories.value.slice(0, categoryPreviewCount)
})
const visibleTags = computed(() => {
  if (tagExpanded.value) {
    return tags.value
  }
  return tags.value.slice(0, tagPreviewCount)
})

const siteName = computed(() => settingsStore.getSetting('site_name') || 'MyBlog')
const siteDescription = computed(() => settingsStore.getSetting('site_description') || '一个个人博客')

const hotArticles = computed(() => {
  return [...articleStore.articles]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 5)
})

const friendLinks = computed<FriendLink[]>(() => {
  const raw = settingsStore.getSetting('friend_links')
  if (!raw) {
    return [
      { name: 'Vue.js', url: 'https://vuejs.org/' },
      { name: 'Element Plus', url: 'https://element-plus.org/' },
      { name: 'GitHub', url: 'https://github.com/' },
    ]
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item?.name && item?.url)
    }
  } catch (error) {
    console.error('Invalid friend_links format', error)
  }

  return []
})

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'Search', query: { q: searchQuery.value.trim() } })
  }
}

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page
  pageSize.value = size
  fetchArticles()
}

const fetchArticles = () => {
  articleStore.fetchArticles({
    page: currentPage.value,
    pageSize: pageSize.value,
    status: 'published',
  })
}

onMounted(() => {
  settingsStore.fetchSettings()
  tagStore.fetchTags()
  categoryStore.fetchCategories()
  fetchArticles()
})
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
  gap: 8px;
}

.tag-link {
  text-decoration: none;
  padding: 4px 10px;
  border-radius: 999px;
  color: #0f766e;
  background: #ecfeff;
  border: 1px solid #c6f4f8;
  font-size: 13px;
}

.toggle-btn {
  margin-top: 8px;
  border: none;
  background: transparent;
  color: #0f766e;
  cursor: pointer;
  font-size: 13px;
  padding: 0;
}

.toggle-btn:hover {
  text-decoration: underline;
}

@media (max-width: 1024px) {
  .home-grid {
    grid-template-columns: minmax(0, 1fr) 280px;
  }

  .articles-section {
    grid-column: 1 / 2;
  }

  .articles-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .sidebar {
    grid-column: 2 / 3;
  }
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 32px;
  }

  .home-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .articles-section,
  .sidebar {
    grid-column: 1 / 2;
  }
}
</style>