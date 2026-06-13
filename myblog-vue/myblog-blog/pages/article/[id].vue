<template>
  <div class="article-detail">
    <div v-if="articlePending" class="loading">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
      加载中...
    </div>
    <div v-else-if="article" class="article-content">
      <nav class="breadcrumb">
        <NuxtLink to="/">首页</NuxtLink>
        <span>&gt;</span>
        <NuxtLink :to="`/category/${article.type.id}`">{{ article.type.typeName }}</NuxtLink>
        <span>&gt;</span>
        <span>{{ article.title }}</span>
      </nav>

      <article class="article">
        <header class="article-header">
          <h1>{{ article.title }}</h1>
          <div class="article-meta">
            <span class="author meta-item">{{ siteAuthor }}</span>
            <time class="meta-item">{{ formatDateTime(article.createdAt) }}</time>
            <span class="views meta-item">{{ article.viewCount }} 阅读</span>
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
            :src="article.coverImage"
            :alt="article.title"
            loading="lazy"
            decoding="async"
            format="webp"
            sizes="sm:100vw md:800px"
            class="cover-img"
          />
        </div>

        <div class="article-body" v-html="article.content"></div>
      </article>

      <div class="comments-section">
        <div class="comments-header">
          <h3>评论 ({{ commentPagination.total }})</h3>
          <el-radio-group v-model="commentSort" size="small" @change="handleSortChange">
            <el-radio-button label="hottest">最热</el-radio-button>
            <el-radio-button label="latest">最新</el-radio-button>
          </el-radio-group>
        </div>
        <div class="comment-form">
          <el-form @submit.prevent="handleComment">
            <el-form-item>
              <el-input v-model="commentForm.authorName" placeholder="您的姓名 *" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="commentForm.authorEmail" placeholder="您的邮箱" />
            </el-form-item>
            <el-form-item>
              <el-input v-model="commentForm.authorUrl" placeholder="https://yourblog.com（选填）" />
            </el-form-item>
            <el-form-item>
              <el-input
                v-model="commentForm.content"
                type="textarea"
                placeholder="写下您的评论..."
                rows="4"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" native-type="submit" :loading="submitting">
                发表评论
              </el-button>
            </el-form-item>
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
    <div v-else class="not-found">文章不存在</div>

    <aside v-if="article" class="quick-nav">
      <el-button class="quick-btn" type="primary" plain @click="scrollToTop">返回顶部</el-button>
      <div v-if="tocItems.length" class="toc">
        <h4>目录</h4>
        <ul>
          <li v-for="item in tocItems" :key="item.id" :class="`level-${item.level}`">
            <button type="button" @click="scrollToHeading(item.id)">{{ item.text }}</button>
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
import { formatDateTime } from "~/utils/format";
import { stripHtml, truncateText } from "~/utils/seo";

const route = useRoute();
const settingsStore = useSettingsStore();

await settingsStore.ensureSettings();

const articleId = computed(() => Number(route.params.id));
const submitting = ref(false);
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
const siteAuthor = computed(() => settingsStore.getSetting("site_author") || "博主");

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
    // 动态加载 highlight.js CSS 和 JS
    await import("highlight.js/styles/github.css");
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

const scrollToHeading = (id: string) => {
  const target = document.getElementById(id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

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

<style scoped>
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
  color: var(--text-secondary);
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.breadcrumb a {
  color: var(--text-secondary);
  text-decoration: none;
}

.breadcrumb a:hover {
  color: var(--color-link);
}

.article-header {
  margin-bottom: 30px;
}

.article-header h1 {
  font-size: 32px;
  color: var(--text-primary);
  margin-bottom: 15px;
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
  height: 24px;
  line-height: 24px;
}

.views {
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
  line-height: 1.8;
  color: var(--text-primary);
  margin-bottom: 40px;
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
  border-top: 1px solid var(--border-color);
  padding-top: 40px;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.comment-form {
  margin-bottom: 30px;
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
  backdrop-filter: blur(16px);
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
}

.toc .level-2 {
  padding-left: 12px;
}

.toc .level-3 {
  padding-left: 24px;
}

@media (max-width: 1200px) {
  .quick-nav {
    display: none;
  }
}

@media (max-width: 768px) {
  .comments-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
