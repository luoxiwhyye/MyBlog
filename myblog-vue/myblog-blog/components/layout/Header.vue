<template>
  <header class="header">
    <div class="container">
      <div class="logo">
        <NuxtLink to="/">
          <img v-if="siteLogo" :src="siteLogo" :alt="siteName" class="logo-image" />
          <span v-else class="logo-mark">MB</span>
          <span class="logo-text">{{ siteName }}</span>
        </NuxtLink>
      </div>
      <nav class="nav">
        <NuxtLink to="/" class="nav-link">首页</NuxtLink>
        <NuxtLink to="/category" class="nav-link">分类</NuxtLink>
        <NuxtLink to="/tag" class="nav-link">标签</NuxtLink>
        <NuxtLink to="/archive" class="nav-link">归档</NuxtLink>
        <NuxtLink to="/tools" class="nav-link">工具箱</NuxtLink>
        <NuxtLink to="/about" class="nav-link">关于</NuxtLink>
      </nav>
      <div class="search">
        <el-input
          v-model="searchQuery"
          placeholder="搜索文章..."
          @keyup.enter="handleSearch"
          clearable
        >
          <template #append>
            <el-button :icon="Search" @click="handleSearch" />
          </template>
        </el-input>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { Search } from "@element-plus/icons-vue";

const router = useRouter();
const route = useRoute();
const settingsStore = useSettingsStore();
const searchQuery = ref(typeof route.query.q === "string" ? route.query.q : "");

await settingsStore.ensureSettings();

const siteName = computed(() => settingsStore.getSetting("site_name") || "MyBlog");
const siteLogo = computed(() => settingsStore.getSetting("site_logo"));

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

<style scoped>
.header {
  background: #ffffff;
  border-bottom: 1px solid #eef1f5;
  padding: 12px 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.container {
  max-width: 1200px;
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
  background: linear-gradient(135deg, #0f766e, #14b8a6);
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
  color: #16213e;
  font-size: 20px;
  font-weight: 700;
}

.nav {
  display: flex;
  gap: 8px;
}

.nav-link {
  text-decoration: none;
  color: #44506b;
  padding: 7px 12px;
  border-radius: 999px;
  transition: background-color 0.3s;
}

.nav-link:hover,
.nav-link.router-link-active {
  background-color: #edf6f5;
  color: #0f766e;
}

.search {
  margin-left: auto;
  width: 320px;
}

@media (max-width: 992px) {
  .container {
    flex-wrap: wrap;
    row-gap: 10px;
  }

  .nav {
    order: 3;
    width: 100%;
    overflow-x: auto;
    white-space: nowrap;
    padding-bottom: 4px;
  }

  .search {
    width: 100%;
    margin-left: 0;
  }
}
</style>
