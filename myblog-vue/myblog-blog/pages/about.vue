<template>
  <div class="about">
    <PageHeader :title="t('about.title')" :description="t('about.description')" />

    <!-- 个人品牌名片墙：头部横排 -->
    <div class="about-hero">
      <div class="avatar">
        <img v-if="avatar" :src="avatar" :alt="authorName" loading="eager" @error="onAvatarError" />
        <span v-else class="avatar-fallback">{{ (authorName || "B").slice(0, 1) }}</span>
      </div>
      <div class="hero-info">
        <h2 class="profile-name">{{ authorName }}</h2>
        <p v-if="bio" class="bio">{{ bio }}</p>
        <div v-if="socialLinks.length" class="social-links">
          <SocialLinkItem
            v-for="link in socialLinks"
            :key="link.url"
            class="social-link"
            :item="link"
            :size="18"
          />
        </div>
      </div>
    </div>

    <!-- 站点信息 + 统计：合并为一张宽扁的 Glassmorphism 卡片 -->
    <section class="about-card">
      <h3>{{ t('about.siteInfo') }}</h3>
      <div class="site-meta">
        <div class="meta-item">
          <span class="meta-label">{{ t('about.siteName') }}</span>
          <span class="meta-value">{{ siteName }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">{{ t('about.siteDescription') }}</span>
          <span class="meta-value">{{ siteDescription }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">{{ t('about.established') }}</span>
          <span class="meta-value">{{ established }}</span>
        </div>
      </div>

      <div class="about-stats">
        <div class="stat-item" v-reveal>
          <span class="stat-num">{{ stats.articles }}</span>
          <span class="stat-label">{{ t('about.stats.articles') }}</span>
        </div>
        <div class="stat-item" v-reveal="80">
          <span class="stat-num">{{ stats.categories }}</span>
          <span class="stat-label">{{ t('about.stats.categories') }}</span>
        </div>
        <div class="stat-item" v-reveal="160">
          <span class="stat-num">{{ stats.tags }}</span>
          <span class="stat-label">{{ t('about.stats.tags') }}</span>
        </div>
      </div>
    </section>

    <!-- CTA：和我说句话（留言板）。留言板关闭时整块不渲染 —— 否则会把访客
         引到一个只剩「已关闭」提示的页面，比入口不存在更差。 -->
    <section v-if="isEnabled('enable_message_board')" class="about-cta">
      <div class="cta-text">
        <h3>{{ t('about.ctaTitle') }}</h3>
        <p>{{ t('about.ctaDesc') }}</p>
      </div>
      <NuxtLink to="/message-board" class="cta-btn">
        {{ t('about.ctaAction') }}
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
      </NuxtLink>
    </section>

    <!-- 友链子块：非重复建设，仅作入口（复用 friends 数据模式） -->
    <section v-if="friendLinks.length" class="about-card about-friends">
      <div class="friends-head">
        <h3>{{ t('about.friends') }}</h3>
        <NuxtLink to="/friends" class="friends-more">{{ t('about.friendsMore') }}</NuxtLink>
      </div>
      <div class="friends-grid">
        <a
          v-for="link in friendLinks.slice(0, 4)"
          :key="link.id"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="friend-chip"
          :title="link.name"
        >
          <img
            v-if="link.avatar"
            :src="normalizeAssetUrl(link.avatar)"
            :alt="link.name"
            loading="lazy"
            class="friend-chip-avatar"
          />
          <span v-else class="friend-chip-fallback">{{ link.name.slice(0, 1).toUpperCase() }}</span>
          <span class="friend-chip-name">{{ link.name }}</span>
        </a>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { normalizeAssetUrl } from "~/utils/image";
import { parseSocialLinks } from "~/utils/socialLinks";
import { articleApi, categoryApi, tagApi, friendLinkApi } from "~/api";
import type { FriendLink } from "~/types";

const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();
const { t } = useI18n();
const { isEnabled } = useFeatureFlags();

await Promise.all([settingsStore.ensureSettings(), bloggerStore.ensureProfile()]);

const siteName = computed(() => settingsStore.getSetting("site_name") || "MyBlog");
const siteDescription = computed(
  () => settingsStore.getSetting("site_description") || "一个个人网站",
);
const authorName = computed(() => bloggerStore.nickname());
const bio = computed(() => bloggerStore.bio());
// 头像用缩略图变体，缺失时由 useSmartImage 回退原图
const { src: avatar, onError: onAvatarError } = useSmartImage(() =>
  bloggerStore.avatar() || settingsStore.getSetting("site_logo"),
);

// 社交链接：settings 中的 `social_links`（JSON 数组 [{name,url,icon?}]，可空）
const socialLinks = computed(() => parseSocialLinks(settingsStore.getSetting("social_links")));

// 建立年份（修复占位 bug）：优先读 site_established 设置，否则回退到首批文章年份
const established = ref<string>("");
const establishedFromSetting = computed(() =>
  settingsStore.getSetting("site_established"),
);
watchEffect(() => {
  if (establishedFromSetting.value) {
    established.value = establishedFromSetting.value;
  }
});

// 站点统计（真实数据，来自公开列表接口的 total）
const stats = ref({ articles: 0, categories: 0, tags: 0 });
const firstArticleYear = ref("");
await Promise.all([
  articleApi
    .getList({ page: 1, pageSize: 1, status: "published", sortBy: "created_at" })
    .then((res) => {
      stats.value.articles = res.data.total || 0;
      const first = res.data.list?.[0];
      if (first?.createdAt) {
        const y = new Date(first.createdAt).getFullYear();
        if (!Number.isNaN(y)) firstArticleYear.value = String(y);
      }
    })
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

// 站点建立年份兜底：设置被清空时回退到最早文章年份（避免"当前年"漂移）
watchEffect(() => {
  if (!established.value && firstArticleYear.value) {
    established.value = firstArticleYear.value;
  }
});

// 友链子块：复用独立 friend_link 表（仅取前 4 个做入口）
const emptyPage = () => ({ list: [], total: 0, page: 1, pageSize: 20 });
const friendLinks = ref<FriendLink[]>([]);
try {
  const res = await friendLinkApi.getList({ page: 1, pageSize: 4 });
  friendLinks.value = res.data?.list || [];
} catch {
  friendLinks.value = [];
}

usePageSeo({
  title: computed(() => t('nav.about')),
  description: computed(() => bio.value || siteDescription.value),
  image: avatar,
});
</script>

<style lang="scss" scoped>
@use "../assets/css/abstracts/variables" as *;

.about {
  max-width: 960px;
  margin: clamp(12px, 3vw, 20px) auto;
}

/* 玻璃卡片基类：所有区块统一质感 */
.about-card {
  padding: $spacing-6;
  /* 原为 color-mix(in srgb, var(--bg-card) 88%, transparent)，与同页其它卡片
     （hero / stats 均用 var(--bg-card)）不是同一档透明度；统一走令牌。 */
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  transition:
    box-shadow var(--transition-bounce),
    border-color 0.3s,
    transform var(--transition-bounce);
}

/* hover 对齐 category / friends / archive 的卡片配方：抬升 + 品牌描边 + 双层阴影 */
.about-card:hover {
  box-shadow: var(--shadow-elevated), var(--shadow-glow);
  border-color: var(--color-category);
  transform: translateY(-2px);
}

.about-card h3 {
  font-size: 20px;
  margin-bottom: $spacing-4;
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.about-card h3::before {
  content: "";
  display: inline-block;
  width: 5px;
  height: 18px;
  border-radius: 3px;
  background: var(--gradient-brand, linear-gradient(180deg, var(--color-category), var(--color-accent)));
}

/* ===== 个人品牌头部（头像 + 身份 + 社交链接） ===== */
.about-hero {
  display: flex;
  gap: $spacing-6;
  align-items: center;
  padding: $spacing-6;
  margin-bottom: $spacing-6;
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  transition:
    box-shadow var(--transition-bounce),
    border-color 0.3s,
    transform var(--transition-bounce);
}

.about-hero:hover {
  box-shadow: var(--shadow-elevated), var(--shadow-glow);
  border-color: var(--color-category);
  transform: translateY(-2px);
}

.avatar img,
.avatar-fallback {
  width: clamp(96px, 22vw, 128px);
  height: clamp(96px, 22vw, 128px);
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 0 0 5px var(--color-category-soft);
}

.avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  font-weight: 700;
  color: #ffffff;
  background: var(--brand-logo-gradient);
}

.hero-info {
  flex: 1;
  min-width: 0;
}

.profile-name {
  margin: 0 0 10px;
  font-size: clamp(20px, 4.4vw, 28px);
  color: var(--text-primary);
}

.bio {
  color: var(--text-secondary);
  line-height: $line-height-relaxed;
  /* 保留后台输入的换行（与公告栏同一口径） */
  white-space: pre-line;
}

.social-links {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-2;
  margin-top: $spacing-4;
}

.social-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--bg-hover);
  border: 1px solid var(--border-light);
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.4;
  text-decoration: none;
  transition:
    background-color $transition-fast,
    color $transition-fast,
    border-color $transition-fast;
}

.social-link:hover {
  color: var(--color-accent-deep);
  border-color: var(--color-accent-deep);
  /* 原先写 var(--color-accent-soft, var(--color-category-soft))，
     而 --color-accent-soft 全站未定义（design-system 检查清单明确列为禁用），
     实际生效的一直是回退值 —— 直接写回退值，去掉这个不存在的令牌。 */
  background: var(--color-category-soft);
}

/* ===== 站点信息 + 统计 ===== */
.site-meta {
  display: grid;
  gap: $spacing-3;
  margin-bottom: $spacing-5;
}

.meta-item {
  display: grid;
  grid-template-columns: 96px 1fr;
  align-items: baseline;
  gap: $spacing-2;
}

.meta-label {
  color: var(--text-muted);
  font-size: $font-size-sm;
  white-space: nowrap;
}

.meta-value {
  color: var(--text-primary);
  line-height: 1.6;
}

/* 站点统计：合并为一张宽扁的 Glassmorphism 卡片 */
.about-stats {
  display: grid;
  /* 容器查询：随宽度平滑增减列（每列 ≥160px 或容器全宽），移动端不强制单列 */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
  gap: $spacing-2;
  padding: $spacing-4;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  /* 内嵌面板：用比外层卡片更实一档的 --bg-hover，保留“外层更透、内层更实”的层次
     （原先内层用 var(--bg-card)，与现在的外层同值，层次会消失）。 */
  background: var(--bg-hover);
  /* 原先用 Sass $glass-blur（编译期定值）且漏了 saturate(130%)，
     与同页 / 全站其它玻璃面不一致；改用与它们完全相同的写法。 */
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-1;
  padding: $spacing-3 $spacing-2;
}

/* 三项之间的竖向细分隔线：只有数字与文字而没有分隔时，三项会连成一整块、
   看不出是「文章 / 分类 / 标签」三个统计项。
   ⚠️ 不用 border 写在外层容器上 —— 分隔线必须跟随实际列数（auto-fit 会变列数）。 */
.stat-item + .stat-item {
  border-left: 1px solid var(--border-light);
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-accent-deep);
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

/* ===== CTA：和我说句话 ===== */
.about-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-4;
  margin-top: $spacing-6;
  padding: $spacing-5 $spacing-6;
  border-radius: var(--radius-card-lg);
  background: linear-gradient(120deg, var(--color-category-soft), var(--color-accent-light));
  border: 1px solid var(--glass-border);
}

.cta-text h3 {
  margin: 0 0 4px;
  font-size: 18px;
  color: var(--text-primary);
}

.cta-text p {
  margin: 0;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  line-height: 1.6;
}

.cta-btn {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 999px;
  background: var(--color-accent);
  /* 前景必须走 --color-accent-text：--color-accent 会在亮/暗主题间反相
     （亮 #475569 深色 / 暗 #cbd5e1 浅色），写死 #ffffff 在暗色下会变成
     白字压浅灰（实测对比度仅 1.48:1，远低于 WCAG 的 4.5:1）。
     该令牌按 accent 亮度自动取白或深墨水，两种主题下均达标。 */
  color: var(--color-accent-text, #ffffff);
  font-weight: 600;
  text-decoration: none;
  box-shadow: var(--shadow-card);
  transition:
    transform var(--transition-bounce),
    box-shadow var(--transition-bounce);
}

.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
}

/* ===== 友链子块 ===== */
.about-friends {
  margin-top: $spacing-6;
}

.friends-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-4;
}

