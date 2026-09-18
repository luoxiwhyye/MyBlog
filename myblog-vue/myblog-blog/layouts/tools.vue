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
  /* 自身形成层叠上下文：约束内部 fixed / z-index 的作用范围。
     页面背景图与遮罩挂在 body 上（见 assets/css/base/_page-backdrop.scss）。 */
  isolation: isolate;
}

.main-content {
  flex: 1;
  padding: $spacing-5 $layout-gutter $spacing-8;
  max-width: $layout-max-width;
  margin: 0 auto;
  width: 100%;
}

/* 真机（≤480px）：与 default 布局、顶栏、页脚同步收窄左右留白 */
@media (max-width: 480px) {
  .main-content {
    padding: $spacing-5 $layout-gutter-mobile $spacing-8;
  }
}
</style>
