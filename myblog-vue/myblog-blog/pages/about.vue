<template>
  <div class="about">
    <h1>关于我</h1>
    <div class="about-content">
      <div class="author-info">
        <div v-if="avatar" class="avatar">
          <img :src="avatar" :alt="authorName" />
        </div>
        <h2>{{ authorName }}</h2>
        <p v-if="bio" class="bio">{{ bio }}</p>
      </div>
      <div class="site-info">
        <h3>网站信息</h3>
        <p>网站名称：{{ siteName }}</p>
        <p>网站描述：{{ siteDescription }}</p>
        <p>建立时间：{{ new Date().getFullYear() }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();

await Promise.all([settingsStore.ensureSettings(), bloggerStore.ensureProfile()]);

const siteName = computed(() => settingsStore.getSetting("site_name") || "MyBlog");
const siteDescription = computed(
  () => settingsStore.getSetting("site_description") || "一个个人博客",
);
const authorName = computed(() => bloggerStore.nickname());
const bio = computed(() => bloggerStore.bio());
const avatar = computed(
  () => bloggerStore.avatar() || settingsStore.getSetting("site_logo") || "",
);

usePageSeo({
  title: "关于",
  description: computed(() => bio.value || siteDescription.value),
  image: avatar,
});
</script>

<style scoped>
.about {
  max-width: 800px;
  margin: 0 auto;
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

.author-info {
  text-align: center;
}

.avatar {
  margin-bottom: 20px;
}

.avatar img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
}

.author-info h2 {
  font-size: 24px;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.bio {
  color: var(--text-secondary);
  line-height: 1.6;
}

.site-info {
  padding: 30px;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  backdrop-filter: blur(12px);
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