.friends-head h3 {
  margin-bottom: 0;
}

.friends-more {
  color: var(--color-accent-deep);
  font-size: $font-size-sm;
  text-decoration: none;
}

.friends-more:hover {
  text-decoration: underline;
}

.friends-grid {
  /* 用 flex-wrap 而非 grid：chip 按内容宽度排布。
     原先用 repeat(auto-fit, minmax(150px, 1fr))，而 auto-fit 会折叠空轨道、
     把剩余空间全部给唯一那个 chip —— 实测只有 1 个友链时它被拉伸到 913px（整行）。 */
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-2;
}

.friend-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: $spacing-2 $spacing-3;
  border-radius: $border-radius-md;
  background: var(--bg-hover);
  border: 1px solid var(--border-light);
  text-decoration: none;
  flex: 0 1 auto;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  transition: background-color $transition-fast, border-color $transition-fast;
}

.friend-chip:hover {
  background: var(--bg-card);
  border-color: var(--color-accent-deep);
}

.friend-chip-avatar,
.friend-chip-fallback {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex: 0 0 auto;
}

.friend-chip-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  background: var(--brand-logo-gradient);
}

.friend-chip-name {
  color: var(--text-primary);
  font-size: 14px;
  /* flex 子项需 min-width: 0 才能让 nowrap 文本真正收缩并出省略号 */
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .about-hero {
    flex-direction: column;
    text-align: center;
  }

  .hero-info {
    width: 100%;
  }

  .social-links,
  .about-cta {
    justify-content: center;
  }

  /* 触摸目标：社交胶囊与 CTA 按钮提到 44px。
     两者都是成块目标（不是内联文字链），真加高比扩命中区恰当。 */
  .social-link,
  .cta-btn {
    min-height: $touch-target-min;
  }
}

@media (max-width: 480px) {
  .about-hero,
  .about-card {
    padding: clamp(14px, 3vw, $spacing-6);
  }

  .profile-name {
    font-size: clamp(17px, 4.6vw, 20px);
  }

  .bio,
  .meta-value {
    font-size: clamp(13px, 3.8vw, 14px);
  }

  .meta-item {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .meta-label {
    font-size: 12px;
  }

  /* 三项统计：移动端固定并排三列（不再随 auto-fit 掉成单列）。
     单列时三项连成一竖条、又只有数字与文字，看不出是三个独立统计项；
     并排后高度 227 → 约 80px，也符合移动端「收紧纵向空间」的方向。 */
  .about-stats {
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    padding: $spacing-3 $spacing-2;
  }

  .stat-item {
    padding: $spacing-2 4px;
  }

  .stat-num {
    font-size: clamp(18px, 5vw, 24px);
  }

  .about-cta {
    flex-direction: column;
    text-align: center;
  }

  .cta-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
