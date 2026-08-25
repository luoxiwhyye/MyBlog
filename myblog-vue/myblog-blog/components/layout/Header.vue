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
      <nav class="nav">
        <NuxtLink to="/home" class="nav-link">{{ t('nav.home') }}</NuxtLink>
        <NuxtLink to="/category" class="nav-link">{{ t('nav.category') }}</NuxtLink>
        <NuxtLink to="/tag" class="nav-link">{{ t('nav.tag') }}</NuxtLink>
        <NuxtLink to="/archive" class="nav-link">{{ t('nav.archive') }}</NuxtLink>
        <NuxtLink to="/tools" class="nav-link">{{ t('nav.tools') }}</NuxtLink>
        <NuxtLink to="/friends" class="nav-link">{{ t('nav.friends') }}</NuxtLink>
        <NuxtLink to="/about" class="nav-link">{{ t('nav.about') }}</NuxtLink>
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
      <div class="theme-toggle-wrapper">
        <ThemeToggle />
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
const { t } = useI18n();

await settingsStore.ensureSettings();

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
  border-bottom: 1px solid var(--border-light);
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
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

@media (max-width: 992px) {
  .container {
    flex-wrap: wrap;
    row-gap: 10px;
  }

  .nav {
    order: 4;
    width: 100%;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 4px;
  }

  .search {
    order: 3;
    width: 100%;
    margin-left: 0;
  }
}

.theme-toggle-wrapper {
  flex-shrink: 0;
}

@media (max-width: 992px) {
  .theme-toggle-wrapper {
    margin-left: auto;
  }
}
</style>
