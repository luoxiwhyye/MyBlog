<template>
  <footer class="footer">
    <div class="container">
      <p>&copy; {{ new Date().getFullYear() }} {{ siteAuthor || 'MyBlog' }}. All rights reserved.</p>
      <div class="links">
        <a href="/about">关于</a>
        <a href="/rss">RSS</a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()

const siteAuthor = computed(() => settingsStore.getSetting('site_author'))
</script>

<style scoped>
.footer {
  background: #f8f8f8;
  padding: 20px 0;
  margin-top: 40px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.links {
  display: flex;
  gap: 15px;
}

.links a {
  text-decoration: none;
  color: #666;
}
</style>