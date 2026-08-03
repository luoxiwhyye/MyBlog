<template>
  <div class="about">
    <div class="about-content">
      <div class="site-info">
        <div class="author-row">
          <div v-if="avatar" class="avatar">
            <img :src="avatar" :alt="authorName" />
          </div>
          <h2>{{ authorName }}</h2>
        </div>
        <p v-if="bio" class="bio">{{ bio }}</p>
        <hr class="divider" />
        <h3>{{ t('about.siteInfo') }}</h3>
        <p>{{ t('about.siteName') }}：{{ siteName }}</p>
        <p>{{ t('about.siteDescription') }}：{{ siteDescription }}</p>
        <p>{{ t('about.established') }}：{{ new Date().getFullYear() }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { normalizeAssetUrl } from "~/utils/image";

const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();
const { t } = useI18n();

await Promise.all([settingsStore.ensureSettings(), bloggerStore.ensureProfile()]);

const siteName = computed(() => settingsStore.getSetting("site_name") || "MyBlog");
const siteDescription = computed(
  () => settingsStore.getSetting("site_description") || "一个个人博客",
);
const authorName = computed(() => bloggerStore.nickname());
const bio = computed(() => bloggerStore.bio());
const avatar = computed(
  () =>
    normalizeAssetUrl(bloggerStore.avatar() || settingsStore.getSetting("site_logo") || ""),
);

usePageSeo({
  title: t('nav.about'),
  description: computed(() => bio.value || siteDescription.value),
  image: avatar,
});
</script>

<style lang="scss" scoped>
.about {
  max-width: 800px;
  margin: 20px auto;
}

.about h1 {
  text-align: center;
  font-size: 32px;
  margin-bottom: 40px;
  color: var(--text-primary);
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 16px;
}

.avatar {
  flex-shrink: 0;
}

.avatar img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.author-row h2 {
  font-size: 24px;
  color: var(--text-primary);
  margin: 0;
}

.bio {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
}

.divider {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 20px 0;
}

.site-info {
  padding: 30px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.site-info h3 {
  font-size: 20px;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.site-info p {
  margin-bottom: 10px;
  color: var(--text-secondary);
}
</style>
