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

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  transition: background-color 0.3s;
}

.main-content {
  flex: 1;
  padding:0 20px 20px 20px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
</style>

<style>
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

/* 暗色模式下 hero 使用冷色调 */
html.dark .hero {
  background: rgba(37, 52, 80, 0.55);
}
</style>
