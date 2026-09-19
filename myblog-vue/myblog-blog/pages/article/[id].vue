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
              <!-- 阅读设置：作为元信息行的一个操作项靠右（原先单独占一整行，实测浪费 53/61px）。
                   仅桌面/平板保留在这里；≤768px 由底部操作栏接管，见 .mobile-bar-settings。 -->
              <ArticleReadingSettings v-model="readingPrefs" class="meta-settings" />
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

          <div class="article-body" v-html="renderContent" :style="articleBodyStyle"></div>
        </article>

        <!-- 上一篇 / 下一篇：按 id 排序取相邻，促内链留存与阅读连续性 -->
        <nav class="article-pagination" aria-label="文章导航">
          <NuxtLink
            v-if="adjacent.prev"
            :to="`/article/${adjacent.prev.id}`"
            class="pagination-card pagination-prev"
            :aria-label="'上一篇：' + adjacent.prev.title"
          >
            <span class="pagination-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              上一篇
            </span>
            <span class="pagination-title">{{ adjacent.prev.title }}</span>
            <time class="pagination-date">{{ formatDate(adjacent.prev.createdAt) }}</time>
          </NuxtLink>
          <span v-else class="pagination-card pagination-disabled pagination-prev">
            <span class="pagination-label">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
              上一篇
            </span>
            <span class="pagination-title">已是第一篇</span>
          </span>

          <NuxtLink
            v-if="adjacent.next"
            :to="`/article/${adjacent.next.id}`"
            class="pagination-card pagination-next"
            :aria-label="'下一篇：' + adjacent.next.title"
          >
            <span class="pagination-label">
              下一篇
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
            <span class="pagination-title">{{ adjacent.next.title }}</span>
            <time class="pagination-date">{{ formatDate(adjacent.next.createdAt) }}</time>
          </NuxtLink>
          <span v-else class="pagination-card pagination-disabled pagination-next">
            <span class="pagination-label">
              下一篇
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
            <span class="pagination-title">已是最后一篇</span>
          </span>
        </nav>

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
                  :src="relatedCoverSrc(item)"
                  :alt="item.title"
                  loading="lazy"
                  decoding="async"
                  @error="markRelatedCoverFailed(item.id)"
                />
                <div v-else class="related-cover-fallback">{{ relatedCoverLabel(item) }}</div>
              </div>
              <div class="related-info">
                <span class="related-cat">{{ relatedChip(item) }}</span>
                <h4 class="related-item-title">{{ item.title }}</h4>
                <time class="related-date">{{ formatDate(item.createdAt) }}</time>
              </div>
            </NuxtLink>
          </div>
        </section>

        <!-- 评论区：后台可对单篇文章下线（commentEnabled=false）→ 连分隔线一起隐藏，
             避免正文底部悬着一条多余横线 -->
        <hr v-if="commentsEnabled" class="card-divider" />

        <div v-if="commentsEnabled" class="comments-section">
          <div class="comments-header">
            <h3>评论 ({{ commentPagination.total }})</h3>
            <el-radio-group v-model="commentSort" size="small" @change="handleSortChange">
              <el-radio-button value="hottest">最热</el-radio-button>
              <el-radio-button value="latest">最新</el-radio-button>
            </el-radio-group>
          </div>
          <div class="comment-form">
            <!-- 回复目标提示：点某条评论的「回复」后表单就在下方（不跳动、不重进），
                 所以这里必须明确告知「正在回复谁」并给一个取消的出口。 -->
            <div v-if="replyTarget" class="reply-target-bar">
              <span class="reply-target-text">
                正在回复 <strong>@{{ replyTarget.authorName }}</strong>
              </span>
              <button type="button" class="reply-target-cancel" @click="cancelReply">取消回复</button>
            </div>
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
                <CommentInput
                  ref="commentInputRef"
                  v-model="commentForm.content"
                  placeholder="写下您的评论..."
                />
              </div>
              <el-checkbox v-model="commentForm.notifyEmail" class="comment-form-notify">
                {{ t('article.notifyReplyOnComment') }}
              </el-checkbox>
              <el-button type="primary" native-type="submit" :loading="submitting" class="submit-btn">
                {{ replyTarget ? '提交回复' : '发表评论' }}
              </el-button>
            </el-form>
          </div>

          <div class="comments-list">
            <BlogComment
              v-for="comment in comments"
              :key="comment.id"
              :comment="comment"
              @reply="startReply"
              @reply-submitted="refreshComments"
            />

            <EmptyState
              v-if="!comments.length"
              variant="plain"
              message="暂无评论，欢迎留下第一条讨论"
            />
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

    <!-- 移动端底部操作栏：目录 / 评论 / 顶部（仅 ≤768px 显示，移动特有交互） -->
    <nav v-if="article" class="mobile-bottom-bar" aria-label="快捷操作">
      <button type="button" class="mobile-bar-btn" @click="mobileTocOpen = true">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        <span>目录</span>
      </button>
      <button v-if="commentsEnabled" type="button" class="mobile-bar-btn" @click="scrollToComments">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>评论</span>
      </button>
      <!-- 阅读设置：移动端从元信息行移到这里（元信息行那段空间留给文字） -->
      <ArticleReadingSettings v-model="readingPrefs" variant="bar" class="mobile-bar-settings" />
      <button type="button" class="mobile-bar-btn" @click="scrollToTop">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
        <span>顶部</span>
      </button>
    </nav>

    <!-- 移动端目录抽屉（复用 side 栏 tocItems 数据） -->
    <Transition name="fade">
      <div v-if="article && mobileTocOpen" class="mobile-toc-mask" @click.self="mobileTocOpen = false">
        <div class="mobile-toc-sheet" role="dialog" aria-label="目录">
          <div class="mobile-toc-header">
            <h4>目录</h4>
            <button type="button" class="mobile-toc-close" aria-label="关闭目录" @click="mobileTocOpen = false">✕</button>
          </div>
          <ul v-if="tocItems.length" class="mobile-toc-list">
            <li
              v-for="item in tocItems"
              :key="item.id"
              :class="`level-${item.level}`"
            >
              <button
                type="button"
                :class="{ active: activeTocId === item.id }"
                @click="scrollToHeading(item.id); mobileTocOpen = false"
              >
                {{ item.text }}
              </button>
            </li>
          </ul>
          <p v-else class="mobile-toc-empty">本文暂无小标题</p>
        </div>
      </div>
    </Transition>

    <!-- 正文图片灯箱（Lightbox）：点击放大 + 缩放 + 关闭 + 图集切换 -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div
          v-if="lightbox.open"
          class="lightbox-overlay"
          role="dialog"
          aria-label="图片预览"
          @click.self="closeLightbox"
        >
          <button type="button" class="lightbox-close" aria-label="关闭预览" @click="closeLightbox">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <button
            v-if="lightbox.srcs.length > 1"
            type="button"
            class="lightbox-nav lightbox-prev"
            aria-label="上一张"
            @click="prevLightbox"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div class="lightbox-stage">
            <img
              :src="lightbox.srcs[lightbox.index]"
              :alt="'预览图 ' + (lightbox.index + 1)"
              class="lightbox-img"
              :class="{ 'lightbox-zoomed': lightbox.zoomed }"
              @click="toggleZoom"
            />
            <span v-if="lightbox.zoomed" class="lightbox-hint" aria-hidden="true">已放大（点击还原）</span>
          </div>
          <button
            v-if="lightbox.srcs.length > 1"
            type="button"
            class="lightbox-nav lightbox-next"
            aria-label="下一张"
            @click="nextLightbox"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <div v-if="lightbox.srcs.length > 1" class="lightbox-counter">{{ lightbox.index + 1 }} / {{ lightbox.srcs.length }}</div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { Loading } from "@element-plus/icons-vue";
