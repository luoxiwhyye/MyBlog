<template>
  <div class="welcome-page">
    <div ref="parallaxRef" class="welcome-wrap">
      <div class="avatar-ring" aria-hidden="true">
        <img v-if="avatar" :src="avatar" :alt="authorName" class="avatar" width="112" height="112" />
        <span v-else class="avatar-fallback">{{ (authorName || "B").slice(0, 1) }}</span>
      </div>

      <p class="welcome-badge">欢迎光临</p>
      <h1 class="welcome-site">{{ siteName }}</h1>
      <p class="welcome-author" v-if="showAuthor">{{ authorName }}</p>
      <p v-if="bio" class="welcome-bio">{{ bio }}</p>

      <div v-if="socialLinks.length" class="welcome-links">
        <a
          v-for="link in socialLinks"
          :key="link.url"
          :href="link.url"
          target="_blank"
          rel="noopener noreferrer"
          class="welcome-link"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          {{ link.name }}
        </a>
      </div>

      <NuxtLink to="/home" class="enter-btn">进入博客</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getThumbWebpUrl, normalizeAssetUrl } from "~/utils/image";
import type { FriendLink } from "~/types";

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
    "一个专注于技术内容、笔记与生活记录的个人博客。",
);
const authorName = computed(() => bloggerStore.nickname());
const bio = computed(() => bloggerStore.bio());
const avatar = computed(() => {
  const raw = normalizeAssetUrl(
    bloggerStore.avatar() || settingsStore.getSetting("site_logo") || "/favicon.svg",
  );
  // 头像/Logo 使用缩略图；favicon 无缩略图变体，保持原样
  return raw.endsWith(".svg") ? raw : getThumbWebpUrl(raw);
});

// 站点名若已包含作者名（如 "洛溪Roche's Blog" 含 "洛溪Roche"），则不再单独展示作者行，避免重复
const showAuthor = computed(() => {
  const site = siteName.value.trim();
  const author = authorName.value.trim();
  if (!site || !author || author === "博主") return false;
  return !site.includes(author);
});

// 极简社交链接：复用 friend_links（结构 {name,url}），取前 3 个
const socialLinks = computed<FriendLink[]>(() => {
  const raw = settingsStore.getSetting("friend_links");
  if (!raw) {
    return [{ name: "GitHub", url: "https://github.com/" }];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item?.name && item?.url).slice(0, 3);
    }
  } catch {
    return [];
  }
  return [];
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

usePageSeo({
  title: computed(() => siteName.value),
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
  color: var(--color-category);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  backdrop-filter: blur(8px);
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
}

.welcome-bio {
  max-width: 480px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin: 0;
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
  border: 1px solid var(--border-color);
  backdrop-filter: blur(8px);
  text-decoration: none;
  font-size: 14px;
  transition:
    color 0.3s,
    border-color 0.3s,
    box-shadow var(--transition-bounce),
    transform var(--transition-bounce);
}

.welcome-link:hover {
  color: var(--color-category);
  border-color: var(--color-category);
  box-shadow: var(--shadow-glow);
  transform: translateY(-1px);
}

/* ===== 单一 CTA ===== */
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
  color: var(--bg-card);
  background: var(--color-accent);
  text-decoration: none;
  transition:
    box-shadow var(--transition-bounce),
    transform var(--transition-bounce);
}

.enter-btn:hover {
  box-shadow: var(--shadow-glow);
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
