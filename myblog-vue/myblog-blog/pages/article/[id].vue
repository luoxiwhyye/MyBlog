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
        <NuxtLink to="/home">
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
              <time class="meta-item" :title="formatDateTime(article.createdAt)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {{ formatDate(article.createdAt) }}
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
            <p v-if="article.summary" class="article-summary">{{ markdownToPlain(article.summary) }}</p>
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
            <img
              :src="detailCoverSrc"
              :srcset="detailCoverSrcSet"
              :sizes="detailCoverSizes"
              :alt="article.title"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              class="cover-img"
              :class="{ 'cover-fallback': detailCoverFailed }"
              @error="handleDetailCoverError"
            />
          </div>

          <div class="article-toolbar">
            <ArticleReadingSettings v-model="readingPrefs" />
          </div>

          <div class="article-body" v-html="renderContent" :style="articleBodyStyle"></div>
        </article>

        <section v-if="relatedArticles.length" class="related-articles">
          <div class="related-header">
            <h3 class="related-title">相关文章</h3>
          </div>
          <div class="related-list">
            <NuxtLink
              v-for="(item, ri) in relatedArticles"
              :key="item.id"
              :to="`/article/${item.id}`"
              class="related-item"
              v-reveal="ri * 40"
              :aria-label="item.title"
            >
              <div class="related-cover">
                <img
                  v-if="item.coverImage"
                  :src="getWebpUrl(normalizeAssetUrl(item.coverImage))"
                  :alt="item.title"
                  loading="lazy"
                  decoding="async"
                />
                <div v-else class="related-cover-fallback">{{ item.type.typeName }}</div>
              </div>
              <div class="related-info">
                <span class="related-cat">{{ item.type.typeName }}</span>
                <h4 class="related-item-title">{{ item.title }}</h4>
                <time class="related-date">{{ formatDate(item.createdAt) }}</time>
              </div>
            </NuxtLink>
          </div>
        </section>

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
            <el-form ref="commentFormRef" :model="commentForm" :rules="commentRules" @submit.prevent="handleComment">
              <div class="comment-form-row">
                <el-form-item prop="authorName" class="form-name">
                  <el-input v-model="commentForm.authorName" placeholder="您的姓名 *" />
                </el-form-item>
                <el-form-item prop="authorEmail" class="form-email">
                  <el-input v-model="commentForm.authorEmail" placeholder="您的邮箱 *" />
                </el-form-item>
                <el-form-item class="form-url">
                  <el-input v-model="commentForm.authorUrl" placeholder="https://（选填）" />
                </el-form-item>
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

    <!-- 目录侧栏（保留）：仅在正文存在标题时占用右栏，避免空抽屉造成孤立感 -->
    <aside v-if="article && tocItems.length" class="quick-nav">
      <div class="toc">
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

    <!-- 可滚动区域可见时的圆形“返回顶部”方向按钮（悬浮，不挤压文章空间） -->
    <button
      v-if="article && showBackTop"
      class="back-top-btn"
      type="button"
      aria-label="返回顶部"
      title="返回顶部"
      @click="scrollToTop"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { Loading } from "@element-plus/icons-vue";
import { articleApi, commentApi } from "~/api";
import type { Article, Comment as CommentType, PaginatedResponse } from "~/types";
import { formatDate, formatDateTime, estimateReadTime } from "~/utils/format";
import { stripHtml, truncateText } from "~/utils/seo";
import { buildSrcSet, getWebpUrl, normalizeAssetUrl } from "~/utils/image";
import { markdownToPlain, renderArticleContent } from "~/utils/markdown";

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

// 详情页封面是 LCP 目标：用响应式 srcset 按容器宽度选图 + 高优先级加载
const detailCoverSrcSet = computed(() => buildSrcSet(article.value?.coverImage).srcset);
const detailCoverSizes = computed(() => "(max-width: 900px) 100vw, 900px");