import { articleApi, commentApi } from "~/api";
import type {
  Article,
  Comment as CommentType,
  PaginatedResponse,
  RelatedArticle,
} from "~/types";
import { formatDate, formatDateTime, estimateReadTime } from "~/utils/format";
import { stripHtml, truncateText } from "~/utils/seo";
import { buildSrcSet, getWebpUrl, normalizeAssetUrl } from "~/utils/image";
import { markdownToPlain, renderArticleContent } from "~/utils/markdown";
import CommentInput from "~/components/common/CommentInput.vue";

const route = useRoute();
const runtimeConfig = useRuntimeConfig();
const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();
// 评论区大部分文案仍是硬编码中文（既有状况），只有新增的邮件订阅勾选框走 i18n
const { t } = useI18n();

await settingsStore.ensureSettings();
await bloggerStore.ensureProfile();

// 详情页封面：优先 WebP 主图，失败回退原图
const {
  src: detailCoverSrc,
  failed: detailCoverFailed,
  onError: handleDetailCoverError,
} = useSmartImage(() => article.value?.coverImage, "full");

// 详情页封面是 LCP 目标：用响应式 srcset 按容器宽度选图 + 高优先级加载
const detailCoverSrcSet = computed(() => buildSrcSet(article.value?.coverImage).srcset);
const detailCoverSizes = computed(() => "(max-width: 900px) 100vw, 900px");

