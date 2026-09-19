<template>
  <div class="welcome-page">
    <div ref="parallaxRef" class="welcome-wrap">
      <div class="avatar-ring" aria-hidden="true">
        <img v-if="avatar" :src="avatar" :alt="authorName" class="avatar" width="112" height="112" @error="onAvatarError" />
        <span v-else class="avatar-fallback">{{ (authorName || "B").slice(0, 1) }}</span>
      </div>

      <p class="welcome-badge">欢迎光临</p>
      <h1 class="welcome-site">{{ siteName }}</h1>
      <p class="welcome-author" v-if="showAuthor">{{ authorName }}</p>
      <p v-if="bio" class="welcome-bio">{{ bio }}</p>

      <div v-if="socialLinks.length" class="welcome-links">
        <SocialLinkItem
          v-for="link in socialLinks"
          :key="link.url"
          class="welcome-link"
          :item="link"
          :size="14"
        />
      </div>

      <NuxtLink to="/home" class="enter-btn">进入网站</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { parseSocialLinks } from "~/utils/socialLinks";

definePageMeta({
  layout: "landing",
});

const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();

await Promise.all([settingsStore.ensureSettings(), bloggerStore.ensureProfile()]);

const siteName = computed(() => settingsStore.getSetting("site_name") || "MyBlog");
const siteDescription = computed(
  () =>
    settingsStore.getSetting("site_description") ||
    "一个专注于技术内容、笔记与生活记录的个人网站。",
);
const authorName = computed(() => bloggerStore.nickname());
const bio = computed(() => bloggerStore.bio());

// 头像优先取博主头像，其次站点 Logo，最后兜底 favicon；
// 用缩略图变体，缺失（sharp 未装 / 原图是 webp / 兜底的 svg）时自动回退原图
const { src: avatar, onError: onAvatarError } = useSmartImage(
  () =>
    bloggerStore.avatar() || settingsStore.getSetting("site_logo") || "/favicon.svg",
);

// 站点名若已包含作者名，则不再单独展示作者行，避免重复
const showAuthor = computed(() => {
  const site = siteName.value.trim();
  const author = authorName.value.trim();
  if (!site || !author || author === "博主") return false;
  return !site.includes(author);
});

// 极简社交链接：复用 social_links，取前 3 个
const socialLinks = computed(() => {
  const raw = settingsStore.getSetting("social_links");
  // 未配置时给一个 GitHub 兜底，避免落地页显得空；
  // 配置了但格式非法则不兜底（展示一个假链接比留空更具误导性）
  if (!raw) return [{ name: "GitHub", url: "https://github.com/" }];
  return parseSocialLinks(raw).slice(0, 3);
});

// 柔和鼠标视差
const parallaxRef = ref<HTMLElement | null>(null);
const onMouseMove = (e: MouseEvent) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = parallaxRef.value;
  if (!el) return;
  const x = (e.clientX / window.innerWidth - 0.5) * 10;
  const y = (e.clientY / window.innerHeight - 0.5) * 10;
  el.style.transform = `translate(${x}px, ${y}px)`;
};
onMounted(() => window.addEventListener("mousemove", onMouseMove, { passive: true }));
onBeforeUnmount(() => window.removeEventListener("mousemove", onMouseMove));

// 标题后段 = 站长自己起的副标题（标题前段固定是站点名，见 useLayoutSeo 的 titleTemplate）。
// 未配置副标题时传 undefined，标题只显示站点名，不出现「A | A」式的自重复。
const siteSubtitle = computed(
  () => settingsStore.getSetting("site_subtitle") || undefined,
);

usePageSeo({
  title: siteSubtitle,
  description: computed(() => siteDescription.value),
  image: avatar,
});
</script>

<style lang="scss" scoped>
.welcome-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.welcome-wrap {
  position: relative;
  z-index: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 24px;
  will-change: transform;
}

/* 「文字直接压在背景图上」的柔光衜底。用伪元素而不是盒子：不参与布局、不需
   改任何间距。它是「不把内容装进卡片」时唯一能修正「大片底色本身就是亮区」的
   手段 —— 文字阴影只能修补字形边缘（实测标题在亮区仍只有 2.01:1）。
   四周外扩，让渐变的透明端落在文字之外；z-index:-1 在 .welcome-wrap 自身的
   层叠上下文内（will-change 已创建），所以只压背景图、不压内容。 */
