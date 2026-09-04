<template>
  <div class="tools-home">
    <section class="tools-hero">
      <div>
        <p class="tools-eyebrow">MyBlog · 编程工具箱</p>
        <h1>开发者常用工具</h1>
        <p>
          编程相关工具。
        </p>
      </div>
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
          :class="['quick-card', `tool-span-${toolSpan(i, favoriteTools.length)}`]"
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
        :class="['quick-card', `tool-span-${toolSpan(i, hotTools.length)}`]"
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
        <div class="section-title-block">
          <h2>{{ category.name }}</h2>
          <p>{{ category.description }}</p>
          <span class="section-count">共 {{ category.tools.length }} 个工具</span>
        </div>
      </summary>

      <div class="tool-grid">
        <NuxtLink
          v-for="(tool, i) in category.tools"
          :key="tool.id"
          :to="getToolPath(tool)"
          :class="['tool-card', `tool-span-${toolSpan(i, category.tools.length)}`]"
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

// Bento 自适应 span：优先三张普通卡（span2）铺满一行；
// 若最后一行只剩 1~2 张，则分别拉伸为整行/半行，避免网格右侧出现空洞。
const toolSpan = (i: number, total: number) => {
  const remainder = total % 3;
  if (remainder === 1) {
    return i === total - 1 ? 6 : 2;
  }
  if (remainder === 2) {
    return i >= total - 2 ? 3 : 2;
  }
  return 2;
};

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
@use "../../assets/css/abstracts/variables" as *;

.tools-home {
  display: grid;
  gap: $spacing-6;
}

.tools-hero {
  display: flex;
  justify-content: space-between;
  gap: $spacing-6;
  padding: $spacing-8;
  border-radius: var(--radius-hero-xl);
  background: linear-gradient(
    135deg,
    var(--color-accent-light) 0%,
    var(--bg-card) 100%
  );
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
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
  gap: $spacing-5;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  grid-auto-flow: dense;
}

.tool-span-2 { grid-column: span 2; }
.tool-span-3 { grid-column: span 3; }
.tool-span-6 { grid-column: span 6; }

.quick-card,
.tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: $spacing-5;
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
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
  gap: $spacing-5;
}

.category-section {
  display: grid;
  gap: $spacing-6;
  scroll-margin-top: 88px;
}

/* ===== 分类块：标题 + 工具卡合并为一个整体卡片，消除割裂感 ===== */
.category-block {
  padding: $spacing-6;
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  box-shadow: var(--shadow-card);
  transition:
    box-shadow var(--transition-bounce),
    border-color 0.2s ease;
}

.category-block:hover {
  border-color: transparent;
  box-shadow: var(--shadow-card), var(--shadow-glow);
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
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  backdrop-filter: blur(var(--glass-blur));
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
  display: flex;
  align-items: center;
  gap: $spacing-4;
  list-style: none;
  cursor: pointer;
  padding-bottom: $spacing-5;
  margin-bottom: $spacing-6;
  border-bottom: 1px solid var(--border-light);
  position: relative;
}

.category-block summary::-webkit-details-marker {
  display: none;
}

/* 折叠指示箭头：默认朝下，收起时朝右 */
.category-block summary::after {
  content: "";
  width: 8px;
  height: 8px;
  margin-left: auto;
  flex-shrink: 0;
  border-right: 2px solid var(--text-muted);
  border-bottom: 2px solid var(--text-muted);
  transform: rotate(45deg);
  transition: transform $transition-base;
}

.category-block:not([open]) summary::after {
  transform: rotate(-45deg);
}

.section-header {
  flex: 1;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.section-header h2 {
  color: var(--text-primary);
  font-size: 28px;
}

.section-header p {
  color: var(--text-muted);
  margin-bottom: 8px;
}

/* 分类块标题：分类名在上、描述/计数在下，竖向排列；折叠箭头靠右居中。
   作用域限定在分类块内，避免影响「我的收藏」等复用 .section-header 的区块 */
.category-block summary .section-header .section-title-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  align-items: flex-start;
}

.category-block summary .section-header p {
  margin-bottom: 0;
}

.section-count {
  color: var(--text-muted);
  font-size: 13px;
  opacity: 0.85;
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
    padding: $spacing-6;
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
  .tool-span-3,
  .tool-span-6 {
    grid-column: span 2;
  }
}

@media (max-width: 640px) {
  .quick-grid,
  .tool-grid {
    grid-template-columns: 1fr;
  }
  .tool-span-2,
  .tool-span-3,
  .tool-span-6 {
    grid-column: span 1;
  }
}
</style>
