<template>
  <div class="layout">
    <Header />
    <main class="main-content">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Header from "~/components/layout/Header.vue";
import Footer from "~/components/layout/Footer.vue";

const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();

await Promise.all([settingsStore.ensureSettings(), bloggerStore.ensureProfile()]);

useLayoutSeo();
</script>

<style lang="scss" scoped>
@use "../assets/css/abstracts/variables" as *;

.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  /* 自身形成层叠上下文，让背景遮罩(z:-1)压在图之上、内容之下 */
  isolation: isolate;
}

.layout::before {
  content: "";
  position: fixed;
  inset: 0;
  background-color: var(--bg-primary);
  transition: background-color 0.3s;
  z-index: 0;
  pointer-events: none;
}

/* 背景图之上的文字可读性遮罩 — 亮/暗随 --bg-page-overlay 自适应 */
.layout::after {
  content: "";
  position: fixed;
  inset: 0;
  background: var(--bg-page-overlay);
  z-index: -1;
  pointer-events: none;
}

.main-content {
  flex: 1;
  padding: $spacing-3 $spacing-5 $spacing-8;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  position: relative;
  z-index: 1;
}
</style>

<style lang="scss">
/* 背景图片 — 通过 CSS 变量控制，主题切换时自动变换 */
.layout {
  background-image: var(--site-bg-light);
  background-size: cover;
  background-attachment: fixed;
  background-position: center;
  background-repeat: no-repeat;
}

html.dark .layout {
  background-image: var(--site-bg-dark, var(--site-bg-light));
}

/* 在移动端使用更轻量的背景处理 */
@media (max-width: 768px) {
  .layout {
    background-attachment: scroll;
    background-size: auto 100%;
  }
}
</style>
