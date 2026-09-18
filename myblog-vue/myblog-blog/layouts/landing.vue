<template>
  <div class="landing">
    <slot />
    <!-- 右上角控件簇：欢迎页没有 Header，搜索入口与主题切换需要在这里显式挂载。
         主题状态与偏好持久化由 ThemeToggle 自己驱动。 -->
    <div class="landing-controls">
      <SearchTrigger />
      <ThemeToggle />
    </div>
    <!-- 备案号：欢迎页没有页脚，合规信息需要在这里出现（未配置时不渲染） -->
    <div class="landing-icp">
      <SiteIcp />
    </div>
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
  position: relative;
  background-color: var(--bg-primary);
  transition: background-color 0.3s;
  /* 自身形成层叠上下文：约束内部 fixed / z-index 的作用范围。
     页面背景图与遮罩挂在 body 上（见 assets/css/base/_page-backdrop.scss）。 */
  isolation: isolate;
}

/* 右上角控件簇（搜索 + 主题切换）：用 fixed 而非 absolute——欢迎内容自身占满
   一屏且带视差位移（transform），absolute 会跟着内容动，fixed 才真正悬浮。 */
.landing-controls {
  position: fixed;
  top: clamp(12px, 2.5vh, 20px);
  right: clamp(12px, 2.5vw, 20px);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 与备案号一致的“悬浮在图上”观感：浅玻璃底，避免按钮直接印在图片上 */
.landing-controls :deep(.theme-toggle),
.landing-controls :deep(.search-trigger) {
  background: var(--bg-card);
  border-color: var(--glass-border);
}

/* 备案号：绝对定位到底部。欢迎内容自身占满一屏（min-height:100vh），
   若让它参与正常流会把备案号挤到首屏之外、需滚动才看得到。 */
.landing-icp {
  position: absolute;
  left: 0;
  right: 0;
  bottom: clamp(12px, 3vh, 24px);
  text-align: center;
  /* 该条横跨整屏，本身不吃点击（仅链接可点），避免挡住下层内容 */
  pointer-events: none;
}

.landing-icp :deep(.site-icp) {
  pointer-events: auto;
  /* 页脚是纯色底不需要阴影；欢迎页背景是图片，
     给偏浅的 --text-muted 文字补一层阴影，保证备案号真能被看清 */
  text-shadow: var(--text-shadow-on-bg);
}
</style>
