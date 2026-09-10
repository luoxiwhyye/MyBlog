<template>
  <div class="friends-page">
    <div class="page-header">
      <h1>{{ t("friends.title") }}</h1>
      <p class="page-desc">{{ t("friends.description") }}</p>
    </div>

    <div v-if="pending" class="friends-loading">
      <el-skeleton animated :rows="3" />
    </div>
    <AppError
      v-else-if="loadError"
      :title="t('error.loadTitle')"
      :description="t('error.loadDesc')"
      :retry-text="t('error.retry')"
      @retry="retryLoad"
    />
    <EmptyState
      v-else-if="links.length === 0"
      :message="t('friends.title')"
      :description="t('friends.description')"
      action-text="返回首页"
      action-to="/home"
    />
    <div v-else class="friends-grid">
      <a
        v-for="(link, i) in links"
        :key="link.id"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="friend-card"
        v-reveal="i * 40"
      >
        <div class="friend-avatar">
          <img
            v-if="link.avatar"
            :src="normalizeAssetUrl(link.avatar)"
            :alt="link.name"
            loading="lazy"
          />
          <span v-else>{{ link.name.slice(0, 1).toUpperCase() }}</span>
        </div>

        <div class="friend-info">
          <h3 class="friend-name">
            <span class="friend-name-text">{{ link.name }}</span>
            <span v-if="link.isSticky" class="friend-badge">{{
              t("friends.sticky")
            }}</span>
          </h3>
          <p v-if="link.description" class="friend-desc">
            {{ link.description }}
          </p>
          <span class="friend-domain">
            <svg
              class="friend-domain-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M3.5 9h17M3.5 15h17" />
              <ellipse cx="12" cy="12" rx="4" ry="9" />
            </svg>
            <span class="friend-domain-text">{{ displayUrl(link.url) }}</span>
          </span>
        </div>

        <svg
          class="friend-arrow"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="7" y1="17" x2="17" y2="7" />
          <polyline points="7 7 17 7 17 17" />
        </svg>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FriendLink, PaginatedResponse } from "~/types";
import { friendLinkApi } from "~/api";
import { normalizeAssetUrl } from "~/utils/image";

const { t } = useI18n();

// 友链改为使用独立的 friend_link 表 /friend-links 接口（非管理员的公开请求仅返回启用项）
const emptyPage = (): PaginatedResponse<FriendLink> => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: 20,
});

const {
  data,
  pending,
  error: friendsError,
  refresh: refreshFriends,
} = await useAsyncData(
  () => "friend-links",
  () =>
    friendLinkApi.getList({ page: 1, pageSize: 100 }).then((res) => res.data),
  { default: emptyPage },
);

const links = computed<FriendLink[]>(() => data.value?.list || []);
const loadError = computed(() => !!friendsError.value);
const retryLoad = () => refreshFriends();

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
  /* 站内页头字号基线：与 archive / category / message-board 保持一致 */
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  font-weight: 800;
  color: var(--text-primary);
  text-shadow: var(--text-shadow-on-bg);
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.page-header h1::before {
  content: "";
  display: inline-block;
  width: 6px;
  /* 用 em 跟随 clamp 字号联动，避免固定 28px 在小屏下高出一截 */
  height: 1.1em;
  border-radius: 3px;
  background: var(
    --gradient-brand,
    linear-gradient(180deg, var(--color-category), var(--color-accent))
  );
}

.page-desc {
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 15px;
  text-shadow: var(--text-shadow-on-bg);
}

.friends-loading {
  padding: $spacing-6;
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

.friends-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: $spacing-5;
}

.friend-card {
  /* 限制卡片最大宽度，防止 auto-fit 在友链不足一行时把卡片拉伸过宽
     （与 category/index.vue 的 .category-card 同一处理） */
  width: 100%;
  max-width: 480px;
  justify-self: center;
  position: relative;
  display: flex;
  align-items: center;
  gap: $spacing-3;
  padding: $spacing-5;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  text-decoration: none;
  transition:
    box-shadow var(--transition-bounce),
    border-color 0.3s,
    transform var(--transition-bounce);
}

/* 顶部品牌渐变描边：hover 自左向右展开，呼应页头竖条的设计语言 */
.friend-card::after {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: var(
    --gradient-brand,
    linear-gradient(90deg, var(--color-category), var(--color-accent))
  );
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 0.35s ease;
}

.friend-card:hover {
  box-shadow: var(--shadow-elevated), var(--shadow-glow);
  border-color: var(--color-category);
  transform: translateY(-3px);
}

.friend-card:hover::after {
  transform: scaleX(1);
}

.friend-card:focus-visible {
  outline: 2px solid var(--color-category);
  outline-offset: 2px;
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
  overflow: hidden;
  background: var(
    --gradient-brand,
    linear-gradient(135deg, var(--color-category), var(--color-accent))
  );
  transition:
    transform var(--transition-bounce),
    box-shadow 0.3s;
}

.friend-card:hover .friend-avatar {
  transform: scale(1.05);
  box-shadow: 0 0 0 4px var(--color-category-soft);
}

.friend-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.friend-info {
  flex: 1;
  min-width: 0;
}

.friend-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  transition: color 0.2s;
}

.friend-name-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friend-card:hover .friend-name {
  color: var(--color-category);
}

/* 置顶徽标：复用「最新 / 排名徽标」的品牌渐变语言，数据来自接口已返回但此前未用的 isSticky */
.friend-badge {
  flex-shrink: 0;
  padding: 1px 8px;
  border-radius: $border-radius-full;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.7;
  letter-spacing: 0.02em;
  color: var(--gradient-brand-text, #fff);
  background: var(--gradient-brand, var(--color-category));
}

.friend-desc {
  display: -webkit-box;
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-secondary);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 域名胶囊：把网址从「同为 13px 的同色文字」中提出来，形成 名称 > 简介 > 域名 的三级层次 */
.friend-domain {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  margin-top: 8px;
  padding: 2px 8px;
  border-radius: $border-radius-full;
  font-size: 12px;
  line-height: 1.6;
  color: var(--color-category);
  background: var(--color-category-soft);
}

.friend-domain-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

.friend-domain-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.friend-arrow {
  flex-shrink: 0;
  color: var(--text-muted);
  transform: translate(-4px, 4px);
  opacity: 0;
  transition:
    opacity 0.2s,
    transform 0.2s,
    color 0.2s;
}

.friend-card:hover .friend-arrow {
  opacity: 1;
  transform: translate(0, 0);
  color: var(--color-category);
}

@media (max-width: 768px) {
  .page-header {
    margin-bottom: $spacing-6;
  }

  .friends-grid {
    grid-template-columns: 1fr;
    gap: $spacing-4;
  }

  /* 触摸端没有 hover：箭头常驻显示，保留「可跳转」的提示 */
  .friend-arrow {
    opacity: 0.45;
    transform: none;
  }
}
</style>
