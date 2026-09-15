<template>
  <div class="category">
    <PageHeader
      :title="t('category.title')"
      :description="t('category.description')"
    />
    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      {{ t('archive.loading') }}
    </div>
    <EmptyState
      v-else-if="categories.length === 0"
      :message="t('category.empty')"
      :description="t('category.emptyDesc')"
      :action-text="t('notFound.backHome')"
      action-to="/home"
    />
    <div v-else class="categories-grid">
      <div v-for="(category, i) in categories" :key="category.id" class="category-card" v-reveal="i * 40" @click="goToCategory(category.id)">
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

const { t } = useI18n();
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

const { data: allCategories, pending } = await useAsyncData("category-list", fetchAllCategories, {
  default: () => [],
});

// 空分类对访客没有意义：0 篇文章的分类点进去只会得到空列表，
// 因此只展示确实有文章的分类（全为空时由模板渲染空状态）
const categories = computed(() =>
  allCategories.value.filter((category) => category.articleCount > 0),
);

const goToCategory = (id: number) => {
  router.push(`/category/${id}`);
};

usePageSeo({
  title: t("category.title"),
  description: t("category.description"),
});
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.category {
  margin: 0 auto;
}

.loading {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-secondary);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: $spacing-5;
  justify-content: center;
}

.category-card {
  /* 限制卡片最大宽度，防止 auto-fit 在分类不足一行时把卡片拉伸过宽 */
  width: 100%;
  max-width: 420px;
  justify-self: center;
  /* 走站点唯一的卡片配方 */
  @include card-glass($padding: $spacing-8);
  text-align: center;
  cursor: pointer;
  transition:
    box-shadow var(--transition-bounce),
    transform var(--transition-bounce),
    background-color 0.3s,
    border-color 0.3s;
}

.category-card:hover {
  box-shadow: var(--shadow-elevated), var(--shadow-glow);
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
</style>
