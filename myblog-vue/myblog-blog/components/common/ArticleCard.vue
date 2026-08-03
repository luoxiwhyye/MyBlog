<template>
  <article class="article-card">
    <NuxtLink :to="`/article/${article.id}`" class="card-link" :aria-label="article.title">
      <div class="cover">
        <NuxtImg
          v-if="article.coverImage"
          :src="coverSrc"
          :alt="article.title"
          loading="lazy"
          decoding="async"
          class="cover-image"
          :class="{ 'cover-fallback': coverFailed }"
          @error="handleCoverError"
        />
        <div v-else class="cover-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          <span>{{ article.title }}</span>
        </div>
      </div>
      <div class="content">
        <h3 class="title">
          {{ article.title }}
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
            <div class="meta-right">
              <span class="read-time meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ readTime }}
              </span>
              <span class="views meta-item">{{ article.viewCount }} 阅读</span>
            </div>
          </div>
        </div>
      </div>
    </NuxtLink>
  </article>
</template>

<script setup lang="ts">
import type { Article } from "~/types";
import { formatDate, estimateReadTime } from "~/utils/format";
import { getThumbWebpUrl, normalizeAssetUrl } from "~/utils/image";

const props = defineProps<{
  article: Article;
}>();

const readTime = computed(() => estimateReadTime(props.article.content || props.article.summary || ""));

// 优先使用后端预生成的 _thumb.webp 缩略图，加载失败回退原图；
// 开发环境将 localhost 前缀归一化为相对路径（手机/局域网可访问）
const coverFailed = ref(false);
const coverSrc = computed(() => {
  const raw = normalizeAssetUrl(props.article.coverImage);
  if (coverFailed.value) {
    return raw;
  }
  return getThumbWebpUrl(raw);
});

const handleCoverError = () => {
  coverFailed.value = true;
};

watch(
  () => props.article.coverImage,
  () => {
    coverFailed.value = false;
  },
);
</script>

<style lang="scss" scoped>
.article-card {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  transition: box-shadow 0.3s, transform 0.25s, background-color 0.3s, border-color 0.3s;
  background: var(--bg-card);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.article-card:hover {
  box-shadow: var(--shadow-elevated);
  transform: translateY(-2px);
  border-color: transparent;
}

.card-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.cover {
  height: 200px;
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.article-card:hover .cover-image {
  transform: scale(1.06);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-muted);
  background: linear-gradient(135deg, var(--bg-code), var(--bg-hover));
  font-size: 13px;
  padding: 0 16px;
  text-align: center;
}

.content {
  padding: 20px;
}

.title {
  margin-bottom: 10px;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  min-height: calc(2 * 1.5em);
  transition: color 0.2s;
}

.article-card:hover .title {
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

.meta-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.read-time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
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
