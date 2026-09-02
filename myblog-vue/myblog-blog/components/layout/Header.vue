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
      <div class="search">
        <el-input
          v-model="searchQuery"
          :placeholder="t('nav.search')"
          @keyup.enter="handleSearch"
          clearable
        >
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>
      <div class="header-controls">
        <div class="theme-toggle-wrapper">
          <ThemeToggle />
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
        >
          <div class="drawer-search">
            <el-input
              v-model="searchQuery"
              :placeholder="t('nav.search')"
              @keyup.enter="handleSearch"
              clearable
            >
              <template #append>
                <el-button :icon="Search" @click="handleSearch" />
              </template>
            </el-input>
          </div>
          <nav class="drawer-nav" role="navigation">
            <NuxtLink v-for="item in navItems" :key="item.to" :to="item.to" class="drawer-link" @click="drawerOpen = false">
              {{ item.label }}
            </NuxtLink>
          </nav>
        </el-drawer>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Search } from "@element-plus/icons-vue";
import { getThumbWebpUrl, normalizeAssetUrl } from "~/utils/image";

const router = useRouter();
const route = useRoute();
const settingsStore = useSettingsStore();
const searchQuery = ref(typeof route.query.q === "string" ? route.query.q : "");
const drawerOpen = ref(false);
const { t } = useI18n();

await settingsStore.ensureSettings();

// 主导航项：桌面内联展示，移动端抽屉复用
const navItems = computed(() => [
  { to: "/home", label: t("nav.home") },
  { to: "/category", label: t("nav.category") },
  { to: "/tag", label: t("nav.tag") },
  { to: "/archive", label: t("nav.archive") },
  { to: "/tools", label: t("nav.tools") },
  { to: "/friends", label: t("nav.friends") },
  { to: "/about", label: t("nav.about") },
]);

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

const handleSearch = () => {
  const keyword = searchQuery.value.trim();
  if (keyword) {
    router.push({ path: "/search", query: { q: keyword } });
  }
};

watch(
  () => route.query.q,
  (value) => {
    searchQuery.value = typeof value === "string" ? value : "";
  },
);
</script>

<style lang="scss" scoped>
.header {
  background: var(--bg-header);
  border-bottom: 1px solid var(--glass-border);
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  transition: background-color 0.3s, border-color 0.3s;
  box-shadow: var(--shadow-card);
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
}

.logo a {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
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
}

.logo-image {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(15, 118, 110, 0.18);
}

.logo-text {
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 700;
  transition: color 0.3s;
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
  color: var(--color-accent);
  box-shadow: var(--shadow-glow);
}

.nav-link:hover {
  transform: translateY(-1px);
}

.search {
  margin-left: auto;
  width: 280px;
}

/* ===== 右侧控件组（主题切换 + 移动端汉堡） ===== */
.header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

.theme-toggle-wrapper {
  flex-shrink: 0;
}

.mobile-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
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
  color: var(--color-category);
  border-color: var(--color-category);
}

/* ===== 移动端抽屉内导航 ===== */
.drawer-search {
  margin-bottom: 20px;
}

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
  color: var(--color-category);
  background: var(--color-category-soft);
}

@media (max-width: 992px) {
  .nav,
  .search {
    display: none;
  }

  .mobile-menu-btn {
    display: inline-flex;
  }
}
</style>
