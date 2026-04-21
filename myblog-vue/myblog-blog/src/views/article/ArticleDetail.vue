<template>
  <DefaultLayout>
    <div class="article-detail">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        加载中...
      </div>
      <div v-else-if="article" class="article-content">
        <nav class="breadcrumb">
          <router-link to="/">首页</router-link> >
          <router-link :to="`/category/${article.type.id}`">{{ article.type.typeName }}</router-link> >
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
              <span class="category">{{ article.type.typeName }}</span>
              <span v-for="tag in article.labels" :key="tag.id" class="tag">
                {{ tag.labelName }}
              </span>
            </div>
          </header>

          <div v-if="article.coverImage" class="cover-image">
            <img :src="article.coverImage" :alt="article.title" />
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
            <Comment
              v-for="comment in comments"
              :key="comment.id"
              :comment="comment"
              @reply-submitted="fetchComments"
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
      <div v-else class="not-found">
        文章不存在
      </div>

      <aside class="quick-nav" v-if="article">
        <el-button class="quick-btn" type="primary" plain @click="scrollToTop">返回顶部</el-button>
        <div class="toc" v-if="tocItems.length">
          <h4>目录</h4>
          <ul>
            <li v-for="item in tocItems" :key="item.id" :class="`level-${item.level}`">
              <button type="button" @click="scrollToHeading(item.id)">{{ item.text }}</button>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import Comment from '@/components/common/Comment.vue'
import { useArticleStore } from '@/stores/article'
import { useSettingsStore } from '@/stores/settings'
import { commentApi } from '@/api'
import type { Comment as CommentType } from '@/types'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const articleStore = useArticleStore()
const settingsStore = useSettingsStore()

const article = computed(() => articleStore.currentArticle)
const loading = computed(() => articleStore.detailLoading)
const comments = ref<CommentType[]>([])
const submitting = ref(false)
const tocItems = ref<Array<{ id: string; text: string; level: number }>>([])
const commentSort = ref<'latest' | 'hottest'>('hottest')
const commentPagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
})

const commentForm = ref({
  authorName: '',
  authorEmail: '',
  content: '',
})

const siteAuthor = computed(() => settingsStore.getSetting('site_author') || '博主')

const handleComment = async () => {
  if (!commentForm.value.authorName || !commentForm.value.content) {
    ElMessage.warning('请填写姓名和评论内容')
    return
  }

  submitting.value = true
  try {
    await commentApi.create({
      articleId: Number(route.params.id),
      authorName: commentForm.value.authorName,
      authorEmail: commentForm.value.authorEmail,
      content: commentForm.value.content,
    })
    ElMessage.success('评论已提交，感谢您的分享。经审核通过后即可显示。')
    commentForm.value.authorName = ''
    commentForm.value.authorEmail = ''
    commentForm.value.content = ''
    fetchComments()
  } catch (error) {
    ElMessage.error('评论失败')
  } finally {
    submitting.value = false
  }
}

const fetchComments = async () => {
  try {
    const response = await commentApi.getList({
      articleId: Number(route.params.id),
      page: commentPagination.value.page,
      pageSize: commentPagination.value.pageSize,
      status: 'approved',
      sortBy: commentSort.value,
      topLevelOnly: true,
    })
    comments.value = normalizeCommentTree(response.data.list)
    commentPagination.value.total = response.data.total
  } catch (error) {
    console.error('Failed to fetch comments:', error)
  }
}

const normalizeCommentTree = (list: CommentType[]): CommentType[] => {
  return list.map((item) => ({
    ...item,
    createdAt: item.createdAt || item.createAt || '',
    replies: item.replies ? normalizeCommentTree(item.replies) : [],
  }))
}

const buildToc = async () => {
  await nextTick()
  const headingNodes = document.querySelectorAll('.article-body h1, .article-body h2, .article-body h3')
  tocItems.value = Array.from(headingNodes)
    .map((node, index) => {
      const text = node.textContent?.trim() || ''
      if (!text) {
        return null
      }

    const id = `toc-${index + 1}`
    node.setAttribute('id', id)
    return {
      id,
      text,
      level: Number(node.tagName.replace('H', '')),
    }
    })
    .filter((item): item is { id: string; text: string; level: number } => item !== null)
}

