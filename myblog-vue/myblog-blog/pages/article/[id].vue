<template>
  <div class="article-detail">
    <!-- 阅读进度条 -->
    <div class="reading-progress" aria-hidden="true">
      <div class="reading-progress-bar" :style="{ width: `${readingProgress}%` }"></div>
    </div>

    <div v-if="articlePending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      加载中...
    </div>
    <div v-else-if="article" class="article-content">
      <nav class="breadcrumb">
        <NuxtLink to="/">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          首页
        </NuxtLink>
        <span class="breadcrumb-sep">/</span>
        <NuxtLink :to="`/category/${article.type.id}`">{{ article.type.typeName }}</NuxtLink>
        <span class="breadcrumb-sep">/</span>
        <span class="breadcrumb-current">{{ article.title }}</span>
      </nav>

      <!-- 统合卡片：文章 + 评论区 -->
      <div class="article-card-wrap">
        <article class="article">
          <header class="article-header">
            <h1>{{ article.title }}</h1>
            <div class="article-meta">
              <span class="author meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                {{ siteAuthor }}
              </span>
              <time class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ formatDateTime(article.createdAt) }}
              </time>
              <span class="views meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {{ article.viewCount }} 阅读
              </span>
              <span class="read-time meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ readTime }}
              </span>
            </div>
            <p v-if="article.summary" class="article-summary">{{ article.summary }}</p>
            <div class="article-tags">
              <NuxtLink class="category" :to="`/category/${article.type.id}`">
                {{ article.type.typeName }}
              </NuxtLink>
              <NuxtLink
                v-for="tag in article.labels"
                :key="tag.id"
                class="tag"
                :to="`/tag/${tag.id}`"
              >
                {{ tag.labelName }}
              </NuxtLink>
            </div>
          </header>

          <div v-if="article.coverImage" class="cover-image">
            <NuxtImg
              :src="detailCoverSrc"
              :alt="article.title"
              loading="lazy"
              decoding="async"
              class="cover-img"
              :class="{ 'cover-fallback': detailCoverFailed }"
              @error="handleDetailCoverError"
            />
          </div>

          <div class="article-body" v-html="renderContent"></div>
        </article>

        <hr class="card-divider" />

        <div class="comments-section">
          <div class="comments-header">
            <h3>评论 ({{ commentPagination.total }})</h3>
            <el-radio-group v-model="commentSort" size="small" @change="handleSortChange">
              <el-radio-button value="hottest">最热</el-radio-button>
              <el-radio-button value="latest">最新</el-radio-button>
            </el-radio-group>
          </div>
          <div class="comment-form">
            <el-form @submit.prevent="handleComment">
              <div class="comment-form-row">
                <el-input v-model="commentForm.authorName" placeholder="您的姓名 *" class="form-name" />
                <el-input v-model="commentForm.authorEmail" placeholder="您的邮箱" class="form-email" />
                <el-input v-model="commentForm.authorUrl" placeholder="https://（选填）" class="form-url" />
              </div>
              <div class="comment-textarea-wrap">
                <el-input
                  ref="commentTextareaRef"
                  v-model="commentForm.content"
                  type="textarea"
                  placeholder="写下您的评论..."
                  :rows="3"
                />
                <button type="button" class="emoji-btn" title="插入表情" @click="emojiOpen = !emojiOpen">😊</button>
                <div v-if="emojiOpen" class="emoji-picker">
                  <div class="emoji-tabs">
                    <button :class="{ active: emojiTab === 'emoji' }" type="button" @click="emojiTab = 'emoji'">Emoji</button>
                    <button :class="{ active: emojiTab === 'kaomoji' }" type="button" @click="emojiTab = 'kaomoji'">颜文字</button>
                  </div>
                  <div v-if="emojiTab === 'emoji'" class="emoji-grid">
                    <button
                      v-for="emoji in emojiList"
                      :key="emoji"
                      type="button"
                      class="emoji-item"
                      @click="insertEmoji(emoji)"
                    >{{ emoji }}</button>
                  </div>
                  <div v-else class="kaomoji-grid">
                    <button
                      v-for="kao in kaomojiList"
                      :key="kao"
                      type="button"
                      class="kaomoji-item"
                      @click="insertEmoji(kao)"
                    >{{ kao }}</button>
                  </div>
                </div>
              </div>
              <el-button type="primary" native-type="submit" :loading="submitting" class="submit-btn">
                发表评论
              </el-button>
            </el-form>
          </div>

          <div class="comments-list">
            <BlogComment
              v-for="comment in comments"
              :key="comment.id"
              :comment="comment"
              @reply-submitted="refreshComments"
            />

            <el-empty v-if="!comments.length" description="暂无评论，欢迎留下第一条讨论" />
          </div>

          <div v-if="commentPagination.total > commentPagination.pageSize" class="comments-pagination">
            <el-pagination
            v-model:current-page="commentPagination.page"
            v-model:page-size="commentPagination.pageSize"
            layout="prev, pager, next"
            :total="commentPagination.total"
            :pager-count="5"
            background
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
    </div>
    <div v-else class="not-found">文章不存在</div>

    <aside v-if="article" class="quick-nav">
      <el-button class="quick-btn" type="primary" plain @click="scrollToTop">返回顶部</el-button>
      <div v-if="tocItems.length" class="toc">
        <h4>目录</h4>
        <ul>
          <li v-for="item in tocItems" :key="item.id" :class="`level-${item.level}`">
            <button
              type="button"
              :class="{ active: activeTocId === item.id }"
              @click="scrollToHeading(item.id)"
            >{{ item.text }}</button>
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { Loading } from "@element-plus/icons-vue";
import { articleApi, commentApi } from "~/api";
import type { Article, Comment as CommentType, PaginatedResponse } from "~/types";
import { formatDateTime, estimateReadTime } from "~/utils/format";
import { stripHtml, truncateText } from "~/utils/seo";
import { getWebpUrl, normalizeAssetUrl, normalizeContentUrls } from "~/utils/image";

