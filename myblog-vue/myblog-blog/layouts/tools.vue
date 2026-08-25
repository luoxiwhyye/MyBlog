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
  background-color: var(--bg-primary);
  transition: background-color 0.3s;
  /* 自身形成层叠上下文，让背景遮罩(z:-1)压在图之上、内容之下 */
  isolation: isolate;
}

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
  padding: $spacing-5 $spacing-5 $spacing-8;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
</style>

<style lang="scss">
/* 背景图片 — 通过 CSS 变量控制，主题切换时自动变换 */
.layout {
  background-image: var(--site-bg-light);
  background-size: cover;
  background-attachment: fixed;
  background-position: center;
}

html.dark .layout {
  background-image: var(--site-bg-dark, var(--site-bg-light));
}
</style>
