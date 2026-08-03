<template>
  <footer class="footer">
    <div class="container">
      <div>
        <p class="copyright">
          &copy; {{ new Date().getFullYear() }} {{ siteAuthor || "MyBlog" }}. {{ t('footer.rights') }}
        </p>
        <p class="icp">{{ siteIcp || t('footer.icp') }}</p>
      </div>
      <div class="links">
        <NuxtLink to="/about">{{ t('nav.about') }}</NuxtLink>
        <NuxtLink to="/archive">{{ t('nav.archive') }}</NuxtLink>
        <NuxtLink to="/tools">{{ t('nav.tools') }}</NuxtLink>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();
const { t } = useI18n();

await Promise.all([settingsStore.ensureSettings(), bloggerStore.ensureProfile()]);

const siteAuthor = computed(() => bloggerStore.nickname());
const siteIcp = computed(() => settingsStore.getSetting("site_icp"));
</script>

<style lang="scss" scoped>
.footer {
  background: var(--bg-card);
  border-top: 1px solid var(--border-light);
  padding: 20px 0;
  margin-top: 40px;
  transition: background-color 0.3s, border-color 0.3s;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
}

.copyright {
  color: var(--text-primary);
  margin-bottom: 4px;
  transition: color 0.3s;
}

.icp {
  color: var(--text-muted);
  font-size: 13px;
  transition: color 0.3s;
}

.links {
  display: flex;
  gap: 15px;
}

.links a {
  text-decoration: none;
  color: var(--text-secondary);
  transition: color 0.3s;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
