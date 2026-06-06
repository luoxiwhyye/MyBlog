<template>
  <div class="tag">
    <div class="page-header">
      <el-button class="home-btn" plain @click="goHome">返回首页</el-button>
      <h1>标签</h1>
    </div>
    <div v-if="pending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      加载中...
    </div>
    <div v-else class="tags-cloud">
      <span v-for="tag in tags" :key="tag.id" class="tag-item" @click="goToTag(tag.id)">
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

const goHome = () => {
  router.push("/");
};

usePageSeo({
  title: "标签",
  description: "浏览博客标签云，按关键主题快速筛选相关文章。",
});
</script>

<style scoped>
.tag {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  position: relative;
  min-height: 40px;
  margin-bottom: 32px;
}

.tag h1 {
  text-align: center;
  font-size: 32px;
  margin: 0;
  color: var(--text-primary);
}

.home-btn {
  position: absolute;
  left: 0;
  top: 0;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
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
  background: var(--color-accent-light);
  color: var(--color-accent);
  border-radius: 20px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 14px;
}

.tag-item:hover {
  opacity: 0.8;
}

@media (max-width: 768px) {
  .page-header {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .home-btn {
    position: static;
  }

  .tag h1 {
    width: 100%;
  }
}
</style>
