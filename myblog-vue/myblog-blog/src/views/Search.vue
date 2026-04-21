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
        <div class="results-header">
          <p class="results-count">找到 {{ total }} 篇文章</p>
          <el-select v-model="sortBy" class="sort-select" placeholder="排序方式">
            <el-option label="按相关度" value="relevance" />
            <el-option label="按发布时间" value="date" />
          </el-select>
        </div>

        <div class="results-list">
          <article v-for="article in sortedArticles" :key="article.id" class="result-item">
            <h3>
              <router-link :to="`/article/${article.id}`" v-html="highlightText(article.title)"></router-link>
            </h3>
            <p class="summary" v-html="highlightText(article.summary || '')"></p>
            <div class="meta">
              <span>{{ formatDate(article.createdAt) }}</span>
              <span>{{ article.type.typeName }}</span>
              <span>{{ article.viewCount }} 阅读</span>
              <span>预计阅读 {{ estimateReadTime(article.content || article.summary || '') }}</span>
            </div>
          </article>
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
import { Search, Loading } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Pagination from '@/components/common/Pagination.vue'
import { useArticleStore } from '@/stores/article'
import { formatDate, estimateReadTime } from '@/utils/format'
import type { Article } from '@/types'

const route = useRoute()
const router = useRouter()
const articleStore = useArticleStore()

const query = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const sortBy = ref<'relevance' | 'date'>('relevance')

const articles = computed(() => articleStore.articles)
const loading = computed(() => articleStore.loading)
const total = computed(() => articleStore.total)

const countRelevance = (article: Article, keyword: string) => {
  const lowerKeyword = keyword.toLowerCase()
  const text = `${article.title} ${article.summary || ''} ${article.content || ''}`.toLowerCase()
  const matches = text.match(new RegExp(lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
  return matches?.length || 0
}

const sortedArticles = computed(() => {
  const list = [...articles.value]
  if (sortBy.value === 'date') {
    return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }

  const keyword = query.value.trim()
  if (!keyword) {
    return list
  }

  return list.sort((a, b) => countRelevance(b, keyword) - countRelevance(a, keyword))
})

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const highlightText = (text: string) => {
  const keyword = query.value.trim()
  if (!keyword) {
    return text
  }

  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, 'gi')
  return text.replace(pattern, '<mark>$1</mark>')
}

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
    currentPage.value = 1
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
  color: #475569;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.sort-select {
  width: 160px;
}

.results-list {
  display: grid;
  gap: 14px;
  margin-bottom: 20px;
}

.result-item {
  border: 1px solid #e7edf6;
  border-radius: 10px;
  background: #ffffff;
  padding: 16px;
}

.result-item h3 {
  margin-bottom: 8px;
}

.result-item h3 a {
  color: #0f172a;
  text-decoration: none;
}

.summary {
  color: #475569;
  margin-bottom: 10px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 13px;
  color: #666;
}

:deep(mark) {
  background: #fde68a;
  padding: 0 2px;
  border-radius: 2px;
}

@media (max-width: 768px) {
  .results-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>