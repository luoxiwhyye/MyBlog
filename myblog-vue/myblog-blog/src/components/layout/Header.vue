<template>
  <header class="header">
    <div class="container">
      <div class="logo">
        <router-link to="/">{{ siteName }}</router-link>
      </div>
      <nav class="nav">
        <router-link to="/" class="nav-link">首页</router-link>
        <router-link to="/category" class="nav-link">分类</router-link>
        <router-link to="/tag" class="nav-link">标签</router-link>
        <router-link to="/archive" class="nav-link">归档</router-link>
        <router-link to="/about" class="nav-link">关于</router-link>
      </nav>
      <div class="search">
        <el-input
          v-model="searchQuery"
          placeholder="搜索文章..."
          @keyup.enter="handleSearch"
          clearable
        >
          <template #suffix>
            <el-button @click="handleSearch" icon="Search" />
          </template>
        </el-input>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const settingsStore = useSettingsStore()
const searchQuery = ref('')

const siteName = computed(() => settingsStore.getSetting('site_name') || 'MyBlog')

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    router.push({ name: 'Search', query: { q: searchQuery.value.trim() } })
  }
}
</script>

<style scoped>
.header {
  background: #fff;
  border-bottom: 1px solid #e5e5e5;
  padding: 10px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo {
  font-size: 24px;
  font-weight: bold;
}

.logo a {
  text-decoration: none;
  color: #333;
}

.nav {
  display: flex;
  gap: 20px;
}

.nav-link {
  text-decoration: none;
  color: #666;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-link:hover,
.nav-link.router-link-active {
  background-color: #f5f5f5;
  color: #333;
}

.search {
  margin-left: auto;
  width: 300px;
}
</style>