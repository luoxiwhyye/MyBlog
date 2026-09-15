<template>
  <div class="tools-home">
    <FeatureDisabled v-if="featureDisabled" feature="工具箱" />

    <template v-else>
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

    <!-- 我的收藏：区块结构/卡片样式与下方分类区保持统一 -->
    <section v-if="favoriteTools.length" class="category-section">
      <details class="category-block" open>
        <summary class="section-header">
          <div class="section-title-block">
            <h2>⭐ 我的收藏</h2>
            <p>一键收藏的常用工具</p>
            <span class="section-count">共 {{ favoriteTools.length }} 个工具</span>
          </div>
        </summary>
        <div class="quick-grid">
          <ToolCard
            v-for="tool in favoriteTools"
            :key="tool.id"
            :tool="tool"
            :favorite="true"
            @toggle-favorite="toggleFavorite"
          />
        </div>
      </details>
    </section>

    <!-- 快捷区：最近使用 / 常用推荐（动态，区别于下方按分类罗列的全部工具） -->
    <section v-if="quickTools.length" class="category-section">
      <details class="category-block" open>
        <summary class="section-header">
          <div class="section-title-block">
            <h2>{{ quickTitle }}</h2>
            <p>{{ quickDescription }}</p>
            <span class="section-count">共 {{ quickTools.length }} 个工具</span>
          </div>
        </summary>
        <div class="quick-grid">
          <ToolCard
            v-for="tool in quickTools"
            :key="tool.id"
            :tool="tool"
            :favorite="isFavorite(tool.id)"
            @toggle-favorite="toggleFavorite"
          />
        </div>
      </details>
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
        <ToolCard
          v-for="tool in category.tools"
          :key="tool.id"
          :tool="tool"
          :favorite="isFavorite(tool.id)"
          @toggle-favorite="toggleFavorite"
        />
      </div>
      </details>
    </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { TOOL_CATEGORIES, TOOL_LIST } from "~/config/tools";

definePageMeta({
  layout: "tools",
  ssr: false,
});

const settingsStore = useSettingsStore();

// 工具页为客户端渲染，设置在 layout/tools.vue 已 await 加载
const featureDisabled = computed(
  () => settingsStore.getSetting("enable_tools") === "false",
);

const FAVORITES_KEY = "myblog:tools:favorites";

const categories = TOOL_CATEGORIES;

// 首页快捷区（quick-grid）：优先展示「最近使用」，无记录时回退为「常用推荐」。
// 与下方按分类罗列全部工具的区块形成分工，避免无标题、静态写死的重复陈列。
const RECOMMENDED_TOOL_IDS = ["json", "base64", "timestamp", "regex"];
const recommendedTools = TOOL_LIST.filter((tool) =>
  RECOMMENDED_TOOL_IDS.includes(tool.id),
);

const { recentTools } = useRecentTools();
const quickTools = computed(() =>
  recentTools.value.length ? recentTools.value : recommendedTools,
);
const quickTitle = computed(() =>
  recentTools.value.length ? "🕘 最近使用" : "🔥 常用推荐",
);
const quickDescription = computed(() =>
  recentTools.value.length
    ? "你最近打开过的工具，点一下继续"
    : "新手常从这里开始，用起来后会自动变成你的最近使用",
);

// 网格采用容器查询（auto-fit + minmax(min(100%, 230px), 1fr)）自适应列数，
// 不再需要按整数列数手动计算 span，卡片随容器宽度平滑增减列。
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
  font-size: clamp(1.5rem, 4.5vw, 2.375rem);
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.tools-hero p {
  color: var(--text-secondary);
  line-height: 1.8;
  max-width: 760px;
}

.quick-grid {
  display: grid;
  /* 快捷区（最近使用 / 我的收藏）固定「桌面 3 列 → 平板 2 列 → 手机 1 列」，
     而非 auto-fit 的「能塞几列塞几列」。原因：最近使用上限 6 条，在 1200px
     容器下 auto-fit 会排成 5+1 的不对称布局；固定 3 列则为 3+3，整齐且卡片
     宽度更舒展。同时避免「只有 1~2 个工具时卡片被拉伸成通栏」。 */
  grid-template-columns: minmax(0, 1fr);
  gap: $spacing-5;
}

@media (min-width: 640px) {
  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 900px) {
  .quick-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.tool-grid {
  display: grid;
  /* 用 auto-fill 而非 auto-fit：auto-fit 会把「唯一一张卡片」所在的空轨道
     拉伸到整行（例如只有 1 个工具的分类，卡片被撑成通栏、很空旷）；
     auto-fill 保留空轨道，单卡片保持正常卡片宽度、靠左排列。
     min 用 260px：1200px 容器下为 4 列（约 285px/卡），与原先观感接近。 */
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: $spacing-5;
}

.category-section {
  display: grid;
  gap: $spacing-6;
  scroll-margin-top: 88px;
}

/* ===== 分类块：标题 + 工具卡合并为一个整体卡片，消除割裂感 ===== */
.category-block {
  padding: clamp(12px, 2.5vw, $spacing-6);
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

/* 折叠：隐藏 summary 之外的内容。
   必须显式声明——浏览器 UA 的 `details:not([open]) > *:not(summary){display:none}`
   会被作者样式 `.tool-grid/.quick-grid { display: grid }` 覆盖，导致折叠失效。 */
.category-block:not([open]) > :not(summary) {
  display: none;
}

/* 收起时去掉 summary 下方的分割线与留白，避免留下一段空档 */
.category-block:not([open]) summary {
  padding-bottom: 0;
  margin-bottom: 0;
  border-bottom: none;
}

/* ===== 折叠式胶囊分类导航 ===== */
.category-caps {
  position: sticky;
  top: 72px;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-3;
  /* 走站点唯一的卡片配方（圆角/底色/描边/模糊强度均与其它卡片同源） */
  @include card-glass;
  /* 父容器是可换行(flex-wrap)的多行容器，若用 999px 全胶囊圆角，
     左右两端会被拉成夸张胶囊、与内部多行子项错配割裂。
     配方已给常规固定圆角，子项 .caps-pill 仍保持 999px 胶囊。 */
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
  color: var(--color-category-strong);
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
  font-size: clamp(1.25rem, 3vw, 1.75rem);
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

@media (max-width: 768px) {
  .tools-hero {
    flex-direction: column;
    padding: clamp(0.9rem, 3vw, 1.5rem);
    border-radius: var(--radius-hero-xl);
  }

  .tools-hero h1 {
    font-size: clamp(1.25rem, 5vw, 1.6rem);
  }
}

/* 移动端：分类胶囊导航提升为 44px 触摸目标 */
@media (max-width: 768px) {
  .category-caps {
    padding: 8px;
    gap: 8px;
  }

  .category-caps .caps-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 8px 18px;
  }
}

/* ===== 移动端（375~430px 真机）：收紧区块标题文字 ===== */
@media (max-width: 480px) {
  .tools-hero p {
    font-size: clamp(0.9rem, 3.8vw, 1rem);
  }

  .section-count {
    font-size: clamp(0.86rem, 3vw, 0.93rem);
  }
}
</style>