// 正文渲染：自动识别 Markdown/HTML 并渲染，同时归一化 localhost 图片 URL
const renderContent = computed(() =>
  renderArticleContent(article.value?.content || "", article.value?.contentFormat),
);

const articleId = computed(() => Number(route.params.id));
const submitting = ref(false);
// 评论输入框（简易富文本，标记文本序列化）
const commentInputRef = ref<any>(null);
const tocItems = ref<Array<{ id: string; text: string; level: number }>>([]);

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
  // 邮件订阅开关，**默认不勾**（不接收）。不写进 localStorage：名字 / 邮箱是
  // 「便于下次少填」的便利，而订阅是「同意收信」的意愿 —— 持久化会让回访者在
  // 不知情的情况下持续订阅。提交后也不重置，同一次会话里勾了就是勾了。
  notifyEmail: false,
});

const commentFormRef = ref<any>(null);

/**
 * 正在回复的目标评论（null = 发表顶层评论）。
 *
 * ⚠️ 回复表单**不再嵌在评论条目里** —— 子评论只有一半宽度，塞不下
 * 3 个输入框 + 富文本 + 勾选框 + 2 个按钮。现在统一用评论区顶部这个表单，
 * 只把「回复谁」记在这里，提交时带上 parentId / replyToId。
 * （parentId 会被后端规整到**顶层**，所以「回复谁」必须靠 replyToId 如实上报，
 *   否则被回复者在勾选了通知时收不到邮件。）
 */
const replyTarget = ref<CommentType | null>(null);

