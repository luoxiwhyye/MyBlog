<template>
  <div class="landing">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 布局级 SEO：注入 --site-bg-light/dark 等背景变量（无背景变量时欢迎页会空白）
useLayoutSeo();
</script>

<style lang="scss" scoped>
.landing {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  transition: background-color 0.3s;
  /* 自身形成层叠上下文，让背景遮罩(z:-1)压在图之上、内容之下 */
  isolation: isolate;
}

/* 背景图之上的文字可读性遮罩 — 亮/暗随 --bg-page-overlay 自适应 */
.landing::before {
  content: "";
  position: fixed;
  inset: 0;
  background: var(--bg-page-overlay);
  z-index: -1;
  pointer-events: none;
}
</style>

<style lang="scss">
/* 背景图片 — 通过 CSS 变量控制，主题切换时自动变换 */
.landing {
  background-image: var(--site-bg-light);
  background-size: cover;
  background-attachment: fixed;
  background-position: center;
  background-repeat: no-repeat;
}

html.dark .landing {
  background-image: var(--site-bg-dark, var(--site-bg-light));
}

@media (max-width: 768px) {
  .landing {
    background-attachment: scroll;
    background-size: auto 100%;
  }
}
</style>