const route = useRoute();
const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();

await settingsStore.ensureSettings();
await bloggerStore.ensureProfile();

// 详情页封面：优先 WebP 主图，失败回退原图；localhost 前缀归一化为相对路径
const detailCoverFailed = ref(false);
const detailCoverSrc = computed(() => {
  const raw = normalizeAssetUrl(article.value?.coverImage);
  if (detailCoverFailed.value || !raw) {
    return raw;
  }
  return getWebpUrl(raw);
});

const handleDetailCoverError = () => {
  detailCoverFailed.value = true;
};

// 正文渲染：将开发环境的 localhost 图片 URL 归一化，手机/局域网访问可正常加载
const renderContent = computed(() =>
  normalizeContentUrls(article.value?.content || ""),
);

const articleId = computed(() => Number(route.params.id));
const submitting = ref(false);
const emojiOpen = ref(false);
const emojiTab = ref<"emoji" | "kaomoji">("emoji");
const commentTextareaRef = ref<any>(null);
const tocItems = ref<Array<{ id: string; text: string; level: number }>>([]);

const emojiList = [
  "😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","😉","😌","😍","🥰","😘","😗","😋","😛","😜","🤪",
  "😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡",
  "👍","👎","👏","🙌","🤝","💪","👀","🧠","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💖","💗",
  "🔥","⭐","✨","🎉","🎊","🙏","💯","✅","❌","❓","❗","💡","📌","🔗","💻","📱","🖥️","⌨️","🎵","🌈",
];

const kaomojiList = [
  "(｡･ω･｡)","(◕‿◕)","(◠‿◠)","(≧◡≦)","(⌒‿⌒)","(＾▽＾)","(◍•ᴗ•◍)","(づ｡◕‿‿◕｡)づ",
  "(╥_╥)","(╯︵╰,)","(╥﹏╥)","(个_个)","(¬_¬)","(ーー;)","(￣ω￣)","(＾～＾)",
  "(╯°□°）╯︵ ┻━┻","┐(￣ヘ￣)┌","¯\\_(ツ)_/¯","( ´ ▽ ` )ﾉ","(☞ﾟヮﾟ)☞",
  "( ͡° ͜ʖ ͡°)","(⌐■_■)","(＃￣0￣)","(˘▽˘)っ♨","(^_−)☆","(•̀ᴗ•́)و","ರ_ರ","(ᗒᗣᗕ)՞",
];

const insertEmoji = (text: string) => {
  commentForm.value.content += text;
  emojiOpen.value = false;
};
const commentSort = ref<"latest" | "hottest">("hottest");
const commentPagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
});

const commentForm = ref({
  authorName: "",
  authorEmail: "",
  authorUrl: "",
  content: "",
});