const startReply = (target: CommentType) => {
  replyTarget.value = target;
  // 表单就在评论列表上方；移动端长列表下可能不在视口内，滚过去并聚焦。
  // 等 nextTick 让提示条先渲染出来再滚，否则滚完位置还会被它顶下去。
  nextTick(() => {
    document.querySelector('.comment-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nextTick(() => commentInputRef.value?.focus?.());
  });
};

const cancelReply = () => {
  replyTarget.value = null;
  commentInputRef.value?.clear();
};

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

/**
 * 评论区是否开放。只有后端明确返回 false 才隐藏 —— 老接口不返回该字段时保持原行为。
 * 模板与取数都用它：关闭时连评论请求也不发（省掉一次必然看不到结果的请求）。
 */
const commentsEnabled = computed(() => article.value?.commentEnabled !== false);

// 相关推荐：后端按 共享标签 + 同分类 聚合评分（标签权重高、分类次之）
const { data: relatedArticles } = await useAsyncData(
  () => `related-${articleId.value}`,
  async () => {
    const current = article.value;
    if (!current) return [];
    try {
      const res = await articleApi.getRelated(articleId.value);
      return (res.data || [])
        .filter((a) => a.id !== current.id)
        .slice(0, 4);
    } catch {
      return [];
    }
  },
  { watch: [article], default: () => [] },
);

/**
 * 相关文章卡片上的说明文字：优先显示「共同标签」——它才是相关性的来源；
 * 仅靠同分类命中（无共享标签）时回退为分类名，避免出现空 chip。
 */
const relatedChip = (item: RelatedArticle): string =>
  item.sharedLabels?.length
    ? item.sharedLabels.join(" · ")
    : item.type?.typeName || "文章";

/** 无封面时的占位文案：只取第一个共同标签（占位框窄，长文案会被裁切） */
const relatedCoverLabel = (item: RelatedArticle): string =>
  item.sharedLabels?.[0] || item.type?.typeName || "文章";

// 相关推荐封面：主图变体缺失时回退原图。
// 这里是列表（一个个相关文章），所以用「失败 id 集合」代替 useSmartImage ——
// 组合式只能在 setup 顶层调用，不能放进 v-for。
const failedRelatedCovers = ref(new Set<number>());

const relatedCoverSrc = (item: RelatedArticle): string => {
  const raw = normalizeAssetUrl(item.coverImage);
  if (!raw || failedRelatedCovers.value.has(item.id)) {
    return raw;
  }
  return getWebpUrl(raw);
};

const markRelatedCoverFailed = (id: number) => {
  // Set 就地 add 不会触发响应式，要换一个新的
  const next = new Set(failedRelatedCovers.value);
  next.add(id);
  failedRelatedCovers.value = next;
};

// 上一篇 / 下一篇：按 id 排序取相邻（prev=小 id，next=大 id）
const { data: adjacent } = await useAsyncData(
  () => `adjacent-${articleId.value}`,
  async () => {
    if (!articleId.value) return { prev: null, next: null };
    try {
      const res = await articleApi.getAdjacent(articleId.value);
      return res.data;
    } catch {
      return { prev: null, next: null };
    }
  },
  { watch: [articleId], default: () => ({ prev: null, next: null }) },
);

const { data: commentPage, refresh: refreshComments } = await useAsyncData(
  () => `comments-${articleId.value}-${commentSort.value}-${commentPagination.value.page}`,
  async () => {
    if (!articleId.value) {
      return emptyCommentPage();
    }

    // 评论区已下线：不必再拉数据（列表为空，区块也不渲染）
    if (!commentsEnabled.value) {
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

// ===== 正文图片灯箱（Lightbox）=====
interface LightboxState {
  open: boolean;
  index: number;
  srcs: string[];
  zoomed: boolean;
}

const lightbox = reactive<LightboxState>({
  open: false,
  index: 0,
  srcs: [],
  zoomed: false,
});

let lightboxBodyScrollLocked = false;

// 收集正文图片 src 列表，并给图片标记索引供事件委托定位
const initImageLightbox = () => {
  if (!process.client || !article.value) return;
  const imgs = document.querySelectorAll<HTMLImageElement>(".article-body img");
  lightbox.srcs = Array.from(imgs)
    .map((img) => img.getAttribute("src") || "")
    .filter(Boolean);
  imgs.forEach((img, i) => {
    img.dataset.lightboxIndex = String(i);
    img.classList.add("lightbox-trigger");
  });
};

const openLightbox = (index: number) => {
  if (!lightbox.srcs.length || index < 0) return;
  lightbox.open = true;
  lightbox.index = index;
  lightbox.zoomed = false;
  if (!lightboxBodyScrollLocked) {
    document.body.style.overflow = "hidden";
    lightboxBodyScrollLocked = true;
  }
};

const closeLightbox = () => {
  lightbox.open = false;
  if (lightboxBodyScrollLocked) {
    document.body.style.overflow = "";
    lightboxBodyScrollLocked = false;
  }
};

const nextLightbox = () => {
  if (lightbox.srcs.length < 2) return;
  lightbox.index = (lightbox.index + 1) % lightbox.srcs.length;
};

const prevLightbox = () => {
  if (lightbox.srcs.length < 2) return;
  lightbox.index = (lightbox.index - 1 + lightbox.srcs.length) % lightbox.srcs.length;
};

const toggleZoom = () => {
  lightbox.zoomed = !lightbox.zoomed;
};

// 事件委托：点击正文图片打开灯箱
const handleLightboxClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.classList.contains("lightbox-trigger")) return;
  const idx = Number(target.dataset.lightboxIndex);
  if (!Number.isNaN(idx)) {
    openLightbox(idx);
  }
};

// 键盘：ESC 关闭，方向键切换
const handleLightboxKey = (e: KeyboardEvent) => {
  if (!lightbox.open) return;
  if (e.key === "Escape") {
    closeLightbox();
  } else if (e.key === "ArrowRight") {
    nextLightbox();
  } else if (e.key === "ArrowLeft") {
    prevLightbox();
  }
};

const refreshArticleEnhancements = async () => {
  if (!process.client || !article.value) {
    return;
  }

  await Promise.all([buildToc(), highlightCodeBlocks(), initImageLightbox()]);
};

const handleComment = async () => {
  // 按 trim 后判空：标记文本里的 `\n` 等不可见字符不算内容
  if (!commentForm.value.content.trim()) {
    ElMessage.warning("请填写评论内容");
    return;
  }
  const valid = await commentFormRef.value?.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    const target = replyTarget.value;
    await commentApi.create({
      articleId: articleId.value,
      // 两级扁平结构：回复任意层的评论，都挂到其所属**顶层**评论下（第二层）
      parentId: target ? (target.parentId ?? target.id) : undefined,
      // 「回复谁」如实上报（见 replyTarget 的注释）
      replyToId: target ? target.id : undefined,
      authorName: commentForm.value.authorName,
      authorEmail: commentForm.value.authorEmail,
      authorUrl: commentForm.value.authorUrl || undefined,
      content: commentForm.value.content,
      notifyEmail: commentForm.value.notifyEmail,
    });
    ElMessage.success(target ? "回复已提交，审核通过后将显示。" : "评论已提交，审核通过后将显示。");
    saveCommentInfo();
    // 清空富文本编辑器（会同步 v-model 为空）
    commentInputRef.value?.clear();
    // 回复完成 → 退出回复态（保留姓名/邮箱方便连续回复）
    replyTarget.value = null;
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

// ===== 移动端底部操作栏（目录抽屉 + 评论跳转） =====
const mobileTocOpen = ref(false);
const scrollToComments = () => {
  const el = document.querySelector(".comments-section");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

// ===== 阅读设置（字号 / 行距）=====
interface ReadingPrefs {
  fontSize: number;
  lineHeight: number;
}

const readingPrefs = ref<ReadingPrefs>({ fontSize: 16, lineHeight: 1.75 });

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
  document.addEventListener("click", handleLightboxClick);
  document.addEventListener("keydown", handleLightboxKey);
});

onBeforeUnmount(() => {
  if (scrollHandler) {
    window.removeEventListener("scroll", scrollHandler);
    window.removeEventListener("resize", scrollHandler);
  }
  document.removeEventListener("click", handleCodeCopyClick);
  document.removeEventListener("click", handleLightboxClick);
  document.removeEventListener("keydown", handleLightboxKey);
  if (lightboxBodyScrollLocked) {
    document.body.style.overflow = "";
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

usePageSeo({
  title: computed(() => article.value?.title || "文章详情"),
  description: computed(
    () =>
      article.value?.summary ||
      truncateText(stripHtml(article.value?.content || ""), 160) ||
      "查看网站文章详情。",
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

// 上一篇 / 下一篇 SEO 内链（<link rel="prev"> / <link rel="next">），利于搜索引擎连续抓取与内链留存
useHead(() => {
  if (!article.value) return { link: [] };
  const links: Array<{ rel: "prev" | "next"; href: string }> = [];
  const siteUrl = runtimeConfig.public.siteUrl || "http://localhost:3001";
  if (adjacent.value?.prev) {
    links.push({ rel: "prev", href: `${siteUrl}/article/${adjacent.value.prev.id}` });
  }
  if (adjacent.value?.next) {
    links.push({ rel: "next", href: `${siteUrl}/article/${adjacent.value.next.id}` });
  }
  return { link: links };
});
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;
@use "../../assets/css/abstracts/mixins" as *;

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
  /* 导航条（非内容卡片）：垂直 $spacing-4(15px) / 水平 $spacing-5(18.75px) */
  padding: $spacing-4 $spacing-5;
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
  color: var(--color-accent-deep);
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

/* 窄屏：文章标题往往很长，不限宽会把面包屑挤成多行（实测 390px 下标题项占 210px、
   整条高 78px，观感很差）。按视口百分比限宽让整条保持单行。
   ⚠️ 38vw 是实测出来的：42vw 时 360px 下只差 0.3px 放不下（子项 261.7 + 间距 32 = 293.7，
   可用 294）→ 一旦差一点点就整项掉到第二行。留出余量。 */
@media (max-width: 768px) {
  .breadcrumb-current {
    max-width: 38vw;
  }
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
  /* auto-fill 保留空轨道：相关推荐仅一条时卡片不被拉伸占满，自然留白 */
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: $spacing-5;
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
  color: var(--color-category-strong);
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
  color: var(--color-category-strong);
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

/* 相关文章卡在真机（≤480px）：收窄内边距、封面尺寸、标题字号 */
@media (max-width: 480px) {
  .related-item {
    gap: clamp(8px, 2vw, 12px);
    padding: clamp(8px, 2vw, 12px);
  }

  .related-cover {
    flex: 0 0 clamp(64px, 20vw, 80px);
    height: clamp(44px, 14vw, 56px);
  }

  .related-item-title {
    font-size: clamp(14px, 4vw, 16px);
  }

  .related-cat {
    font-size: clamp(12px, 3.5vw, 14px);
  }

  .related-date {
    font-size: clamp(11px, 3vw, 12px);
  }
}

/* ===== 上一篇 / 下一篇 ===== */
.article-pagination {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: $spacing-4;
  margin-top: $spacing-8;
}

.pagination-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: $spacing-4 $spacing-5;
  border-radius: $border-radius-md;
  background: var(--bg-hover);
  border: 1px solid var(--border-light);
  text-decoration: none;
  min-width: 0;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    box-shadow var(--transition-bounce),
    transform var(--transition-bounce);
}

.pagination-card:hover {
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
  transform: translateY(-2px);
  border-color: var(--color-accent-deep);
}

.pagination-prev {
  text-align: left;
}

.pagination-next {
  text-align: right;
}

.pagination-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-accent-deep);
  font-size: $font-size-xs;
  font-weight: 600;
}

.pagination-next .pagination-label {
  justify-content: flex-end;
}

.pagination-title {
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

.pagination-date {
  color: var(--text-muted);
  font-size: $font-size-xs;
  font-variant-numeric: tabular-nums;
}

.pagination-disabled {
  background: var(--bg-hover);
  border-style: dashed;
  pointer-events: none;
}

.pagination-disabled .pagination-title {
  color: var(--text-muted);
}

.pagination-disabled .pagination-label {
  color: var(--text-muted);
}

/* ===== 正文图片灯箱（Lightbox）===== */
.article-body :deep(img.lightbox-trigger) {
  cursor: zoom-in;
}

.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 10, 20, 0.92);
  backdrop-filter: blur(4px);
}

.lightbox-stage {
  position: relative;
  max-width: 92vw;
  max-height: 88vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-img {
  max-width: 92vw;
  max-height: 88vh;
  border-radius: 6px;
  object-fit: contain;
  cursor: zoom-in;
  transition: transform 0.2s ease;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.lightbox-img.lightbox-zoomed {
  transform: scale(1.8);
  cursor: zoom-out;
}

.lightbox-hint {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.85);
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  pointer-events: none;
}

.lightbox-close {
  position: absolute;
  top: 20px;
  right: 24px;
  z-index: 3001;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.24);
}

.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3001;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.24);
}

.lightbox-prev {
  left: 20px;
}

.lightbox-next {
  right: 20px;
}

.lightbox-counter {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.25s ease;
}

.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}

/* 移动端：收起导航按钮尺寸、关闭按钮位置 */
@media (max-width: 640px) {
  .lightbox-nav {
    width: 40px;
    height: 40px;
  }

  .lightbox-prev {
    left: 8px;
  }

  .lightbox-next {
    right: 8px;
  }

  .lightbox-close {
    top: 12px;
    right: 12px;
  }
}

/* 真机（≤480px）：单列堆叠，保证可读性 */
@media (max-width: 480px) {
  .article-pagination {
    grid-template-columns: 1fr;
    gap: clamp(6px, 1.5vw, 10px);
    margin-top: $mobile-section-margin * 1.5;
  }

  .pagination-card {
    padding: clamp(8px, 2.5vw, 12px) clamp(10px, 3vw, 16px);
    gap: 4px;
  }

  .pagination-title {
    font-size: clamp(14px, 4vw, 15px);
  }
}

.article-header {
  margin-bottom: 30px;
}

.article-header h1 {
  font-size: clamp(22px, 4.2vw, 32px);
  color: var(--text-primary);
  margin-bottom: clamp(10px, 2vw, 15px);
  line-height: 1.35;
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  color: var(--text-muted);
  margin-bottom: 15px;
}

/* 文章元信息在真机（≤480px）：收紧间距与字号。
   用流式取值而不是写死一档 —— 这一行有 4 个文本项，
   在不同视口宽下的余量差别不大（375 只差十几像素），
   写死 12px 会在窄屏折行、写死 11px 又在 390 白白变小。
   （阅读设置按钮已移到移动端底部操作栏，这里不再为它留 44px。） */
@media (max-width: 480px) {
  .article-meta {
    gap: clamp(4px, 1.2vw, 6px);
    margin-bottom: clamp(10px, 2vw, 15px);
    /* 下限 10.5px 是为 360px 档留的：那里四项文本仍偏紧 */
    font-size: clamp(10.5px, 3vw, 12px);
  }

  /* 行高跟着收，否则 24px 的行盒会把这一行顶得很高 */
  .article-meta .meta-item {
    height: 20px;
    line-height: 20px;
  }

  .article-summary {
    font-size: clamp(13px, 3.8vw, 14px);
    padding: clamp(8px, 2vw, 10px) clamp(10px, 2.5vw, 12px);
  }

  .category,
  .tag {
    font-size: clamp(12px, 3.4vw, 14px);
    /* 保持胶囊行盒：只收横向内边距与高度，不再写 `padding: 3px …`
       （那会盖掉 @include text-pill 的 padding: 0 …，又把文字压回非居中状态） */
    height: 24px;
    line-height: 18px;
    padding-left: clamp(8px, 2.5vw, 12px);
    padding-right: clamp(8px, 2.5vw, 12px);
  }
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
  padding: $spacing-5 $spacing-6;
  border-radius: 6px;
}

.category,
.tag {
  text-decoration: none;
  font-size: 14px;
  /* 胶囊配方：钉住行盒 —— 字体栈把拉丁字体排在中文字体前，两者 ascent/descent 比例不同，
     不钉行盒时巴西文的视觉中心比中文高 3px（实测上/下留白 4/8 vs 7/5）。 */
  @include text-pill(28px, 20px, 12px);
}

.category {
  background: var(--color-category-soft);
  color: var(--color-accent-deep);
  border-radius: 4px;
}

.tag {
  background: var(--color-accent-light);
  color: var(--color-accent-deep);
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
.meta-settings {
  /* 推到元信息行右端；flex 子项默认会被压缩，故显式不收缩 */
  margin-left: auto;
  flex-shrink: 0;
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

/* 正文标题在真机（≤480px）收紧：标题 ≤1.25rem（20px），正文不显得过大 */
@media (max-width: 480px) {
  .article-body :deep(h1) { font-size: 1.4rem; }
  .article-body :deep(h2) { font-size: 1.25rem; }
  .article-body :deep(h3) { font-size: 1.1rem; }
  .article-body :deep(h4) { font-size: 0.98rem; }
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
  /* 视觉仅 23px 高：靠 ::after 把命中区撑到 44px（代码块头部空间充分，不担心重叠） */
  position: relative;

  &::after {
    content: "";
    position: absolute;
    inset: -11px -6px;
  }
}

.article-body :deep(.code-copy:hover) {
  color: var(--color-accent-deep);
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
  /* 点评论的「回复」会 scrollIntoView 到这个表单 —— 顶栏是 sticky 的，
     不避让的话表单标题会被压在顶栏下面。scrollIntoView **认** scroll-margin-top。 */
  scroll-margin-top: 80px;
}

/* 回复目标提示条：点某条评论的「回复」后表单不跳动（就在下方），
   所以必须明确告知正在回复谁，并给一个取消的出口。
   ⚠️ 回复表单**不再嵌在评论条目里**（原先它展开在子评论内部，可用宽只剩一半）。 */
.reply-target-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: $spacing-3;
  padding: 8px 12px;
  border-radius: var(--radius-card-lg);
  background: var(--color-accent-light);
  border: 1px solid var(--color-category-soft);
  font-size: $font-size-sm;
  color: var(--text-secondary);
}

.reply-target-text strong {
  color: var(--color-accent-deep);
  font-weight: 600;
}

.reply-target-cancel {
  flex-shrink: 0;
  padding: 6px 10px;
  border: none;
  border-radius: var(--border-radius-base);
  background: transparent;
  color: var(--color-accent-deep);
  font-family: inherit;
  font-size: $font-size-xs;
  font-weight: 500;
  cursor: pointer;
  text-decoration: underline;
  /* 内联小按钮：视觉不变，靠 ::after 把命中区撑到 44px */
  @include tap-target(6px, 14px);
}

.reply-target-cancel:hover {
  background: var(--color-category-soft);
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

/* 评论区富文本输入框容器 */
.comment-textarea-wrap {
  position: relative;
  margin-bottom: 14px;
}

/* 邮件订阅开关：位于输入框与提交按钮之间，默认不勾 */
.comment-form-notify {
  /* ⚠️ 必须显式声明 display：el-checkbox 默认是 inline-flex，与同为行内级的
     el-button 是「行内级兄弟」→ 两者会排在**同一行**（实测按钮紧贴复选框右侧、
     水平间距 0，只因两者 margin 不同而错开几像素）。改成 flex（块级）后它独占一行，
     按钮自动落到下一行。
     不要靠「后面那个元素恰好是块级」来换行 —— 那样一旦按钮行改成 inline-flex
     就会静默并排回去。 */
  display: flex;
  /* 与上方 comment-textarea-wrap 的 margin-bottom 同为 14px：
     输入框 → 选项 → 主操作 三段等距 */
  margin-bottom: 14px;

  /* 勾选框本身只有 14×14、整行 32px —— 移动端把整行提到 44px，
     命中区随之覆盖到整行（点标签任意位置也能勾选）。 */
  @media (max-width: 768px) {
    min-height: $touch-target-min;
    align-items: center;
  }

  :deep(.el-checkbox__label) {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }
}

/* 与上方元素的垂直间距完全由“前者”的 margin-bottom 决定，避免两处相加 */
.submit-btn {
  margin-top: 0;
}

/* 主要操作按钮：移动端撑到 44px 触摸目标（原为控件默认 32px）。
   这是表单主按钮，放大它是必要的 —— 区别于内联链接那类「只扩大命中区」的处理。 */
@media (max-width: 768px) {
  .submit-btn {
    min-height: $touch-target-min;
  }
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
  color: var(--color-accent-deep);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  z-index: 100;
}

.back-top-btn:hover {
  color: var(--color-category-strong);
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
  /* 关键：grid 子项默认 min-width:auto，长标题不换行会撑破卡片，须置 0 */
  min-width: 0;
}

.toc li {
  min-width: 0;
  /* 允许长标题在按钮内安全换行/截断，避免撑破卡片 */
  overflow-wrap: anywhere;
  word-break: break-word;
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
  /* 长标题安全换行显示完整文字（不撑破卡片），而非用 … 截断 */
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
  line-height: 1.5;
  transition: background-color 0.2s, color 0.2s, border-color 0.2s;
}

/* 当前章节：左侧青绿指示条 + 浅底，随滚动跟随 */
.toc button.active {
  background: var(--color-accent-light);
  color: var(--color-accent-deep);
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
    padding: clamp(14px, 3vw, 20px) clamp(12px, 3vw, 16px);
    border-radius: 0;
    border-left: none;
    border-right: none;
    margin-left: -20px;
    margin-right: -20px;
  }

  .comment-form-row {
    grid-template-columns: 1fr;
  }

  .comments-header {
    flex-direction: column;
    align-items: flex-start;
  }

  /* 移动端：底部操作栏接管“返回顶部”，隐藏悬浮圆钮避免重叠 */
  .back-top-btn {
    display: none;
  }

  /* 移动端：阅读设置移到底部操作栏，元信息行不再放按钮 */
  .meta-settings {
    display: none;
  }

  /* 为固定底部操作栏预留空间，避免遮挡评论区/表单 */
  .article-detail {
    padding-bottom: 76px;
  }
}

/* 真机（≤480px）：main-content 左右内边距收窄为 clamp(10px,3vw,14px)，
   此处同步负外边距，使通栏卡片仍与视口边缘对齐 */
@media (max-width: 480px) {
  .article-card-wrap {
    margin-left: calc(-1 * clamp(10px, 3vw, 14px));
    margin-right: calc(-1 * clamp(10px, 3vw, 14px));
    padding: clamp(12px, 3vw, 16px) clamp(12px, 3vw, 16px);
  }
}

/* ===== 移动端底部操作栏（仅 ≤768px，移动特有交互） ===== */
.mobile-bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 120;
  display: none;
  /* 列数跟着按钮数走：评论可关闭，写死 repeat(3/4, 1fr) 会在少一个按钮时留出空列 */
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  background: var(--bg-backdrop);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  border-top: 1px solid var(--glass-border);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.06);
}

@media (max-width: 768px) {
  .mobile-bottom-bar {
    display: grid;
  }
}

/* 阅读设置是组件根节点，作为 grid 子项撑满所在列 */
.mobile-bar-settings {
  width: 100%;
}

.mobile-bar-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  border-radius: 12px;
  /* 去掉 iOS/移动端点击瞬间的灰色高亮蒙层（常亮观感来源之二） */
  -webkit-tap-highlight-color: transparent;
  transition: color 0.2s, background-color 0.2s;
}

