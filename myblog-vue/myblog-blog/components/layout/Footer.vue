<template>
  <footer class="footer">
    <div class="container">
      <div>
        <p class="copyright">
          &copy; {{ new Date().getFullYear() }} {{ siteAuthor || "MyBlog" }}. All rights reserved.
        </p>
        <p class="icp">{{ siteIcp || "备案号：待补充" }}</p>
      </div>
      <div class="links">
        <NuxtLink to="/about">关于</NuxtLink>
        <NuxtLink to="/archive">归档</NuxtLink>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const settingsStore = useSettingsStore();

await settingsStore.ensureSettings();

const siteAuthor = computed(() => settingsStore.getSetting("site_author"));
const siteIcp = computed(() => settingsStore.getSetting("site_icp"));
</script>

<style scoped>
.footer {
  background: #f4f7fb;
  padding: 20px 0;
  margin-top: 40px;
  border-top: 1px solid #e4ebf4;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
}

.copyright {
  color: #23324a;
  margin-bottom: 4px;
}

.icp {
  color: #6b7280;
  font-size: 13px;
}

.links {
  display: flex;
  gap: 15px;
}

.links a {
  text-decoration: none;
  color: #4b5563;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
