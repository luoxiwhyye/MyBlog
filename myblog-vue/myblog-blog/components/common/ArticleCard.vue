<template>
  <article class="article-card" :class="{ 'has-badge': !!badge, 'article-card--hero': variant === 'hero' }">
    <NuxtLink :to="`/article/${article.id}`" class="card-link" :aria-label="article.title">
      <div class="cover">
        <img
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
        <span v-if="badge" class="cover-badge">{{ badge }}</span>
      </div>
      <div class="content">
        <h3 class="title">
          {{ article.title }}
        </h3>
        <p class="summary">{{ markdownToPlain(article.summary) }}</p>
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
import { getThumbWebpUrl, getWebpUrl, normalizeAssetUrl } from "~/utils/image";
import { markdownToPlain } from "~/utils/markdown";

const props = withDefaults(
  defineProps<{
    article: Article;
    /** 卡片角标，如 "最新"，为空则不显示 */
    badge?: string;
    /** 卡片变体：grid = 网格卡（默认）；hero = 首页首篇重点卡（整行横排） */
    variant?: "grid" | "hero";
  }>(),
  { badge: "", variant: "grid" },
);

const readTime = computed(() => estimateReadTime(props.article.content || props.article.summary || ""));

// 封面：hero 重点卡用主图（1200px WebP）保证清晰度；grid 网格卡用缩略图（_thumb.webp 400px）
// 减轻移动端流量；加载失败统一回退原图；
// 开发环境将 localhost 前缀归一化为相对路径（手机/局域网可访问）
const coverFailed = ref(false);
const coverSrc = computed(() => {
  const raw = normalizeAssetUrl(props.article.coverImage);
  if (coverFailed.value || !raw) {
    return raw;
  }
  return props.variant === "hero" ? getWebpUrl(raw) : getThumbWebpUrl(raw);
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
@use "../../assets/css/abstracts/variables" as *;

.article-card {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  overflow: hidden;
  transition:
    box-shadow var(--transition-bounce),
    transform var(--transition-bounce),
    background-color 0.3s,
    border-color 0.3s;
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

.article-card:hover {
  box-shadow: var(--shadow-elevated), var(--shadow-glow);
  transform: translateY(-2px) scale(1.005);
  border-color: transparent;
}

.card-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.cover {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
}

/* ===== Featured 重点卡：整行横排 + 更大图幅 ===== */
.article-card--hero .card-link {
  display: flex;
  flex-direction: row;
}

.article-card--hero .cover {
  flex: 0 0 42%;
  aspect-ratio: 2 / 1;
}

.article-card--hero .content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: $spacing-6 $spacing-8;
}

.article-card--hero .title {
  font-size: clamp(1.4rem, 2.6vw, 1.8rem);
  font-weight: 700;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  min-height: 0;
}

.article-card--hero .summary {
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

@media (max-width: 640px) {
  .article-card--hero .card-link {
    flex-direction: column;
  }
  .article-card--hero .cover {
    flex: none;
    aspect-ratio: 16 / 10;
  }
  .article-card--hero .content {
    padding: $spacing-5;
  }
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

/* 最新/热文角标：悬浮在封面左上角，使用亮/暗主题的品牌渐变 */
.cover-badge {
  position: absolute;
  top: $spacing-3;
  left: $spacing-3;
  z-index: 1;
  padding: 4px $spacing-3;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--gradient-brand-text, #fff);
  background: var(--gradient-brand, linear-gradient(135deg, var(--color-category), var(--color-accent)));
  box-shadow: var(--shadow-glow);
  backdrop-filter: blur(var(--glass-blur));
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
  padding: $spacing-5;
}

.title {
  margin-bottom: $spacing-2;
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
  font-size: $font-size-sm;
  line-height: 1.7;
  margin-bottom: $spacing-4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
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
  background: var(--color-category-soft);
  color: var(--color-category);
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

/* ===== 移动端：卡片收紧内边距、缩小标题（置于主规则之后，避免被覆盖） ===== */
@media (max-width: 640px) {
  .article-card .content {
    padding: $spacing-4;
  }

  .article-card .title {
    font-size: 16px;
  }

  .article-card .summary {
    font-size: 13px;
  }
}
</style>