// localStorage key for remembering visitor comment info
const COMMENT_STORAGE_KEY = "blog_comment_author";

// Load saved comment author info from localStorage
const loadSavedCommentInfo = () => {
  if (!process.client) return;
  try {
    const saved = localStorage.getItem(COMMENT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      commentForm.value.authorName = parsed.name || "";
      commentForm.value.authorEmail = parsed.email || "";
      commentForm.value.authorUrl = parsed.url || "";
    }
  } catch {
    // ignore parse errors
  }
};

// Save comment author info to localStorage
const saveCommentInfo = () => {
  if (!process.client) return;
  try {
    localStorage.setItem(
      COMMENT_STORAGE_KEY,
      JSON.stringify({
        name: commentForm.value.authorName,
        email: commentForm.value.authorEmail,
        url: commentForm.value.authorUrl,
      }),
    );
  } catch {
    // ignore storage errors
  }
};

const emptyCommentPage = (): PaginatedResponse<CommentType> => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: 10,
});

const { data: article, pending: articlePending } = await useAsyncData(
  () => `article-${articleId.value}`,
  async () => {
    if (!articleId.value) {
      return null;
    }

    const response = await articleApi.getDetail(articleId.value);
    return response.data as Article;
  },
  {
    watch: [articleId],
    default: () => null,
  },
);

const { data: commentPage, refresh: refreshComments } = await useAsyncData(
  () => `comments-${articleId.value}-${commentSort.value}-${commentPagination.value.page}`,
  async () => {
    if (!articleId.value) {
      return emptyCommentPage();
    }

    const response = await commentApi.getList({
      articleId: articleId.value,
      page: commentPagination.value.page,
      pageSize: commentPagination.value.pageSize,
      status: "approved",
      sortBy: commentSort.value,
      topLevelOnly: true,
    });

    return response.data;
  },
  {
    watch: [articleId, commentSort, () => commentPagination.value.page],
    default: emptyCommentPage,
  },
);

const normalizeCommentTree = (list: CommentType[]): CommentType[] => {
  return list.map((item) => ({
    ...item,
    createdAt: item.createdAt || item.createAt || "",
    replies: item.replies ? normalizeCommentTree(item.replies) : [],
  }));
};

const comments = computed(() => normalizeCommentTree(commentPage.value.list));
const siteAuthor = computed(() => bloggerStore.nickname() || "博主");
const readTime = computed(() => estimateReadTime(article.value?.content || ""));

watchEffect(() => {
  commentPagination.value.total = commentPage.value.total;
});

const buildToc = async () => {
  await nextTick();
  const headingNodes = document.querySelectorAll(".article-body h1, .article-body h2, .article-body h3");
  tocItems.value = Array.from(headingNodes)
    .map((node, index) => {
      const text = node.textContent?.trim() || "";
      if (!text) {
        return null;
      }

      const id = `toc-${index + 1}`;
      node.setAttribute("id", id);
      return {
        id,
        text,
        level: Number(node.tagName.replace("H", "")),
      };
    })
    .filter((item): item is { id: string; text: string; level: number } => item !== null);
};

const highlightCodeBlocks = async () => {
  await nextTick();
  const blocks = document.querySelectorAll(".article-body pre code");
  if (!blocks.length) return;
  try {
    // 根据主题动态加载 highlight.js 样式（暗色使用 atom-one-dark）
    const isDark = document.documentElement.classList.contains("dark");
    await import(
      isDark
        ? "highlight.js/styles/atom-one-dark.css"
        : "highlight.js/styles/github.css"
    );
    const hljs = (await import("highlight.js")).default;
    blocks.forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });
  } catch {
    // highlight.js 加载失败不影响页面渲染
  }
};

const refreshArticleEnhancements = async () => {
  if (!process.client || !article.value) {
    return;
  }

  await Promise.all([buildToc(), highlightCodeBlocks()]);
};

const handleComment = async () => {
  if (!commentForm.value.authorName || !commentForm.value.content) {
    ElMessage.warning("请填写姓名和评论内容");
    return;
  }

  submitting.value = true;
  try {
    await commentApi.create({
      articleId: articleId.value,
      authorName: commentForm.value.authorName,
      authorEmail: commentForm.value.authorEmail,
      authorUrl: commentForm.value.authorUrl || undefined,
      content: commentForm.value.content,
    });
    ElMessage.success("评论已提交，感谢您的分享。经审核通过后即可显示。");
    saveCommentInfo();
    commentForm.value.content = "";
    await refreshComments();
  } catch {
    ElMessage.error("评论失败");
  } finally {
    submitting.value = false;
  }
};

