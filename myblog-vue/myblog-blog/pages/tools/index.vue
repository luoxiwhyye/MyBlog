<template>
  <div class="tools-home">
    <section class="tools-hero">
      <div>
        <p class="tools-eyebrow">MyBlog · 编程工具箱</p>
        <h1>开发者常用工具，一站直达</h1>
        <p>
          覆盖编解码、格式化、哈希、文本处理和颜色工具，全部在浏览器端运行，不影响现有博客 SSR/SEO。
        </p>
      </div>
      <NuxtLink to="/tools/formatter/json" class="hero-link">从 JSON 格式化开始 →</NuxtLink>
    </section>

    <!-- 折叠式胶囊分类导航 -->
    <nav class="category-caps" v-if="categories.length">
      <a v-for="cat in categories" :key="cat.id" class="caps-pill" :href="`#cat-${cat.id}`">{{ cat.name }}</a>
    </nav>

    <!-- 我的收藏 -->
    <section v-if="favoriteTools.length" class="favorite-section">
      <header class="section-header">
        <div>
          <p>一键收藏的常用工具</p>
          <h2>⭐ 我的收藏</h2>
        </div>
        <el-tag effect="plain">{{ favoriteTools.length }} 个工具</el-tag>
      </header>
      <div class="quick-grid">
        <NuxtLink
          v-for="(tool, i) in favoriteTools"
          :key="tool.id"
          :to="getToolPath(tool)"
          :class="['quick-card', `tool-span-${toolSpan(i)}`]"
        >
          <div class="quick-card-top">
            <el-icon><component :is="tool.icon" /></el-icon>
            <button
              type="button"
              class="fav-btn active"
              :title="'取消收藏 ' + tool.name"
              @click.prevent.stop="toggleFavorite(tool.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </button>
          </div>
          <strong>{{ tool.name }}</strong>
          <span>{{ tool.description }}</span>
        </NuxtLink>
      </div>
    </section>

    <section class="quick-grid">
      <NuxtLink
        v-for="(tool, i) in hotTools"
        :key="tool.id"
        :to="getToolPath(tool)"
        :class="['quick-card', `tool-span-${toolSpan(i)}`]"
      >
        <div class="quick-card-top">
          <el-icon><component :is="tool.icon" /></el-icon>
          <button
            type="button"
            class="fav-btn"
            :class="{ active: isFavorite(tool.id) }"
            :title="(isFavorite(tool.id) ? '取消收藏 ' : '收藏 ') + tool.name"
            @click.prevent.stop="toggleFavorite(tool.id)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" :fill="isFavorite(tool.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
        </div>
        <strong>{{ tool.name }}</strong>
        <span>{{ tool.description }}</span>
      </NuxtLink>
    </section>

    <section v-for="category in categories" :key="category.id" class="category-section" :id="`cat-${category.id}`">
      <details class="category-block" open>
      <summary class="section-header">
        <div>
          <p>{{ category.description }}</p>
          <h2>{{ category.name }}</h2>
        </div>
        <el-tag effect="plain">{{ category.tools.length }} 个工具</el-tag>
      </summary>

      <div class="tool-grid">
        <NuxtLink
          v-for="(tool, i) in category.tools"
          :key="tool.id"
          :to="getToolPath(tool)"
          :class="['tool-card', `tool-span-${toolSpan(i)}`]"
        >
          <div class="tool-card__top">
            <el-icon><component :is="tool.icon" /></el-icon>
            <span>{{ category.name }}</span>
          </div>
          <strong>{{ tool.name }}</strong>
          <p>{{ tool.description }}</p>
          <div class="tool-tags">
            <el-tag
              v-for="keyword in tool.keywords.slice(0, 3)"
              :key="keyword"
              size="small"
              effect="plain"
            >
              {{ keyword }}
            </el-tag>
          </div>
        </NuxtLink>
      </div>
      </details>
    </section>
  </div>
</template>

<script setup lang="ts">
import { TOOL_CATEGORIES, TOOL_LIST, getToolPath } from "~/config/tools";

definePageMeta({
  layout: "tools",
  ssr: false,
});

const FAVORITES_KEY = "myblog:tools:favorites";

const categories = TOOL_CATEGORIES;
const hotTools = TOOL_LIST.filter((tool) => ["json", "base64", "timestamp", "regex"].includes(tool.id));

// 非对称卡片 span：每 3 张抽一张加宽
const toolSpan = (i: number) => (i % 3 === 1 ? 3 : 2);

