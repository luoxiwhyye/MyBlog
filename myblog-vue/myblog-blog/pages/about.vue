<template>
  <div class="about">
    <h1>{{ t('nav.about') }}</h1>
    <div class="about-content">
      <aside class="profile-col">
        <div class="avatar">
          <img v-if="avatar" :src="avatar" :alt="authorName" />
          <span v-else class="avatar-fallback">{{ (authorName || "B").slice(0, 1) }}</span>
        </div>
        <h2 class="profile-name">{{ authorName }}</h2>
        <p v-if="bio" class="bio">{{ bio }}</p>
      </aside>

      <section class="info-col">
        <h3>{{ t('about.siteInfo') }}</h3>
        <p>{{ t('about.siteName') }}：{{ siteName }}</p>
        <p>{{ t('about.siteDescription') }}：{{ siteDescription }}</p>
        <p>{{ t('about.established') }}：{{ new Date().getFullYear() }}</p>

        <div class="about-stats">
          <div class="stat-item">
            <span class="stat-num">{{ stats.articles }}</span>
            <span class="stat-label">{{ t('about.stats.articles') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{{ stats.categories }}</span>
            <span class="stat-label">{{ t('about.stats.categories') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-num">{{ stats.tags }}</span>
            <span class="stat-label">{{ t('about.stats.tags') }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getThumbWebpUrl, normalizeAssetUrl } from "~/utils/image";
import { articleApi, categoryApi, tagApi } from "~/api";

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
const avatar = computed(() => {
  const raw = normalizeAssetUrl(
    bloggerStore.avatar() || settingsStore.getSetting("site_logo") || "",
  );
  // 头像/Logo 使用缩略图
  return raw ? getThumbWebpUrl(raw) : "";
});

// 站点统计（真实数据，来自公开列表接口的 total）
const stats = ref({ articles: 0, categories: 0, tags: 0 });
await Promise.all([
  articleApi
    .getList({ page: 1, pageSize: 1, status: "published" })
    .then((res) => (stats.value.articles = res.data.total || 0))
    .catch(() => {}),
  categoryApi
    .getList({ page: 1, pageSize: 1 })
    .then((res) => (stats.value.categories = res.data.total || 0))
    .catch(() => {}),
  tagApi
    .getList({ page: 1, pageSize: 1 })
    .then((res) => (stats.value.tags = res.data.total || 0))
    .catch(() => {}),
]);

usePageSeo({
  title: t('nav.about'),
  description: computed(() => bio.value || siteDescription.value),
  image: avatar,
});
</script>

<style lang="scss" scoped>
.about {
  max-width: 960px;
  margin: 20px auto;
}

.about h1 {
  text-align: center;
  font-size: 32px;
  margin-bottom: 40px;
  color: var(--text-primary);
  text-shadow: var(--text-shadow-on-bg), var(--text-glow);
}

/* 错位两列：左个人资料 + 右站点信息 */
.about-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
  gap: 28px;
  align-items: start;
}

.profile-col {
  text-align: center;
  padding: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card-lg);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
}

.avatar {
  display: inline-flex;
}

.avatar img,
.avatar-fallback {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 0 4px var(--color-category-soft);
}

.avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 700;
  color: #ffffff;
  background: var(--brand-logo-gradient);
}

.profile-name {
  margin: 14px 0 8px;
  font-size: 22px;
  color: var(--text-primary);
}

.bio {
  color: var(--text-secondary);
  line-height: 1.7;
}

.info-col {
  padding: 26px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card-lg);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  transition: box-shadow var(--transition-bounce), border-color 0.3s;
}

.info-col:hover {
  box-shadow: var(--shadow-glow);
  border-color: transparent;
}

.info-col h3 {
  font-size: 20px;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.info-col p {
  margin-bottom: 10px;
  color: var(--text-secondary);
}

/* 站点统计 */
.about-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 22px;
  padding-top: 22px;
  border-top: 1px solid var(--border-light);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  background: var(--bg-hover);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card-lg);
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .about-content {
    grid-template-columns: 1fr;
  }
}
</style>
