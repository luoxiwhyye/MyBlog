<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <h1 class="not-found-code">404</h1>
      <p class="not-found-title">{{ t('notFound.title') }}</p>
      <p class="not-found-desc">{{ t('notFound.desc') }}</p>

      <div class="not-found-search">
        <el-input
          v-model="searchQuery"
          :placeholder="t('notFound.searchPlaceholder')"
          size="large"
          @keyup.enter="goSearch"
        >
          <template #append>
            <el-button type="primary" @click="goSearch">
              {{ t('notFound.search') }}
            </el-button>
          </template>
        </el-input>
      </div>

      <div class="not-found-actions">
        <el-button type="primary" @click="goHome">
          {{ t('notFound.backHome') }}
        </el-button>
      </div>

      <div v-if="hotArticles.length" class="not-found-suggestions">
        <h3>{{ t('notFound.suggestions') }}</h3>
        <ul>
          <li v-for="article in hotArticles" :key="article.id">
            <NuxtLink :to="`/article/${article.id}`">{{ article.title }}</NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { articleApi } from "~/api";
import type { Article } from "~/types";

const router = useRouter();
const { t } = useI18n();

const searchQuery = ref("");
const hotArticles = ref<Article[]>([]);

// 触发 404 状态码
useHead({
  title: t('notFound.title'),
  meta: [{ name: "robots", content: "noindex, follow" }],
});

// SSR 阶段设置 404 状态码
if (process.server) {
  setResponseStatus(404);
}

// 尝试加载热门文章作为推荐
try {
  const response = await articleApi.getList({
    page: 1,
    pageSize: 5,
    status: "published",
  });
  hotArticles.value = (response.data.list || []).sort(
    (a, b) => b.viewCount - a.viewCount,
  );
} catch {
  // 加载失败不影响 404 页面展示
}

const goSearch = () => {
  const q = searchQuery.value.trim();
  if (q) {
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }
};

const goHome = () => {
  router.push("/home");
};
</script>

<style lang="scss" scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 20px;
}

.not-found-content {
  text-align: center;
  max-width: 520px;
}

.not-found-code {
  font-size: 120px;
  font-weight: 800;
  color: var(--color-accent);
  line-height: 1;
  margin: 0 0 8px;
  opacity: 0.8;
}

.not-found-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.not-found-desc {
  color: var(--text-secondary);
  margin: 0 0 32px;
  line-height: 1.8;
}

.not-found-search {
  margin-bottom: 24px;
}

.not-found-actions {
  margin-bottom: 40px;
}

.not-found-suggestions {
  text-align: left;
  border-top: 1px solid var(--border-color);
  padding-top: 24px;
}

.not-found-suggestions h3 {
  font-size: 16px;
  color: var(--text-secondary);
  margin: 0 0 12px;
}

.not-found-suggestions ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.not-found-suggestions li {
  margin-bottom: 8px;
}

.not-found-suggestions a {
  color: var(--color-link);
  text-decoration: none;
  transition: color 0.2s;
}

.not-found-suggestions a:hover {
  color: var(--color-accent);
}
</style>
