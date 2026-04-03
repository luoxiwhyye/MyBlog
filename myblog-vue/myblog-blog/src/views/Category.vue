<template>
  <DefaultLayout>
    <div class="category">
      <h1>分类</h1>
      <div v-if="loading" class="loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        加载中...
      </div>
      <div v-else class="categories-grid">
        <div
          v-for="category in categories"
          :key="category.id"
          class="category-card"
          @click="goToCategory(category.id)"
        >
          <h3>{{ category.typeName }}</h3>
          <p>{{ category.articleCount }} 篇文章</p>
        </div>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useCategoryStore } from '@/stores/category'

const router = useRouter()
const categoryStore = useCategoryStore()

const categories = computed(() => categoryStore.categories)
const loading = computed(() => categoryStore.loading)

const goToCategory = (id: number) => {
  router.push(`/category/${id}`)
}

onMounted(() => {
  categoryStore.fetchCategories()
})
</script>

<style scoped>
.category {
  max-width: 1200px;
  margin: 0 auto;
}

.category h1 {
  text-align: center;
  font-size: 32px;
  margin-bottom: 40px;
  color: #333;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.category-card {
  padding: 30px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: box-shadow 0.3s;
}

.category-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.category-card h3 {
  font-size: 24px;
  margin-bottom: 10px;
  color: #333;
}

.category-card p {
  color: #666;
}
</style>