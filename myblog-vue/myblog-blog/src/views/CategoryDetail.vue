<template>
  <DefaultLayout>
    <div class="category-detail">
      <nav class="breadcrumb">
        <router-link to="/">首页</router-link> >
        <router-link to="/category">分类</router-link> >
        <span>{{ categoryName }}</span>
      </nav>

      <h1>{{ categoryName }}</h1>

      <div v-if="loading" class="loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        加载中...
      </div>
      <div v-else-if="articles.length === 0" class="no-articles">
        该分类下暂无文章
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
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import ArticleCard from '@/components/common/ArticleCard.vue'
import Pagination from '@/components/common/Pagination.vue'
import { useArticleStore } from '@/stores/article'
import { useCategoryStore } from '@/stores/category'

const route = useRoute()
const articleStore = useArticleStore()
const categoryStore = useCategoryStore()

const currentPage = ref(1)
const pageSize = ref(10)
const categoryName = ref('')

const articles = computed(() => articleStore.articles)
const loading = computed(() => articleStore.loading)
const total = computed(() => articleStore.total)

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page
  pageSize.value = size
  fetchArticles()
}

const fetchArticles = () => {
  const categoryId = Number(route.params.id)
  if (categoryId) {
    articleStore.fetchArticles({
      page: currentPage.value,
      pageSize: pageSize.value,
      typeId: categoryId,
      status: 'published',
    })

    // Find category name
    const category = categoryStore.categories.find(c => c.id === categoryId)
    if (category) {
      categoryName.value = category.typeName
    }
  }
}

onMounted(() => {
  categoryStore.fetchCategories()
  fetchArticles()
})
</script>

<style scoped>
.category-detail {
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

.category-detail h1 {
  font-size: 32px;
  margin-bottom: 40px;
  color: #333;
  text-align: center;
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