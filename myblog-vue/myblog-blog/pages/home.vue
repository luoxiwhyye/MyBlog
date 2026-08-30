<template>
  <div class="home-page">
    <div class="home-body">
      <!-- 公告栏：极简毛玻璃横向卡片 -->
      <section class="announce-card">
        <span class="announce-label">{{ t('home.announcement') }}</span>
        <p class="announce-text">{{ announcement || t('home.announcementEmpty') }}</p>
      </section>

      <!-- 博主信息卡：头像 + 简介 + 社交链接 + 关于入口 -->
      <section class="profile-card">
        <div class="profile-avatar">
          <img v-if="profileAvatar" :src="profileAvatar" :alt="authorName" />
          <span v-else class="avatar-fallback">{{ (authorName || 'B').slice(0, 1) }}</span>
        </div>
        <div class="profile-info">
          <h2 class="profile-name">{{ authorName }}</h2>
          <p class="profile-bio">{{ bio || t('home.profileEmpty') }}</p>
          <div v-if="socialLinks.length" class="profile-links">
            <a
              v-for="link in socialLinks"
              :key="link.url"
              :href="link.url"
              target="_blank"
              rel="noopener noreferrer"
              class="profile-link"
            >{{ link.name }}</a>
          </div>
        </div>
        <NuxtLink to="/about" class="profile-more">{{ t('home.viewProfile') }}</NuxtLink>
      </section>

      <!-- 文章列表：规律等宽网格，数据少时允许自然留白 -->
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        {{ t('article.loading') }}
      </div>
      <EmptyState
        v-else-if="articles.length === 0"
        :message="t('archive.noArticles')"
        :description="t('archive.noArticlesDesc')"
        action-text="返回首页"
        action-to="/home"
      />
      <template v-else>
        <h2 class="section-title">{{ t('home.articlesTitle') }}</h2>
        <div class="article-grid">
          <ArticleCard
            v-for="(article, i) in articles"
            :key="article.id"
            :article="article"
            :badge="i === 0 ? t('home.hero.latestBadge') : ''"
          />
        </div>
      </template>

      <div class="pagination-wrap">
        <Pagination
          :total="total"
          :page="currentPage"
          :page-size="pageSize"
          @update="handlePageUpdate"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from "@element-plus/icons-vue";
import { articleApi } from "~/api";
import { getThumbWebpUrl, normalizeAssetUrl } from "~/utils/image";
import type { Article, PaginatedResponse } from "~/types";

const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();
const { t } = useI18n();

await Promise.all([settingsStore.ensureSettings(), bloggerStore.ensureProfile()]);

const currentPage = ref(1);
const pageSize = ref(6);

const emptyArticlePage = (): PaginatedResponse<Article> => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: 6,
});

const { data: articlePage, pending } = await useAsyncData(
  () => `home-articles-${currentPage.value}-${pageSize.value}`,
  () =>
    articleApi
      .getList({ page: currentPage.value, pageSize: pageSize.value, status: "published" })
      .then((response) => response.data),
  { watch: [currentPage, pageSize], default: emptyArticlePage },
);

const loading = computed(() => pending.value);
const articles = computed(() => articlePage.value.list);
const total = computed(() => articlePage.value.total);

/* ===== 公告 / 博主信息（动态配置，无硬编码假数据） =====
   - 公告：settings 中的 `announcement` 配置项（可空）
   - 社交链接：settings 中的 `social_links`（JSON 数组 [{name,url}]，可空） */
const announcement = computed(() => settingsStore.getSetting("announcement"));

const socialLinks = computed<Array<{ name: string; url: string }>>(() => {
  const raw = settingsStore.getSetting("social_links");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((i) => i?.name && i?.url);
    }
  } catch {
    // 解析失败视为空
  }
  return [];
});

const authorName = computed(() => bloggerStore.nickname());
const bio = computed(() => bloggerStore.bio());
const profileAvatar = computed(() => {
  const raw = normalizeAssetUrl(
    bloggerStore.avatar() || settingsStore.getSetting("site_logo") || "",
  );
  return raw ? getThumbWebpUrl(raw) : "";
});

const handlePageUpdate = (page: number, size: number) => {
  currentPage.value = page;
  pageSize.value = size;
};

const siteName = computed(() => settingsStore.getSetting("site_name") || "MyBlog");
const siteDescription = computed(
  () => settingsStore.getSetting("site_description") || "一个个人博客",
);

usePageSeo({
  title: computed(() => siteName.value),
  description: siteDescription,
});
useWebsiteJsonLd();
</script>

<style lang="scss" scoped>
@use "../assets/css/abstracts/variables" as *;

.home-page {
  padding-top: $spacing-2;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.home-body {
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: $spacing-6;
  /* 分页与内容保持自然间距，不再强制撑满屏幕 */
  padding-bottom: $spacing-6;
}

.loading {
  text-align: center;
  padding: $spacing-8;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

.section-title {
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.2px;
}

/* ===== 公告栏 ===== */
.announce-card {
  display: flex;
  align-items: center;
  gap: $spacing-4;
  padding: $spacing-4 $spacing-5;
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

.announce-label {
  flex-shrink: 0;
  padding: 2px $spacing-3;
  border-radius: $border-radius-full;
  font-size: $font-size-sm;
  font-weight: 600;
  color: var(--color-category);
  background: var(--color-category-soft);
}

.announce-text {
  margin: 0;
  color: var(--text-secondary);
  line-height: $line-height-relaxed;
}

/* ===== 博主信息卡 ===== */
.profile-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-5;
  padding: $spacing-5 $spacing-6;
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

.profile-avatar {
  flex-shrink: 0;
  width: $spacing-20;
  height: $spacing-20;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar img,
.avatar-fallback {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $font-size-2xl;
  font-weight: 700;
  color: $color-white;
  background: var(--brand-logo-gradient);
}

.profile-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-1;
}

.profile-name {
  margin: 0;
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-bio {
  margin: 0;
  color: var(--text-secondary);
  line-height: $line-height-relaxed;
}

.profile-links {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-3;
  margin-top: $spacing-2;
}

.profile-link {
  font-size: $font-size-sm;
  color: var(--color-accent);
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: var(--color-category);
  }
}

.profile-more {
  flex-shrink: 0;
  padding: $spacing-2 $spacing-4;
  border-radius: $border-radius-full;
  font-size: $font-size-sm;
  color: var(--color-category);
  background: var(--color-category-soft);
  text-decoration: none;
  transition:
    background-color 0.2s,
    box-shadow var(--transition-bounce);
}

.profile-more:hover {
  box-shadow: var(--shadow-glow);
}

/* ===== 文章网格：规律等宽 3/2/1 列，数据不足时自然留白 ===== */
.article-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $spacing-5;
  align-items: stretch;
}

@media (max-width: 900px) {
  .article-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .article-grid {
    grid-template-columns: 1fr;
  }
}

/* ===== 分页器：自然居中，不与内容脱节 ===== */
.pagination-wrap {
  margin-top: $spacing-2;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}
</style>