const handleSortChange = () => {
  commentPagination.value.page = 1;
};

const handlePageChange = (page: number) => {
  commentPagination.value.page = page;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ===== 阅读进度 + 目录高亮 =====
const readingProgress = ref(0);
const activeTocId = ref("");
let scrollHandler: (() => void) | null = null;

const updateReadingProgress = () => {
  if (!process.client) return;

  const doc = document.documentElement;
  const total = doc.scrollHeight - window.innerHeight;
  readingProgress.value = total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0;

  // 目录高亮：找到当前视口内的标题
  let current: string = "";
  const tocElements = document.querySelectorAll(".article-body h1, .article-body h2, .article-body h3");
  tocElements.forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.top <= 120) {
      current = node.getAttribute("id") || "";
    }
  });
  activeTocId.value = current;
};

const scrollToHeading = (id: string) => {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    activeTocId.value = id;
  }
};

onMounted(async () => {
  loadSavedCommentInfo();
  await refreshArticleEnhancements();
  updateReadingProgress();
  scrollHandler = () => updateReadingProgress();
  window.addEventListener("scroll", scrollHandler, { passive: true });
  window.addEventListener("resize", scrollHandler, { passive: true });
});

onBeforeUnmount(() => {
  if (scrollHandler) {
    window.removeEventListener("scroll", scrollHandler);
    window.removeEventListener("resize", scrollHandler);
  }
});

watch(articleId, () => {
  commentPagination.value.page = 1;
});

watch(
  article,
  async () => {
    await refreshArticleEnhancements();
  },
  { flush: "post" },
);

onMounted(async () => {
  loadSavedCommentInfo();
  await refreshArticleEnhancements();
});

usePageSeo({
  title: computed(() => article.value?.title || "文章详情"),
  description: computed(
    () =>
      article.value?.summary ||
      truncateText(stripHtml(article.value?.content || ""), 160) ||
      "查看博客文章详情。",
  ),
  image: computed(() => article.value?.coverImage),
  type: "article",
  keywords: computed(() => article.value?.labels.map((item) => item.labelName).join(",")),
  publishedTime: computed(() => article.value?.createdAt),
  modifiedTime: computed(() => article.value?.updatedAt || article.value?.createdAt),
  articleTags: computed(() => article.value?.labels.map((item) => item.labelName)),
});

// JSON-LD 结构化数据（BlogPosting）
useArticleJsonLd(article as Ref<Article | null>);
</script>

<style lang="scss" scoped>
.article-detail {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
}

