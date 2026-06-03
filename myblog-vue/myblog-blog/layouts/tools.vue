<template>
  <div class="layout">
    <Header />
    <main class="main-content">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import Header from "~/components/layout/Header.vue";
import Footer from "~/components/layout/Footer.vue";
import { normalizeUrl } from "~/utils/seo";

const settingsStore = useSettingsStore();
const runtimeConfig = useRuntimeConfig();

await settingsStore.ensureSettings();

const siteName = computed(() => settingsStore.getSetting("site_name") || "MyBlog");
const siteDescription = computed(
  () => settingsStore.getSetting("site_description") || "一个专注于技术内容、笔记与生活记录的个人博客。",
);
const siteAuthor = computed(() => settingsStore.getSetting("site_author") || "博主");
const siteLogo = computed(() =>
  normalizeUrl(
    settingsStore.getSetting("site_logo") || settingsStore.getSetting("site_favicon") || "/favicon.svg",
    runtimeConfig.public.siteUrl,
  ),
);
const siteFavicon = computed(
  () =>
    normalizeUrl(settingsStore.getSetting("site_favicon") || "/favicon.svg", runtimeConfig.public.siteUrl) ||
    "/favicon.svg",
);

useHead(() => ({
  titleTemplate: (titleChunk) => (titleChunk ? `${titleChunk} | ${siteName.value}` : siteName.value),
  meta: [
    { name: "description", content: siteDescription.value },
    { property: "og:locale", content: "zh_CN" },
    { property: "og:site_name", content: siteName.value },
    { property: "og:title", content: siteName.value },
    { property: "og:description", content: siteDescription.value },
    { property: "og:type", content: "website" },
    ...(siteLogo.value ? [{ property: "og:image", content: siteLogo.value }] : []),
    { name: "twitter:card", content: siteLogo.value ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: siteName.value },
    { name: "twitter:description", content: siteDescription.value },
    ...(siteLogo.value ? [{ name: "twitter:image", content: siteLogo.value }] : []),
    { name: "author", content: siteAuthor.value },
  ],
  link: [{ rel: "icon", type: "image/svg+xml", href: siteFavicon.value }],
}));
</script>

<style scoped>
.layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
</style>
