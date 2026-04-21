<template>
  <DefaultLayout>
    <div class="tag-detail">
      <nav class="breadcrumb">
        <router-link to="/">首页</router-link> >
        <router-link to="/tag">标签</router-link> >
        <span>{{ tagName }}</span>
      </nav>

      <h1>{{ tagName }}</h1>
      <p class="stats">共 {{ total }} 篇文章</p>

      <div v-if="loading" class="loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        加载中...
      </div>
      <div v-else-if="articles.length === 0" class="no-articles">
        该标签下暂无文章
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
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ArticleCard from '@/components/common/ArticleCard.vue'
import Pagination from '@/components/common/Pagination.vue'
import { useArticleStore } from '@/stores/article'
import { useTagStore } from '@/stores/tag'

const route = useRoute()
const articleStore = useArticleStore()
const tagStore = useTagStore()

const currentPage = ref(1)
const pageSize = ref(10)
const tagName = ref('')

const articles = computed(() => articleStore.articles)
const loading = computed(() => articleStore.loading)
const total = computed(() => articleStore.total)

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page
  pageSize.value = size
  fetchArticles()
}

const fetchArticles = async () => {
  const tagId = Number(route.params.id)
  if (tagId) {
    await articleStore.fetchArticles({
      page: currentPage.value,
      pageSize: pageSize.value,
      labelId: tagId,
      status: 'published',
    })

    // Find tag name
    const tag = tagStore.tags.find(t => t.id === tagId)
    if (tag) {
      tagName.value = tag.labelName
    }
  }
}

onMounted(() => {
  tagStore.fetchTags()
  fetchArticles()
})

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      currentPage.value = 1
      fetchArticles()
    }
  }
)
</script>

<style scoped>
.tag-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.breadcrumb {
  margin-bottom: 20px;
  color: #666;
}

.breadcrumb a {
  color: #666;
  text-decoration: none;
}

.breadcrumb a:hover {
  color: #007bff;
}

.tag-detail h1 {
  font-size: 32px;
  margin-bottom: 8px;
  color: #333;
  text-align: center;
}

.stats {
  text-align: center;
  color: #64748b;
  margin-bottom: 26px;
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