.not-found {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.breadcrumb {
  margin-bottom: 20px;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: var(--bg-card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-light);
  border-radius: 10px;
  font-size: 14px;
}

.breadcrumb a {
  color: var(--text-secondary);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;
}

.breadcrumb a:hover {
  color: var(--color-accent);
}

.breadcrumb-sep {
  color: var(--text-muted);
  font-size: 12px;
  user-select: none;
}

.breadcrumb-current {
  color: var(--text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}

/* ===== 统合卡片 ===== */
.article-card-wrap {
  background: var(--bg-card);
  backdrop-filter: blur(16px) saturate(130%);
  -webkit-backdrop-filter: blur(16px) saturate(130%);
  border: 1px solid var(--border-light);
  border-radius: 14px;
  padding: 36px 40px;
  box-shadow: var(--shadow-card);
}

.card-divider {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 32px 0 24px;
}

.article-header {
  margin-bottom: 30px;
}

.article-header h1 {
  font-size: 32px;
  color: var(--text-primary);
  margin-bottom: 15px;
  line-height: 1.35;
  text-shadow: var(--text-shadow-on-bg);
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  color: var(--text-muted);
  margin-bottom: 15px;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  line-height: 24px;
}

.views,
.read-time {
  font-variant-numeric: tabular-nums;
}

.article-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.article-summary {
  margin: 0 0 15px;
  color: var(--text-secondary);
  line-height: 1.8;
  background: var(--bg-card);
  backdrop-filter: blur(8px);
  border-left: 4px solid var(--color-accent);
  padding: 10px 12px;
  border-radius: 6px;
}

.category,
.tag {
  text-decoration: none;
  font-size: 14px;
}

.category {
  background: rgba(15, 118, 110, 0.1);
  color: var(--color-accent);
  padding: 4px 12px;
  border-radius: 4px;
}

.tag {
  background: var(--color-accent-light);
  color: var(--color-accent);
  padding: 4px 12px;
  border-radius: 4px;
  opacity: 0.8;
}

.cover-image {
  margin: 30px 0;
  text-align: center;
}

.cover-img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.article-body {
  line-height: 1.9;
  color: var(--text-primary);
  margin-bottom: 0;
  font-size: 16px;
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  display: block;
  margin: 20px auto;
}

.article-body :deep(p) {
  margin-bottom: 1.2em;
}

.article-body :deep(blockquote) {
  border-left: 4px solid var(--color-accent);
  padding: 8px 16px;
  margin: 16px 0;
  background: var(--bg-hover);
  border-radius: 0 8px 8px 0;
  color: var(--text-secondary);
}

.article-body :deep(a) {
  color: var(--color-link);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.article-body :deep(h2),
.article-body :deep(h3),
.article-body :deep(h4) {
  margin-top: 2em;
  margin-bottom: 0.8em;
  line-height: 1.35;
}

.article-body :deep(pre) {
  background: var(--bg-code);
  color: var(--text-primary);
  border-radius: 8px;
  overflow: auto;
  padding: 14px;
  margin: 14px 0;
}

.article-body :deep(code) {
  font-family: "Fira Code", "Consolas", monospace;
}

.comments-section {
  /* 已纳入统合卡片内部 */
  position: static;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.comments-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.comment-form {
  margin-bottom: 28px;
}

/* 表单三列布局 */
.comment-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

/* 评论区文本域 + emoji 按钮 */
.comment-textarea-wrap {
  position: relative;
  margin-bottom: 14px;
}

.comment-textarea-wrap :deep(.el-textarea__inner) {
  padding-right: 40px;
}

.emoji-btn {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: var(--bg-hover);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 2;
}

.emoji-btn:hover {
  background: var(--border-light);
}

/* Emoji 选择器 */
.emoji-picker {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  width: 320px;
  max-height: 260px;
  background: var(--bg-card);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: var(--shadow-elevated);
  overflow-y: auto;
  z-index: 10;
  padding: 12px;
}

.emoji-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: 8px;
}

.emoji-tabs button {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.emoji-tabs button.active,
.emoji-tabs button:hover {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
}

.emoji-item {
  border: none;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: background 0.15s;
  line-height: 1.4;
  text-align: center;
}

.emoji-item:hover {
  background: var(--bg-hover);
}

.kaomoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.kaomoji-item {
  border: 1px solid var(--border-light);
  background: var(--bg-hover);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.15s;
}

.kaomoji-item:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.submit-btn {
  margin-top: 4px;
}

.quick-nav {
  position: fixed;
  right: 32px;
  bottom: 32px;
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-btn {
  align-self: flex-end;
}

.toc {
  border: 1px solid var(--border-light);
  background: var(--bg-backdrop);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border-radius: 12px;
  padding: 16px;
  box-shadow: var(--shadow-card);
}

.toc h4 {
  margin-bottom: 10px;
}

.toc ul {
  list-style: none;
  display: grid;
  gap: 8px;
}

.toc button {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  padding: 4px 8px;
  border-radius: 6px;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background-color 0.2s, color 0.2s;
}

.toc button:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toc button.active {
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-weight: 600;
}

.toc .level-2 {
  padding-left: 12px;
}

.toc .level-3 {
  padding-left: 24px;
}

/* ===== 阅读进度条 ===== */
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 1100;
  pointer-events: none;
}

.reading-progress-bar {
  height: 100%;
  width: 0;
  background: linear-gradient(90deg, var(--color-accent), var(--color-info));
  border-radius: 0 2px 2px 0;
  transition: width 0.1s linear;
}

@media (max-width: 1200px) {
  .quick-nav {
    display: none;
  }
}

@media (max-width: 768px) {
  .article-card-wrap {
    padding: 20px 16px;
    border-radius: 0;
    border-left: none;
    border-right: none;
    margin-left: -20px;
    margin-right: -20px;
  }

  .comment-form-row {
    grid-template-columns: 1fr;
  }

  .emoji-picker {
    width: 260px;
    right: -40px;
  }

  .comments-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
