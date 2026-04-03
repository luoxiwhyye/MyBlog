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
              <span class="author">{{ siteAuthor }}</span>
              <time>{{ formatDateTime(article.createdAt) }}</time>
              <span class="views">{{ article.viewCount }} 阅读</span>
            </div>
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

        <div class="article-actions">
          <el-button type="primary" icon="Share">分享</el-button>
          <el-button icon="Star">收藏</el-button>
        </div>

        <div class="comments-section">
          <h3>评论 ({{ comments.length }})</h3>
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
          </div>
        </div>
      </div>
      <div v-else class="not-found">
        文章不存在
      </div>
    </div>
  </DefaultLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
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
const loading = computed(() => articleStore.loading)
const comments = ref<CommentType[]>([])
const submitting = ref(false)

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
    ElMessage.success('评论成功')
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
      status: 'approved',
    })
    comments.value = response.data.list
  } catch (error) {
    console.error('Failed to fetch comments:', error)
  }
}

onMounted(() => {
  const id = Number(route.params.id)
  if (id) {
    articleStore.fetchArticleDetail(id)
    fetchComments()
  }
  settingsStore.fetchSettings()
})
</script>

<style scoped>
.article-detail {
  max-width: 800px;
  margin: 0 auto;
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
  gap: 20px;
  color: #999;
  margin-bottom: 15px;
}

.article-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
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

.article-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 40px;
}

.comments-section {
  border-top: 1px solid #e5e5e5;
  padding-top: 40px;
}

.comments-section h3 {
  font-size: 24px;
  margin-bottom: 20px;
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
</style>