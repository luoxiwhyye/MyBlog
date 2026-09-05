<template>
  <div class="tag">
    <div class="page-header">
      <h1>标签</h1>
    </div>
    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      加载中...
    </div>
    <div v-else class="tags-cloud">
      <span v-for="(tag, i) in tags" :key="tag.id" class="tag-item" v-reveal="i * 30" @click="goToTag(tag.id)">
        {{ tag.labelName }} ({{ tag.articleCount }})
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";
import { tagApi } from "~/api";
import type { Tag } from "~/types";

const router = useRouter();

const fetchAllTags = async () => {
  const pageSize = 100;
  let page = 1;
  let total = 0;
  const items: Tag[] = [];

  do {
    const response = await tagApi.getList({ page, pageSize });
    items.push(...(response.data.list || []));
    total = response.data.total || 0;
    page += 1;
  } while (items.length < total);

  return items;
};

const { data: tags, pending } = await useAsyncData("tag-list", fetchAllTags, {
  default: () => [],
});

const goToTag = (id: number) => {
  router.push(`/tag/${id}`);
};

usePageSeo({
  title: "标签",
  description: "浏览博客标签云，按关键主题快速筛选相关文章。",
});
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.tag {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: $spacing-8;
}

.tag h1 {
  text-align: center;
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  margin: 8px 0 0;
  color: var(--text-primary);
  text-shadow: var(--text-shadow-on-bg);
}

.loading {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-secondary);
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-3;
  justify-content: center;
}

.tag-item {
  display: inline-block;
  padding: 8px 18px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-radius: 20px;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  font-size: 14px;
}

.tag-item:hover {
  opacity: 1;
  transform: scale(1.05);
  box-shadow: var(--shadow-glow);
}

@media (max-width: 768px) {
  .page-header {
    margin-bottom: $spacing-6;
  }

  /* 移动端标签云提升到 44px 触摸目标 */
  .tag-item {
    min-height: 44px;
    padding: 10px 20px;
    display: inline-flex;
    align-items: center;
  }
}
</style>