// 正文渲染：自动识别 Markdown/HTML 并渲染，同时归一化 localhost 图片 URL
const renderContent = computed(() =>
  renderArticleContent(article.value?.content || ""),
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

const commentFormRef = ref<any>(null);

// 姓名、邮箱均为必填；邮箱还需为合法格式
const commentRules = {
  authorName: [{ required: true, message: "请输入姓名", trigger: "blur" }],
  authorEmail: [
    { required: true, message: "请输入邮箱", trigger: "blur" },
    { type: "email", message: "请输入有效的邮箱地址", trigger: "blur" },
  ],
};

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

// 相关文章推荐：同分类 + 排除当前文章（客户端再过滤，前端无需扩展 API）
const { data: relatedArticles } = await useAsyncData(
  () => `related-${articleId.value}`,
  async () => {
    const current = article.value;
    if (!current) return [];
    try {
      const res = await articleApi.getList({
        page: 1,
        pageSize: 5,
        status: "published",
        typeId: current.type.id,
      });
      return (res.data.list || [])
        .filter((a) => a.id !== current.id)
        .slice(0, 4);
    } catch {
      return [];
    }
  },
  { watch: [article], default: () => [] },
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
  const preBlocks = document.querySelectorAll<HTMLPreElement>(".article-body pre");
  if (!preBlocks.length) return;
  try {
    // 根据主题动态加载 highlight.js 样式（暗色使用 atom-one-dark）
    const isDark = document.documentElement.classList.contains("dark");
    await import(
      isDark
        ? "highlight.js/styles/atom-one-dark.css"
        : "highlight.js/styles/github.css"
    );
    const hljs = (await import("highlight.js")).default;

    preBlocks.forEach((pre) => {
      // 已被增强过的代码块跳过（避免重复包裹）
      if (pre.closest(".code-block")) return;

      let code = pre.querySelector("code");
      if (!code) {
        code = document.createElement("code");
        code.textContent = pre.textContent || "";
        pre.textContent = "";
        pre.appendChild(code);
      }
      hljs.highlightElement(code as HTMLElement);

      // 语言名（来自 markdown-it fence 输出的 language-xxx class）
      const langMatch = code.className.match(/language-([\w-]+)/);
      const lang = langMatch?.[1] || "code";

      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      wrapper.dataset.codeBlock = "";

      // 头部：语言标签 + 复制按钮
      const header = document.createElement("div");
      header.className = "code-block-header";
      const langSpan = document.createElement("span");
      langSpan.className = "code-lang";
      langSpan.textContent = lang;
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "code-copy";
      copyBtn.setAttribute("aria-label", "复制代码");
      copyBtn.textContent = "复制";
      header.appendChild(langSpan);
      header.appendChild(copyBtn);

      // 主体：行号列 + 代码（行号列固定，代码列可横向滚动）
      const body = document.createElement("div");
      body.className = "code-block-body";
      const lines = document.createElement("span");
      lines.className = "code-lines";
      lines.setAttribute("aria-hidden", "true");
      const lineCount = (code.textContent || "").split("\n").length;
      lines.textContent = Array.from({ length: lineCount }, (_, i) => i + 1).join("\n");
      body.appendChild(lines);

      pre.before(wrapper);
      body.appendChild(pre);
      wrapper.appendChild(header);
      wrapper.appendChild(body);
    });
  } catch {
    // highlight.js 加载失败不影响页面渲染
  }
};

const copyText = async (text: string, btn: HTMLButtonElement) => {
  const original = btn.dataset.originalText || "复制";
  btn.dataset.originalText = original;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // 兼容旧浏览器：临时 textarea + execCommand
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    btn.textContent = "已复制";
    btn.classList.add("copied");
  } catch {
    btn.textContent = "复制失败";
  }
  window.setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove("copied");
  }, 1500);
};

// 事件委托：点击任意代码块的复制按钮
const handleCodeCopyClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const btn = target.closest<HTMLButtonElement>(".code-copy");
  if (!btn) return;
  const wrapper = btn.closest<HTMLElement>(".code-block");
  const code = wrapper?.querySelector("code");
  if (!code) return;
  copyText(code.textContent || "", btn);
};

const refreshArticleEnhancements = async () => {
  if (!process.client || !article.value) {
    return;
  }

  await Promise.all([buildToc(), highlightCodeBlocks()]);
};

