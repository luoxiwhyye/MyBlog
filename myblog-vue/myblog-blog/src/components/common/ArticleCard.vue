<template>
  <article class="article-card">
    <div v-if="article.coverImage" class="cover">
      <img :src="article.coverImage" :alt="article.title" />
    </div>
    <div class="content">
      <h3 class="title">
        <router-link :to="`/article/${article.id}`">{{ article.title }}</router-link>
      </h3>
      <p class="summary">{{ article.summary }}</p>
      <div class="meta">
        <span class="category">{{ article.type.typeName }}</span>
        <span v-for="tag in article.labels" :key="tag.id" class="tag">
          {{ tag.labelName }}
        </span>
        <time class="date">{{ formatDate(article.createdAt) }}</time>
        <span class="views">{{ article.viewCount }} 阅读</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Article } from '@/types'
import { formatDate } from '@/utils/format'

defineProps<{
  article: Article
}>()
</script>

<style scoped>
.article-card {
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s;
}

.article-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
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

.content {
  padding: 20px;
}

.title {
  margin-bottom: 10px;
}

.title a {
  text-decoration: none;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.title a:hover {
  color: #007bff;
}

.summary {
  color: #666;
  line-height: 1.6;
  margin-bottom: 15px;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 14px;
  color: #999;
}

.category {
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 4px;
}

.tag {
  background: #f3e5f5;
  color: #7b1fa2;
  padding: 2px 8px;
  border-radius: 4px;
}

.date,
.views {
  color: #999;
}
</style>