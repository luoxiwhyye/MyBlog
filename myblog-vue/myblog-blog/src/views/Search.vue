<template>
  <DefaultLayout>
    <div class="search">
      <h1>搜索结果</h1>
      <div class="search-input">
        <el-input
          v-model="query"
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

      <div v-if="loading" class="loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        搜索中...
      </div>
      <div v-else-if="articles.length === 0 && query" class="no-results">
        没有找到相关文章
      </div>
      <div v-else-if="articles.length > 0" class="results">
        <p class="results-count">找到 {{ total }} 篇文章</p>
        <div class="articles-grid">
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
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ArticleCard from '@/components/common/ArticleCard.vue'
import Pagination from '@/components/common/Pagination.vue'
import { useArticleStore } from '@/stores/article'

const route = useRoute()
const router = useRouter()
const articleStore = useArticleStore()

const query = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const articles = computed(() => articleStore.articles)
const loading = computed(() => articleStore.loading)
const total = computed(() => articleStore.total)

const handleSearch = () => {
  if (query.value.trim()) {
    currentPage.value = 1
    fetchResults()
    router.replace({ query: { q: query.value.trim() } })
  }
}

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page
  pageSize.value = size
  fetchResults()
}

const fetchResults = () => {
  if (query.value.trim()) {
    articleStore.fetchArticles({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: query.value.trim(),
      status: 'published',
    })
  }
}

watch(() => route.query.q, (newQuery) => {
  if (newQuery && typeof newQuery === 'string') {
    query.value = newQuery
    fetchResults()
  }
})

onMounted(() => {
  const q = route.query.q
  if (q && typeof q === 'string') {
    query.value = q
    fetchResults()
  }
})
</script>

<style scoped>
.search {
  max-width: 1200px;
  margin: 0 auto;
}

.search h1 {
  text-align: center;
  font-size: 32px;
  margin-bottom: 30px;
  color: #333;
}

.search-input {
  max-width: 600px;
  margin: 0 auto 40px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.no-results {
  text-align: center;
  padding: 40px;
  color: #999;
}

.results-count {
  margin-bottom: 20px;
  color: #666;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}
</style>