const handleComment = async () => {
  if (!commentForm.value.content) {
    ElMessage.warning("请填写评论内容");
    return;
  }
  const valid = await commentFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    await commentApi.create({
      articleId: articleId.value,
      authorName: commentForm.value.authorName,
      authorEmail: commentForm.value.authorEmail,
      authorUrl: commentForm.value.authorUrl || undefined,
      content: commentForm.value.content,
    });
    ElMessage.success("评论已提交，审核通过后将显示，您也会收到邮件通知。");
    saveCommentInfo();
    commentForm.value.content = "";
    await refreshComments();
  } catch (err: any) {
    // 优先展示后端返回的具体错误原因（如邮箱格式不正确/内容校验失败）
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "评论失败，请稍后重试";
    ElMessage.error(msg);
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

// ===== 阅读设置（字号 / 行距）=====
interface ReadingPrefs {
  fontSize: number;
  lineHeight: number;
}

const readingPrefs = ref<ReadingPrefs>({ fontSize: 17, lineHeight: 1.75 });

// 将设置映射为 CSS 变量，作用到正文（默认值与现状一致，避免视觉回归）
const articleBodyStyle = computed(() => ({
  "--article-font-size": `${readingPrefs.value.fontSize}px`,
  "--article-line-height": String(readingPrefs.value.lineHeight),
}));

// ===== 阅读进度 + 目录高亮 + 返回顶部显隐 =====
const readingProgress = ref(0);
const activeTocId = ref("");
const showBackTop = ref(false);
let scrollHandler: (() => void) | null = null;

const updateReadingProgress = () => {
  if (!process.client) return;

  const doc = document.documentElement;
  const total = doc.scrollHeight - window.innerHeight;
  readingProgress.value = total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0;

  // 滚动超过一定距离后显示返回顶部按钮
  showBackTop.value = window.scrollY > 320;

  // 目录高亮：找到当前视口内的标题（阈值与 sticky header 高度对齐，避免被遮挡）
  // 加 4px 容差，避免标题恰好停在 76px 偏移的浮点边界时高亮不切换
  const HEADER_OFFSET = 76;
  let current: string = "";
  const tocElements = document.querySelectorAll(".article-body h1, .article-body h2, .article-body h3");
  tocElements.forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.top <= HEADER_OFFSET + 4) {
      current = node.getAttribute("id") || "";
    }
  });
  activeTocId.value = current;
};

const scrollToHeading = (id: string) => {
  const target = document.getElementById(id);
  if (target) {
    // scroll-margin-top 已为标题预留 header 高度，scrollIntoView 会自动让标题避开 sticky header
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
  document.addEventListener("click", handleCodeCopyClick);
});

onBeforeUnmount(() => {
  if (scrollHandler) {
    window.removeEventListener("scroll", scrollHandler);
    window.removeEventListener("resize", scrollHandler);
  }
  document.removeEventListener("click", handleCodeCopyClick);
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

// 面包屑结构化数据（BreadcrumbList）
useBreadcrumbJsonLd([
  { name: "首页", url: "/home" },
  ...(article.value?.type
    ? [{ name: article.value.type.typeName, url: `/category/${article.value.type.id}` }]
    : []),
  ...(article.value ? [{ name: article.value.title, url: `/article/${article.value.id}` }] : []),
]);
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.article-detail {
  max-width: 1280px;
  margin: 0 auto;
  position: relative;
  /* 非对称：左宽阅读 + 右粘性 TOC；无目录时 auto 列自然收起，文章占满宽度 */
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: $spacing-6;
  align-items: start;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary);
  grid-column: 1 / -1;
}

.not-found {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  grid-column: 1 / -1;
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
  backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
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
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  padding: $spacing-6 $spacing-8;
  box-shadow: var(--shadow-card);
}

.card-divider {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: $spacing-8 0 $spacing-6;
}

/* ===== 相关文章推荐 ===== */
.related-articles {
  margin-top: $spacing-8;
}

.related-header {
  margin-bottom: $spacing-5;
}

.related-title {
  margin: 0;
  font-size: $font-size-lg;
  font-weight: 700;
  color: var(--text-primary);
}

.related-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $spacing-4;
}

.related-item {
  display: flex;
  gap: $spacing-4;
  padding: $spacing-4;
  border-radius: $border-radius-md;
  background: var(--bg-hover);
  border: 1px solid var(--border-light);
  text-decoration: none;
  transition:
    background-color $transition-fast,
    box-shadow var(--transition-bounce),
    transform var(--transition-bounce);
}

.related-item:hover {
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
  transform: translateY(-2px);
}

.related-cover {
  flex: 0 0 96px;
  height: 64px;
  border-radius: $border-radius-sm;
  overflow: hidden;
  background: var(--bg-code);
}

.related-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.related-cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-category);
  font-size: $font-size-sm;
  font-weight: 600;
}

.related-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.related-cat {
  color: var(--color-category);
  font-size: $font-size-sm;
  font-weight: 600;
}

