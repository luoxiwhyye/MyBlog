<template>
  <div class="landing">
    <slot />
    <!-- 主题切换：欢迎页没有 Header，需要在这里显式挂载。
         该组件会调用 useThemeStore()，主题状态与偏好持久化由它自己驱动。 -->
    <div class="landing-theme-toggle">
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
  /* 自身形成层叠上下文，让背景遮罩(z:-1)压在图之上、内容之下 */
  isolation: isolate;
}

/* 主题切换：固定到右上角。用 fixed 而非 absolute——欢迎内容自身占满一屏且
   带视差位移（transform），absolute 会跟着内容动，fixed 才真正悬浮。 */
.landing-theme-toggle {
  position: fixed;
  top: clamp(12px, 2.5vh, 20px);
  right: clamp(12px, 2.5vw, 20px);
  z-index: 10;
  /* 与备案号一致的“悬浮在图上”观感：浅玻璃底，避免按钮直接印在图片上 */
  border-radius: 10px;
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

.landing-theme-toggle :deep(.theme-toggle) {
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
    /* 优先用移动端专用图，未配置时回退桌面图 */
    background-image: var(--site-bg-light-mobile, var(--site-bg-light));
    background-attachment: scroll;
    background-size: auto 100%;
  }

  html.dark .landing {
    background-image: var(
      --site-bg-dark-mobile,
      var(--site-bg-dark, var(--site-bg-light))
    );
  }
}
</style>
