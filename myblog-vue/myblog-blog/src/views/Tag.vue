<template>
  <DefaultLayout>
    <div class="tag">
      <h1>标签</h1>
      <div v-if="loading" class="loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        加载中...
      </div>
      <div v-else class="tags-cloud">
        <span
          v-for="tag in tags"
          :key="tag.id"
          class="tag-item"
          @click="goToTag(tag.id)"
        >
          {{ tag.labelName }} ({{ tag.articleCount }})
        </span>
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { useTagStore } from '@/stores/tag'

const router = useRouter()
const tagStore = useTagStore()

const tags = computed(() => tagStore.tags)
const loading = computed(() => tagStore.loading)

const goToTag = (id: number) => {
  router.push(`/tag/${id}`)
}

onMounted(() => {
  tagStore.fetchTags()
})
</script>

<style scoped>
.tag {
  max-width: 1200px;
  margin: 0 auto;
}

.tag h1 {
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

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  justify-content: center;
}

.tag-item {
  display: inline-block;
  padding: 8px 16px;
  background: #f3e5f5;
  color: #7b1fa2;
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 14px;
}

.tag-item:hover {
  background: #e1bee7;
}
</style>