.related-item-title {
  margin: 0;
  color: var(--text-primary);
  font-size: $font-size-base;
  font-weight: 500;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.related-date {
  color: var(--text-muted);
  font-size: $font-size-xs;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .related-list {
    grid-template-columns: 1fr;
  }
}

.article-header {
  margin-bottom: 30px;
}

.article-header h1 {
  font-size: 32px;
  color: var(--text-primary);
  margin-bottom: 15px;
  line-height: 1.35;
  text-shadow: var(--text-shadow-on-bg), var(--text-glow);
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
  backdrop-filter: blur(var(--glass-blur));
  border-left: 4px solid var(--color-category);
  padding: 10px 12px;
  border-radius: 6px;
}

.category,
.tag {
  text-decoration: none;
  font-size: 14px;
}

.category {
  background: var(--color-category-soft);
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
  max-width: 900px;
  margin: 0 auto;
  line-height: var(--article-line-height, #{$line-height-loose});
  color: var(--text-primary);
  margin-bottom: 0;
  font-size: var(--article-font-size, 17px);
}

/* 阅读设置工具栏：右对齐，位于正文上方 */
.article-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: $spacing-5;
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: $border-radius-base;
  display: block;
  margin: $spacing-6 auto;
}

.article-body :deep(p) {
  margin-block: 0 $spacing-6;
  line-height: var(--article-line-height, #{$line-height-relaxed});
}

.article-body :deep(blockquote) {
  border-left: 4px solid var(--color-category);
  padding: $spacing-3 $spacing-5;
  margin: $spacing-5 0;
  background: var(--bg-code);
  border-radius: 0 $border-radius-base $border-radius-base 0;
  color: var(--text-secondary);
}

/* 标题层级：字号随层级递减，建立可读性优先的节奏 */
/* 为 sticky header 预留高度：scrollIntoView 时标题自动避开 header 遮挡 */
.article-body :deep(h1),
.article-body :deep(h2),
.article-body :deep(h3),
.article-body :deep(h4) {
  scroll-margin-top: 76px;
}

.article-body :deep(h1) {
  font-size: 1.9rem;
  font-weight: 700;
  margin-block: $spacing-10 $spacing-5;
  line-height: $line-height-relaxed;
}

.article-body :deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  margin-block: $spacing-10 $spacing-4;
  line-height: $line-height-relaxed;
  border-bottom: 1px solid var(--border-light);
  padding-bottom: $spacing-2;
}

.article-body :deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-block: $spacing-8 $spacing-4;
  line-height: $line-height-relaxed;
}

.article-body :deep(h4) {
  font-size: 1.06rem;
  font-weight: 600;
  margin-block: $spacing-8 $spacing-3;
  line-height: $line-height-relaxed;
}

.article-body :deep(a) {
  color: var(--color-link);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: $spacing-4 0;
  padding-left: $spacing-6;
  line-height: $line-height-relaxed;
}

.article-body :deep(li) {
  margin-bottom: $spacing-2;
}

/* 表格：正文中的表格统一为可读的斑马纹样式 */
.article-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: $spacing-5 0;
  font-size: $font-size-sm;
  line-height: 1.6;
}

.article-body :deep(thead th) {
  text-align: left;
  font-weight: 600;
  color: var(--text-primary);
  background: var(--bg-hover);
  border-bottom: 2px solid var(--border-color);
  padding: $spacing-3 $spacing-4;
}

.article-body :deep(tbody td) {
  padding: $spacing-3 $spacing-4;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-secondary);
}

.article-body :deep(tbody tr:nth-child(even)) {
  background: var(--bg-hover);
}

.article-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: $spacing-8 0;
}

.article-body :deep(pre) {
  background: var(--bg-code);
  color: var(--text-primary);
  border-radius: $border-radius-base;
  overflow: auto;
  padding: $spacing-4;
  margin: $spacing-5 0;
  font-size: $font-size-sm;
  line-height: $line-height-normal;
}

.article-body :deep(code) {
  font-family: $font-family-code;
}

/* ===== 代码块（语言标签 + 行号 + 复制按钮）===== */
.article-body :deep(.code-block) {
  margin: $spacing-5 0;
  border: 1px solid var(--border-light);
  border-radius: $border-radius-base;
  overflow: hidden;
  background: var(--bg-code);
}

.article-body :deep(.code-block-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-2 $spacing-4;
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border-light);
}

.article-body :deep(.code-lang) {
  font-family: $font-family-code;
  font-size: $font-size-xs;
  color: var(--text-muted);
  text-transform: lowercase;
  letter-spacing: 0.02em;
}

.article-body :deep(.code-copy) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: $font-size-xs;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: color 0.2s, background-color 0.2s;
}

.article-body :deep(.code-copy:hover) {
  color: var(--color-accent);
  background: var(--color-accent-light);
}

.article-body :deep(.code-copy.copied) {
  color: var(--color-success);
}

.article-body :deep(.code-block-body) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: stretch;
}

