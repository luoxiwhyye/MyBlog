<template>
  <header class="header">
    <div class="container">
      <div class="logo">
        <NuxtLink to="/">
          <img v-if="siteLogo" :src="siteLogo" :alt="siteName" class="logo-image" width="40" height="40" />
          <span v-else class="logo-mark">MB</span>
          <span class="logo-text">{{ siteName }}</span>
        </NuxtLink>
      </div>
      <nav class="nav" role="navigation">
        <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" class="nav-link">
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="header-controls">
        <!-- 桌面内联控件：≤992px 收进抽屉（移动端顶栏 3×44px 会挤掉站点名，
             实测 390px 下站点名被折成 2 行）。
             ⚠️ 不能给 SearchTrigger / ThemeToggle 加「组件级全局隐藏」——
             欢迎页没有汉堡按钮，layouts/landing.vue 的 .landing-controls
             是移动端唯一的搜索 / 主题入口。 -->
        <div class="header-controls__inline">
          <SearchTrigger />
          <div class="theme-toggle-wrapper">
            <ThemeToggle />
          </div>
        </div>
        <button
          type="button"
          class="mobile-menu-btn"
          :aria-label="t('nav.openMenu')"
          :aria-expanded="drawerOpen"
          @click="drawerOpen = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
        <el-drawer
          v-model="drawerOpen"
          direction="ltr"
          size="min(320px, 84vw)"
          :title="siteName"
          class="mobile-drawer"
          @closed="handleDrawerClosed"
        >
          <nav class="drawer-nav" role="navigation">
            <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" class="drawer-link" @click="drawerOpen = false">
              {{ item.label }}
            </NuxtLink>
          </nav>

          <!-- 搜索与外观：移动端顶栏放不下，收进抽屉。
               搜索是浮层，必须等抽屉关闭动画结束再打开，否则会被抽屉盖住。 -->
          <div class="drawer-actions">
            <button type="button" class="drawer-action" @click="openPaletteFromDrawer">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <span>{{ t("commandPalette.open") }}</span>
            </button>
            <div class="drawer-action drawer-action--split">
              <span>{{ t("theme.label") }}</span>
              <ThemeToggle />
            </div>
          </div>
        </el-drawer>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { getThumbWebpUrl, normalizeAssetUrl } from "~/utils/image";

const route = useRoute();
const settingsStore = useSettingsStore();
const drawerOpen = ref(false);
const { t } = useI18n();
const { open: openPalette } = useCommandPalette();

// 抽屉里点「搜索」：命令面板是浮层，抽屉不关会被盖住。
// 记一个待打开标记，等 el-drawer 的关闭动画真正结束（closed 事件）再打开面板
// —— 比 setTimeout 猜时长可靠（关闭动画时长会随 reduce-motion 等变化）。
const pendingPaletteOpen = ref(false);
const openPaletteFromDrawer = () => {
  pendingPaletteOpen.value = true;
  drawerOpen.value = false;
};
const handleDrawerClosed = () => {
  if (!pendingPaletteOpen.value) return;
  pendingPaletteOpen.value = false;
  openPalette();
};

await settingsStore.ensureSettings();

// 主导航项：桌面内联展示，移动端抽屉复用
// 功能开关：未配置（''）视为启用；仅显式 'false' 才隐藏对应入口
const featureEnabled = (key: string) => settingsStore.getSetting(key) !== "false";

const navItems = computed(() => {
  const base = [
    { to: "/home", label: t("nav.home") },
    { to: "/category", label: t("nav.category") },
    { to: "/tag", label: t("nav.tag") },
    { to: "/archive", label: t("nav.archive") },
    { to: "/tools", label: t("nav.tools") },
    { to: "/friends", label: t("nav.friends") },
    { to: "/message-board", label: t("nav.messageBoard") },
    { to: "/about", label: t("nav.about") },
  ];
  return base.filter((item) => {
    if (item.to === "/tools") return featureEnabled("enable_tools");
    if (item.to === "/message-board") return featureEnabled("enable_message_board");
    return true;
  });
});

// 路由变化时收起移动端抽屉
watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false;
  },
);

const siteName = computed(() => settingsStore.getSetting("site_name") || "MyBlog");
// Logo 使用缩略图（_thumb.webp，400px）；归一化 localhost 前缀，保证手机/局域网访问时 Logo 可加载
const siteLogo = computed(() => {
  const raw = normalizeAssetUrl(settingsStore.getSetting("site_logo"));
  return raw ? getThumbWebpUrl(raw) : "";
});
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.header {
  /* 不用 backdrop-filter：它会创建 containing block，
     导致内部 el-drawer 的 position:fixed 被限制在 Header 内（移动端菜单被裁剪）。
     改用更高不透明度的背景色 + 渐变性边框补偿毛玻璃质感。 */
  background: linear-gradient(
    to bottom,
    var(--bg-header-solid),
    var(--bg-header)
  );
  border-bottom: 1px solid var(--glass-border);
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: background-color 0.3s, border-color 0.3s;
  box-shadow: var(--shadow-card);
}

