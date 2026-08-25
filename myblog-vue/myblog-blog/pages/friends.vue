<template>
  <div class="friends-page">
    <div class="page-header">
      <h1>{{ t('friends.title') }}</h1>
      <p class="page-desc">{{ t('friends.description') }}</p>
    </div>

    <EmptyState
      v-if="links.length === 0"
      :message="t('friends.title')"
      :description="t('friends.description')"
      action-text="返回首页"
      action-to="/home"
    />
    <div v-else class="friends-grid">
      <a
        v-for="link in links"
        :key="link.url"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="friend-card"
      >
        <div class="friend-avatar">
          <span>{{ link.name.slice(0, 1).toUpperCase() }}</span>
        </div>
        <div class="friend-info">
          <h3 class="friend-name">{{ link.name }}</h3>
          <p class="friend-url">{{ displayUrl(link.url) }}</p>
        </div>
        <svg class="friend-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FriendLink } from "~/types";

const settingsStore = useSettingsStore();
const { t } = useI18n();

await settingsStore.ensureSettings();

const links = computed<FriendLink[]>(() => {
  const raw = settingsStore.getSetting("friend_links");
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item?.name && item?.url);
    }
  } catch {
    return [];
  }
  return [];
});

const displayUrl = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

usePageSeo({
  title: t("friends.title"),
  description: t("friends.description"),
});
</script>

<style lang="scss" scoped>
@use "../assets/css/abstracts/variables" as *;

.friends-page {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 32px;
}

.page-header {
  text-align: center;
  margin-bottom: $spacing-8;
  margin-top: $spacing-4;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 800;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.page-header h1::before {
  content: "";
  display: inline-block;
  width: 6px;
  height: 28px;
  border-radius: 3px;
  background: var(--gradient-brand, linear-gradient(180deg, var(--color-category), var(--color-accent)));
}

.page-desc {
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 15px;
}

.friends-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: $spacing-5;
}

.friend-card {
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-5;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  text-decoration: none;
  transition:
    box-shadow var(--transition-bounce),
    border-color 0.3s,
    transform var(--transition-bounce);
}

.friend-card:hover {
  box-shadow: var(--shadow-glow);
  border-color: transparent;
  transform: translateY(-3px);
}

.friend-avatar {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  background: var(--gradient-brand, linear-gradient(135deg, var(--color-category), var(--color-accent)));
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s;
}

.friend-card:hover .friend-name {
  color: var(--color-accent);
}

.friend-url {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friend-arrow {
  flex-shrink: 0;
  color: var(--text-muted);
  transform: translate(-4px, 4px);
  opacity: 0;
  transition: opacity 0.2s, transform 0.2s;
}

.friend-card:hover .friend-arrow {
  opacity: 1;
  transform: translate(0, 0);
}
</style>
