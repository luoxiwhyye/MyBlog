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

    <section class="quick-grid">
      <NuxtLink
        v-for="tool in hotTools"
        :key="tool.id"
        :to="getToolPath(tool)"
        class="quick-card"
      >
        <el-icon><component :is="tool.icon" /></el-icon>
        <strong>{{ tool.name }}</strong>
        <span>{{ tool.description }}</span>
      </NuxtLink>
    </section>

    <section v-for="category in categories" :key="category.id" class="category-section">
      <header class="section-header">
        <div>
          <p>{{ category.description }}</p>
          <h2>{{ category.name }}</h2>
        </div>
        <el-tag effect="plain">{{ category.tools.length }} 个工具</el-tag>
      </header>

      <div class="tool-grid">
        <NuxtLink
          v-for="tool in category.tools"
          :key="tool.id"
          :to="getToolPath(tool)"
          class="tool-card"
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { TOOL_CATEGORIES, TOOL_LIST, getToolPath } from "~/config/tools";

definePageMeta({
  layout: "tools",
  ssr: false,
});

const categories = TOOL_CATEGORIES;
const hotTools = TOOL_LIST.filter((tool) => ["json", "base64", "timestamp", "regex"].includes(tool.id));

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
  border-radius: 28px;
  background: linear-gradient(135deg, #effcf9 0%, #f8fbff 100%);
  border: 1px solid #d8f3eb;
}

.tools-eyebrow {
  color: #18233E;
  font-weight: 700;
  margin-bottom: 10px;
}

.tools-hero h1 {
  font-size: 38px;
  color: #16213e;
  margin-bottom: 14px;
}

.tools-hero p {
  color: #475569;
  line-height: 1.8;
  max-width: 760px;
}

.hero-link {
  white-space: nowrap;
  align-self: flex-start;
  padding: 12px 16px;
  border-radius: 999px;
  background: #18233E;
  color: #ffffff;
  text-decoration: none;
}

.quick-grid,
.tool-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.quick-card,
.tool-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  border-radius: 22px;
  background: #ffffff;
  border: 1px solid #e6edf5;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.05);
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.quick-card:hover,
.tool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 22px 48px rgba(15, 23, 42, 0.08);
}

.quick-card strong,
.tool-card strong {
  color: #16213e;
}

.quick-card span,
.tool-card p {
  color: #64748b;
  line-height: 1.7;
}

.tool-card__top {
  display: flex;
  justify-content: space-between;
  color: #18233E;
  font-weight: 600;
}

.category-section {
  display: grid;
  gap: 18px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}

.section-header p {
  color: #64748b;
  margin-bottom: 8px;
}

.section-header h2 {
  color: #16213e;
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
    border-radius: 20px;
  }

  .tools-hero h1 {
    font-size: 30px;
  }
}
</style>