.welcome-wrap::before {
  content: "";
  position: absolute;
  /* 横向外扩 24% 是为了「让文字整体落在渐变的满强度区」：椭圆半径按元素宽度
     的百分比算，只外扩 10% 时文字左右边缘的归一化距离已进入衰减段（实测那里
     只有 ~0.2 的强度、叠加后最坏只有 3.33:1）。外扩到 24% 后左右边缘也吃满中心
     强度，而更长的渐变半径反而让边缘过渡更柔。纵向靠固定的 48px 就够（文字
     上下都离中心很近）。父级 .welcome-page 有 overflow:hidden，溢出不会产生滚动条。 */
  inset: -48px -24%;
  z-index: -1;
  pointer-events: none;
  background: var(--scrim-on-bg);
}

/* ===== 头像：呼吸 + 柔光 ===== */
.avatar-ring {
  position: relative;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle, var(--deco-a), transparent 70%);
  animation: breathe 4.5s ease-in-out infinite;
}

.avatar {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border-color);
}

.avatar-fallback {
  width: 112px;
  height: 112px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 700;
  color: #ffffff;
  background: var(--brand-logo-gradient);
}

@keyframes breathe {
  0%, 100% { box-shadow: 0 0 0 6px var(--deco-a); transform: scale(1); }
  50% { box-shadow: 0 0 0 22px transparent; transform: scale(1.03); }
}

.welcome-badge {
  margin-top: 6px;
  padding: 6px 18px;
  border-radius: 999px;
  font-size: 13px;
  letter-spacing: 2px;
  color: var(--color-category-strong);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
}

.welcome-site {
  font-size: clamp(2rem, 6vw, 3rem);
  font-weight: 800;
  color: var(--text-primary);
  text-shadow: var(--text-shadow-on-bg), var(--text-glow);
  margin: 0;
}

.welcome-author {
  font-size: 1.02rem;
  color: var(--text-secondary);
  margin: -6px 0 0;
  /* 与标题同属「直接压在图上」的文字，但字号更小、更吃背景图 → 用文字阴影兜底 */
  text-shadow: var(--text-shadow-on-bg);
}

.welcome-bio {
  max-width: 480px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0;
  /* 保留后台输入的换行（与公告栏同一口径） */
  white-space: pre-line;
  /* 说明文字原先是全页唯一没有阴影的裸文字（实测亮色下平均 4.35:1、压图上最暗处
     仅 1.45:1）。字号小时更依赖衜底与阴影，两者都要给。 */
  text-shadow: var(--text-shadow-on-bg);
}

/* ===== 极简社交链接 ===== */
.welcome-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

.welcome-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 999px;
  color: var(--text-secondary);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur));
  text-decoration: none;
  font-size: 14px;
  line-height: 1.4;
  transition:
    color 0.3s,
    border-color 0.3s,
    box-shadow var(--transition-bounce),
    transform var(--transition-bounce);
}

.welcome-link:hover {
  color: var(--color-category-strong);
  border-color: var(--color-category);
  box-shadow: var(--shadow-glow);
  transform: translateY(-1px);
}

/* ===== 单一 CTA =====
   用「玻璃卡同源配方」而不是实心品牌填充：欢迎页的文字与控件都直接压在背景图上，
   一块实心色块等于把背景切开 —— 同页的 .welcome-badge / .welcome-link 也是这个配方。
   文字用品牌**文字/描边档**（--color-accent-deep）：它才是 ≥4.5:1 的那一档；
   填充档 --color-accent 对浅卡只有 2.77:1，只能当图形、不能当文字。
   ⚠️ 底变半透明后就少了一层衬底，必须补 --text-shadow-on-bg 兜底。 */
.enter-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 12px;
  min-width: 180px;
  padding: 14px 34px;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 600;
  color: var(--color-accent-deep);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  box-shadow: var(--shadow-glow);
  text-shadow: var(--text-shadow-on-bg);
  text-decoration: none;
  transition:
    color 0.2s,
    border-color 0.2s,
    box-shadow var(--transition-bounce),
    transform var(--transition-bounce);
}

.enter-btn:hover {
  /* hover 只做「边框高亮 + 发光 + 微抬升」：再把底填实就又变成贴在图上的一块色 */
  color: var(--color-accent-deep);
  border-color: var(--color-accent-deep);
  box-shadow: var(--shadow-glow), 0 0 18px var(--color-accent-light);
  transform: translateY(-2px);
}

/* respect prefers-reduced-motion（glob 已兜底，此处显式关闭头像动画） */
@media (prefers-reduced-motion: reduce) {
  .avatar-ring {
    animation: none;
  }
  .welcome-wrap {
    will-change: auto;
  }
}
</style>
