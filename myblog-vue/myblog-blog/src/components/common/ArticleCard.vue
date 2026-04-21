<template>
  <article class="article-card">
    <div class="cover">
      <img v-if="article.coverImage" :src="article.coverImage" :alt="article.title" />
      <div v-else class="cover-placeholder">暂无图片</div>
    </div>
    <div class="content">
      <h3 class="title">
        <router-link :to="`/article/${article.id}`">{{ article.title }}</router-link>
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

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
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
  flex-direction: column;
  gap: 10px;
  font-size: 14px;
  color: #999;
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
  color: #999;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  height: 24px;
  line-height: 24px;
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
  font-variant-numeric: tabular-nums;
}
</style>