/* 栏宽与水平内边距必须与 .main-content / 页脚一致（否则顶栏文字会比正文外扩一截），
   三处共用 $layout-max-width / $layout-gutter。
   实测：1200px 下顶栏内部（logo + 导航 + 右侧控件）共 832px，留白充足。 */
.container {
  width: 100%;
  max-width: $layout-max-width;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: $spacing-4;
  padding: 0 $layout-gutter;
}

.logo {
  /* 允许收缩（flex 子项默认 min-width:auto 会拒绝收缩，长站点名会把右侧控件挤出去） */
  min-width: 0;
}

.logo a {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  min-width: 0;
}

.logo-mark {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--brand-logo-gradient);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.logo-image {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 6px 18px var(--color-category-soft);
  flex-shrink: 0;
}

.logo-text {
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 700;
  transition: color 0.3s;
  /* 站点名是唯一的「内容」、右侧是固定控件 → 让它自己收缩并省略，
     而不是把控件挤走或被折成两行（实测 390px 下原本折 2 行）。 */
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary);
  padding: 7px 12px;
  border-radius: 999px;
  transition:
    background-color 0.3s,
    color 0.3s,
    box-shadow var(--transition-bounce),
    transform var(--transition-bounce);
}

.nav-link:hover,
.nav-link.router-link-active {
  background-color: var(--color-accent-light);
  color: var(--color-accent-deep);
  box-shadow: var(--shadow-glow);
}

.nav-link:hover {
  transform: translateY(-1px);
}

/* ===== 右侧控件组（搜索 + 主题切换 + 移动端汉堡） ===== */
.header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

/* 桌面内联控件（≤992px 由下方媒体查询隐藏）。
   警告：这里只隐藏「Header 内的一份」，组件本身在其他容器（如欢迎页
   layouts/landing.vue 的 .landing-controls）里仍然可见。 */
.header-controls__inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle-wrapper {
  flex-shrink: 0;
}

.mobile-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  /* 44px 触摸目标（避免仅 36px 时移动端误触） */
  width: 44px;
  height: 44px;
  border-radius: 10px;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  cursor: pointer;
  transition:
    color 0.2s,
    background-color 0.2s,
    border-color 0.2s;
}

.mobile-menu-btn:hover {
  color: var(--color-category-strong);
  border-color: var(--color-category);
}

/* ===== 移动端抽屉内导航 ===== */
.drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.drawer-link {
  display: block;
  padding: 14px 16px;
  border-radius: 12px;
  color: var(--text-secondary);
  font-size: 16px;
  font-weight: 500;
  text-decoration: none;
  transition:
    background-color 0.2s,
    color 0.2s;
}

.drawer-link:hover,
.drawer-link.router-link-active {
  color: var(--color-category-strong);
  background: var(--color-category-soft);
}

/* ===== 抽屉内的搜索 / 外观 ===== */
.drawer-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: $spacing-4;
  padding-top: $spacing-4;
  border-top: 1px solid var(--border-light);
}

.drawer-action {
  display: flex;
  align-items: center;
  gap: 10px;
  /* 44px 触摸目标，与 .drawer-link 的节奏一致 */
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 12px;
  color: var(--text-secondary);
  font-size: 16px;
  font-weight: 500;
  /* 原生 button 的 UA 默认需要补回（background / border / padding 由上面覆盖） */
  font-family: inherit;
  text-align: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
  transition:
    background-color 0.2s,
    color 0.2s;
}

/* 只有「搜索」这一行是可点的动作；外观行的反馈交给真实的切换按钮本身 */
.drawer-action:not(.drawer-action--split):hover {
  color: var(--color-category-strong);
  background: var(--color-category-soft);
}

.drawer-action--split {
  justify-content: space-between;
  cursor: default;
}

.drawer-action svg {
  flex-shrink: 0;
}

/* 抽屉内统一到 44px（组件自身只在 ≤768px 是 44px，768~992px 仍是 36px）。
   ⚠️ 别用 :deep(.theme-toggle)：那会编译成 [data-v-x] .theme-toggle（0,2,0），
   与子组件自身的 .theme-toggle[data-v-y] 同特异性、胜负取决于加载顺序。 */
.drawer-action .theme-toggle {
  width: 44px;
  height: 44px;
}

@media (max-width: 992px) {
  .nav {
    display: none;
  }

  /* 搜索与主题切换让位给站点名（改走汉堡抽屉，见 .drawer-actions） */
  .header-controls__inline {
    display: none;
  }

  .mobile-menu-btn {
    display: inline-flex;
  }
}

/* ≤480px 与 .main-content / 页脚同步收窄水平留白，保持左边缘对齐 */
@media (max-width: 480px) {
  .container {
    padding: 0 $layout-gutter-mobile;
  }
}
</style>