.article-body :deep(.code-lines) {
  user-select: none;
  padding: $spacing-4 $spacing-3 $spacing-4 0;
  min-width: 44px;
  text-align: right;
  background: var(--bg-hover);
  border-right: 1px solid var(--border-light);
  color: var(--text-muted);
  font-family: $font-family-code;
  font-size: $font-size-sm;
  line-height: $line-height-normal;
  white-space: pre;
  overflow: hidden;
}

.article-body :deep(.code-block pre) {
  margin: 0;
  border-radius: 0;
  background: transparent;
  overflow-x: auto;
  padding: $spacing-4;
  line-height: $line-height-normal;
}

.article-body :deep(.code-block pre code) {
  background: transparent;
  padding: 0;
  font-size: $font-size-sm;
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
  gap: $spacing-3;
  margin-bottom: $spacing-3;
}

.comment-form-row :deep(.el-form-item) {
  margin-bottom: 0;
}

/* 错误提示改为绝对定位，避免把表单行顶高、也避免一触发就常驻占位 */
.comment-form-row :deep(.el-form-item__error) {
  position: absolute;
  top: calc(100% + 2px);
  left: 0;
  padding: 0;
  line-height: 1.3;
}

/* 每列预留底部空间容纳错误提示，防止被下一行遮盖 */
.comment-form-row :deep(.el-form-item) {
  padding-bottom: 16px;
}

/* 收起时不再因空白影响视觉：仅在移动端单列时收紧 */
@media (max-width: 640px) {
  .comment-form-row {
    grid-template-columns: 1fr;
  }
  .comment-form-row :deep(.el-form-item) {
    padding-bottom: 16px;
  }
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
  width: 380px;
  max-height: 300px;
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(150%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(150%);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  box-shadow: var(--shadow-elevated);
  overflow-y: auto;
  overflow-x: hidden; /* 宽面板下内容完整显示，此规则仅作兜底 */
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
  /* 限制单个长颜文字宽度并允许换行，避免撑破面板产生横向滚动 */
  max-width: 100%;
  word-break: break-all;
  overflow-wrap: anywhere;
}

.kaomoji-item:hover {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.submit-btn {
  margin-top: 4px;
}

.quick-nav {
  position: sticky;
  /* 首页 sticky header 高度约 60px + 安全间距，避免目录顶部被 header 遮挡 */
  top: 76px;
  grid-column: 2;
  width: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-self: start;
  /* 让右侧目录卡在长文中保持可滚动，减少“孤岛式”悬浮感 */
  /* 扣掉顶部 76px 与底部 24px 的占据，避免目录超出视口造成底部被裁 */
  max-height: calc(100vh - 76px - $spacing-6);
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* 悬浮圆形“返回顶部”方向按钮 — 不挤压文章空间 */
.back-top-btn {
  position: fixed;
  right: 28px;
  bottom: 28px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-backdrop);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
  color: var(--color-accent);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  z-index: 100;
}

.back-top-btn:hover {
  color: var(--color-category);
  border-color: var(--color-category);
  box-shadow: var(--shadow-glow);
  transform: translateY(-2px);
}

.back-top-btn:focus {
  outline: none;
}

.back-top-btn svg {
  pointer-events: none;
}

.toc {
  border: 1px solid var(--glass-border);
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  border-radius: var(--radius-card-lg);
  padding: $spacing-4;
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
  position: relative;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  padding: 4px 8px 4px 12px;
  border-radius: 6px;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}

/* 当前章节：左侧青绿指示条 + 浅底，随滚动跟随 */
.toc button.active {
  background: var(--color-accent-light);
  color: var(--color-accent);
  font-weight: 600;
  border-left: 2px solid var(--color-category);
}

.toc button:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toc li {
  position: relative;
}

.toc li.level-2 {
  padding-left: 10px;
}

.toc li.level-3 {
  padding-left: 20px;
}

.toc li.level-2::before,
.toc li.level-3::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  background: var(--border-light);
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
  background: linear-gradient(90deg, var(--color-category), var(--color-info));
  border-radius: 0 2px 2px 0;
  transition: width 0.1s linear;
}

@media (max-width: 1200px) {
  .article-detail {
    grid-template-columns: 1fr;
  }
  .article-content {
    grid-column: auto;
  }
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
    width: 320px;
    right: -40px;
  }

  .comments-header {
    flex-direction: column;
    align-items: flex-start;
  }

  /* 移动端 emoji 按钮提升到 44px 触摸目标 */
  .emoji-btn {
    width: 44px;
    height: 44px;
    right: 6px;
    bottom: 6px;
    font-size: 18px;
  }
}
</style>
