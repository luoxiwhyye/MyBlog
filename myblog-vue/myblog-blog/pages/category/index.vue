<template>
  <div class="category">
    <div class="page-header">
      <h1>分类</h1>
    </div>
    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      加载中...
    </div>
    <div v-else class="categories-grid">
      <div v-for="category in categories" :key="category.id" class="category-card" @click="goToCategory(category.id)">
        <h3>{{ category.typeName }}</h3>
        <p>{{ category.articleCount }} 篇文章</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";
import { categoryApi } from "~/api";
import type { Category } from "~/types";

const router = useRouter();

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

const { data: categories, pending } = await useAsyncData("category-list", fetchAllCategories, {
  default: () => [],
});

const goToCategory = (id: number) => {
  router.push(`/category/${id}`);
};

usePageSeo({
  title: "分类",
  description: "浏览博客的全部文章分类，快速按主题查找内容。",
});
</script>

<style lang="scss" scoped>
.category {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.category h1 {
  text-align: center;
  font-size: 32px;
  margin: 8px 0 0;
  color: var(--text-primary);
  text-shadow: var(--text-shadow-on-bg);
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.category-card {
  padding: 30px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: box-shadow 0.25s, transform 0.2s, background-color 0.3s, border-color 0.3s;
  background: var(--bg-card);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.category-card:hover {
  box-shadow: var(--shadow-elevated);
  transform: translateY(-2px);
  border-color: var(--color-accent);
}

.category-card h3 {
  font-size: 24px;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.category-card p {
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .page-header {
    margin-bottom: 24px;
  }
}
</style>
