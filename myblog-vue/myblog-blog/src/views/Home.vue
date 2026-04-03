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
            <template #suffix>
              <el-button @click="handleSearch" icon="Search" size="large" />
            </template>
          </el-input>
        </div>
      </div>

      <div class="articles-section">
        <h2>最新文章</h2>
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
            :article="article"
          />
        </div>
        <Pagination
          :total="total"
          :page="currentPage"
          :page-size="pageSize"
          @update="handlePageUpdate"
        />
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ArticleCard from '@/components/common/ArticleCard.vue'
import Pagination from '@/components/common/Pagination.vue'
import { useArticleStore } from '@/stores/article'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const articleStore = useArticleStore()
const settingsStore = useSettingsStore()

const searchQuery = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const articles = computed(() => articleStore.articles)
const loading = computed(() => articleStore.loading)
const total = computed(() => articleStore.total)

const siteName = computed(() => settingsStore.getSetting('site_name') || 'MyBlog')
const siteDescription = computed(() => settingsStore.getSetting('site_description') || '一个个人博客')

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
  padding: 60px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 8px;
  margin-bottom: 40px;
}

.hero h1 {
  font-size: 48px;
  margin-bottom: 20px;
}

.hero p {
  font-size: 18px;
  margin-bottom: 30px;
  opacity: 0.9;
}

.search-box {
  max-width: 500px;
  margin: 0 auto;
}

.articles-section {
  margin-bottom: 40px;
}

.articles-section h2 {
  font-size: 24px;
  margin-bottom: 20px;
  color: #333;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-articles {
  text-align: center;
  padding: 40px;
  color: #999;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}
</style>