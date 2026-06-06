<template>
  <article class="article-card">
    <div class="cover">
      <img v-if="article.coverImage" :src="article.coverImage" :alt="article.title" />
      <div v-else class="cover-placeholder">暂无图片</div>
    </div>
    <div class="content">
      <h3 class="title">
        <NuxtLink :to="`/article/${article.id}`">{{ article.title }}</NuxtLink>
      </h3>
      <p class="summary">{{ article.summary }}</p>
      <div class="meta">
        <div class="meta-top">
          <span class="category meta-item">{{ article.type.typeName }}</span>
          <span v-for="tag in article.labels" :key="tag.id" class="tag meta-item">
            {{ tag.labelName }}
          </span>
        </div>
        <div class="meta-bottom">
          <time class="date meta-item">{{ formatDate(article.createdAt) }}</time>
          <span class="views meta-item">{{ article.viewCount }} 阅读</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Article } from "~/types";
import { formatDate } from "~/utils/format";

defineProps<{
  article: Article;
}>();
</script>

<style scoped>
.article-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s, background-color 0.3s, border-color 0.3s;
  background: var(--bg-card);
  backdrop-filter: blur(12px);
}

.article-card:hover {
  box-shadow: var(--shadow-card);
}

.cover {
  height: 200px;
  overflow: hidden;
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  background: var(--bg-code);
  font-size: 15px;
}

.content {
  padding: 20px;
}

.title {
  margin-bottom: 10px;
}

.title a {
  text-decoration: none;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
}

.title a:hover {
  color: var(--color-link);
}

.summary {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 15px;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  color: var(--text-muted);
}

.meta-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-height: 24px;
}

.meta-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 24px;
  font-size: 14px;
  color: var(--text-muted);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  height: 24px;
  line-height: 24px;
}

.category {
  background: rgba(15, 118, 110, 0.1);
  color: var(--color-accent);
  padding: 2px 8px;
  border-radius: 4px;
}

.tag {
  background: var(--color-accent-light);
  color: var(--color-accent);
  padding: 2px 8px;
  border-radius: 4px;
  opacity: 0.8;
}

.date,
.views {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
</style>