const highlightCodeBlocks = async () => {
  await nextTick()
  const blocks = document.querySelectorAll('.article-body pre code')
  blocks.forEach((block) => {
    hljs.highlightElement(block as HTMLElement)
  })
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const scrollToHeading = (id: string) => {
  const target = document.getElementById(id)
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const handleSortChange = () => {
  commentPagination.value.page = 1
  fetchComments()
}

const handlePageChange = (page: number) => {
  commentPagination.value.page = page
  fetchComments()
}

const loadArticleData = async (id: number) => {
  if (!id) {
    return
  }
  await articleStore.fetchArticleDetail(id)
  await Promise.all([buildToc(), highlightCodeBlocks()])
  await fetchComments()
}

onMounted(() => {
  const id = Number(route.params.id)
  loadArticleData(id)
  settingsStore.fetchSettings()
})

watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId !== oldId) {
      commentPagination.value.page = 1
      loadArticleData(Number(newId))
    }
  }
)
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
  color: #666;
}

.not-found {
  text-align: center;
  padding: 40px;
  color: #999;
}

.breadcrumb {
  margin-bottom: 20px;
  color: #666;
}

.breadcrumb a {
  color: #666;
  text-decoration: none;
}

.breadcrumb a:hover {
  color: #007bff;
}

.article-header {
  margin-bottom: 30px;
}

.article-header h1 {
  font-size: 32px;
  color: #333;
  margin-bottom: 15px;
}

.article-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  color: #999;
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
  color: #475569;
  line-height: 1.8;
  background: #f8fafc;
  border-left: 4px solid #38bdf8;
  padding: 10px 12px;
  border-radius: 6px;
}

.category {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.tag {
  background: #f3e5f5;
  color: #7b1fa2;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.cover-image {
  margin: 30px 0;
  text-align: center;
}

.cover-image img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
}

.article-body {
  line-height: 1.8;
  color: #333;
  margin-bottom: 40px;
}

.article-body :deep(pre) {
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 8px;
  overflow: auto;
  padding: 14px;
  margin: 14px 0;
}

.article-body :deep(code) {
  font-family: 'Fira Code', 'Consolas', monospace;
}

.article-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 40px;
}

.comments-section {
  border-top: 1px solid #e5e5e5;
  padding-top: 40px;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.comments-section h3 {
  font-size: 24px;
  margin: 0;
  color: #333;
}

.comment-form {
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f8f8;
  border-radius: 8px;
}

.comments-list {
  margin-top: 20px;
}

.comments-pagination {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

.quick-nav {
  position: fixed;
  right: 24px;
  top: 140px;
  width: 220px;
  z-index: 20;
}

.quick-btn {
  width: 100%;
  margin-bottom: 12px;
}

.toc {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  max-height: 60vh;
  overflow: auto;
}

.toc h4 {
  margin-bottom: 8px;
  color: #1f2937;
}

.toc ul {
  list-style: none;
}

.toc li {
  margin-bottom: 6px;
}

.toc li.level-2 {
  padding-left: 12px;
}

.toc li.level-3 {
  padding-left: 24px;
}

.toc button {
  border: none;
  background: transparent;
  text-align: left;
  color: #4b5563;
  cursor: pointer;
}

@media (max-width: 1280px) {
  .quick-nav {
    right: 12px;
  }
}

@media (max-width: 992px) {
  .comments-header {
    flex-direction: column;
    align-items: stretch;
  }

  .quick-nav {
    left: 0;
    right: 0;
    width: 100%;
    bottom: 0;
    top: auto;
    background: rgba(255, 255, 255, 0.96);
    border-top: 1px solid #e5e7eb;
    padding: 10px 12px;
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .quick-btn {
    width: auto;
    margin: 0;
  }

  .toc {
    flex: 1;
    max-height: 120px;
  }
}
</style>