// 收藏功能（localStorage 持久化）
const favoriteIds = ref<string[]>([]);

const loadFavorites = () => {
  if (!process.client) return
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    favoriteIds.value = raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    favoriteIds.value = []
  }
}

const isFavorite = (id: string) => favoriteIds.value.includes(id)

const toggleFavorite = (id: string) => {
  const idx = favoriteIds.value.indexOf(id)
  if (idx >= 0) {
    favoriteIds.value.splice(idx, 1)
  } else {
    favoriteIds.value.push(id)
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds.value))
}

const favoriteTools = computed(() =>
  TOOL_LIST.filter((tool) => favoriteIds.value.includes(tool.id)),
)

loadFavorites()

usePageSeo({
  title: "编程工具箱",
  description:
    "MyBlog 编程工具箱，提供 Base64、JSON、SQL、MD5、SHA、正则、时间戳、颜色转换等纯前端工具。",
});
</script>

<style lang="scss" scoped>
.tools-home {
  display: grid;
  gap: 28px;
}

.tools-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 30px;
  border-radius: var(--radius-hero-xl);
  background: linear-gradient(
    135deg,
    var(--color-accent-light) 0%,
    var(--bg-card) 100%
  );
  border: 1px solid var(--border-light);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.tools-eyebrow {
  color: var(--color-accent);
  font-weight: 700;
  margin-bottom: 10px;
}

.tools-hero h1 {
  font-size: 38px;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.tools-hero p {
  color: var(--text-secondary);
  line-height: 1.8;
  max-width: 760px;
}

.hero-link {
  white-space: nowrap;
  align-self: flex-start;
  padding: 12px 16px;
  border-radius: 999px;
  background: var(--color-accent-light);
  color: #ffffff;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
}

.hero-link:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.quick-grid,
.tool-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-auto-flow: dense;
}

.tool-span-2 { grid-column: span 2; }
.tool-span-3 { grid-column: span 3; }

.quick-card,
.tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  text-decoration: none;
  transition:
    transform var(--transition-bounce),
    box-shadow var(--transition-bounce),
    border-color 0.2s ease;
}

.quick-card:hover,
.tool-card:hover {
  transform: translateY(-2px) scale(1.005);
  box-shadow: var(--shadow-elevated), var(--shadow-glow);
  border-color: transparent;
}

.quick-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--color-accent);
}

.fav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-hover);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.fav-btn:hover {
  color: var(--color-fav);
  border-color: var(--color-fav);
}

.fav-btn.active {
  color: var(--color-fav);
  border-color: var(--color-fav-soft);
}

.quick-card strong,
.tool-card strong {
  color: var(--text-primary);
}

.quick-card span,
.tool-card p {
  color: var(--text-secondary);
  line-height: 1.7;
}

.tool-card__top {
  display: flex;
  justify-content: space-between;
  color: var(--color-accent);
  font-weight: 600;
}

.favorite-section {
  display: grid;
  gap: 18px;
}

.category-section {
  display: grid;
  gap: 18px;
  scroll-margin-top: 88px;
}

/* ===== 折叠式胶囊分类导航 ===== */
.category-caps {
  position: sticky;
  top: 72px;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 999px;
  backdrop-filter: blur(12px);
}

.category-caps .caps-pill {
  padding: 7px 16px;
  border-radius: 999px;
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-size: 13px;
  text-decoration: none;
  transition: color 0.2s, background-color 0.2s, box-shadow var(--transition-bounce);
}

.category-caps .caps-pill:hover {
  color: var(--color-category);
  box-shadow: var(--shadow-glow);
}

/* 分类折叠块：隐藏原生 marker */
.category-block summary {
  list-style: none;
  cursor: pointer;
}

.category-block summary::-webkit-details-marker {
  display: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.section-header p {
  color: var(--text-muted);
  margin-bottom: 8px;
}

.section-header h2 {
  color: var(--text-primary);
  font-size: 28px;
}

.tool-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}

@media (max-width: 768px) {
  .tools-hero {
    flex-direction: column;
    padding: 24px;
    border-radius: var(--radius-hero-xl);
  }

  .tools-hero h1 {
    font-size: 30px;
  }
}

@media (max-width: 1080px) {
  .quick-grid,
  .tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .tool-span-2,
  .tool-span-3 {
    grid-column: span 2;
  }
}

@media (max-width: 640px) {
  .quick-grid,
  .tool-grid {
    grid-template-columns: 1fr;
  }
  .tool-span-2,
  .tool-span-3 {
    grid-column: span 1;
  }
}
</style>