/* 仅对“可悬停”设备启用 hover，避免触屏点击后 hover 粘滞导致按钮常亮 */
@media (hover: hover) and (pointer: fine) {
  .mobile-bar-btn:hover {
    color: var(--color-category-strong);
    background: var(--bg-hover);
  }
}

/* 触屏：:active 是按下瞬间的短暂反馈，松手即恢复，不会常亮 */
.mobile-bar-btn:active {
  color: var(--color-category-strong);
  background: var(--bg-hover);
}

.mobile-bar-btn svg {
  width: 20px;
  height: 20px;
  pointer-events: none;
}

/* ===== 移动端目录抽屉 ===== */
.mobile-toc-mask {
  position: fixed;
  inset: 0;
  z-index: 130;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: flex-end;
}

.mobile-toc-sheet {
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  border-radius: 16px 16px 0 0;
  border: 1px solid var(--glass-border);
  border-bottom: none;
  padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
}

.mobile-toc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.mobile-toc-header h4 {
  margin: 0;
  font-size: 17px;
  color: var(--text-primary);
}

.mobile-toc-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: var(--bg-hover);
  color: var(--text-muted);
  font-size: 15px;
  cursor: pointer;
}

.mobile-toc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 4px;
}

.mobile-toc-list button {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  min-height: 44px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.4;
  cursor: pointer;
  transition: background-color 0.15s;
}

.mobile-toc-list button.active {
  background: var(--color-accent-light);
  color: var(--color-accent-deep);
  font-weight: 600;
}

.mobile-toc-list li.level-2 {
  padding-left: 12px;
}

.mobile-toc-list li.level-3 {
  padding-left: 24px;
}

.mobile-toc-empty {
  color: var(--text-muted);
  font-size: 14px;
  text-align: center;
  padding: 16px 0;
}

/* 目录抽屉展开/收起淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 极窄屏（≤340px，目前只有 320px 一类）：元信息已不再含 44px 按钮，
   上面的流式取值在 320px 也放得下，故此前为此写死的 10px 字号已移除。 */
</style>
