<template>
  <div class="comment">
    <div class="comment-header">
      <div class="author-info">
        <img
          class="avatar"
          :src="getGravatarUrl(comment.authorEmail, 40)"
          :alt="comment.authorName"
          width="40"
          height="40"
          loading="lazy"
        />
        <span class="author">
          <a
            v-if="comment.authorUrl"
            :href="normalizeUrl(comment.authorUrl)"
            target="_blank"
            rel="noopener noreferrer ugc"
          >{{ comment.authorName }}</a>
          <template v-else>{{ comment.authorName }}</template>
        </span>
      </div>
      <time class="date">{{ formatDateTime(comment.createdAt || comment.createAt || '') }}</time>
    </div>
    <div class="comment-content" v-html="comment.content"></div>
    <div class="comment-actions">
      <el-button
        type="text"
        size="small"
        @click="handleLike"
        :disabled="liked"
      >
        👍 {{ comment.likeCount }}
      </el-button>
      <el-button type="text" size="small" @click="showReply = true">
        回复
      </el-button>
    </div>
    <div v-if="showReply" class="reply-form">
      <el-form @submit.prevent="handleReply">
        <el-form-item>
          <el-input v-model="replyForm.authorName" placeholder="您的姓名" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="replyForm.authorEmail" placeholder="您的邮箱" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="replyForm.authorUrl" placeholder="https://yourblog.com（选填）" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="replyForm.content"
            type="textarea"
            placeholder="写下您的回复..."
            rows="3"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="submitting">
            提交回复
          </el-button>
          <el-button @click="showReply = false">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
    <div v-if="comment.replies" class="replies">
      <BlogComment
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        @reply-submitted="handleReplySubmitted"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { commentApi } from '@/api'
import type { Comment } from '@/types'
import { formatDateTime } from '@/utils/format'
import { getGravatarUrl } from '@/utils/gravatar'

defineOptions({
  name: 'BlogComment',
})

const props = defineProps<{
  comment: Comment
}>()

const emit = defineEmits<{
  replySubmitted: []
}>()

const showReply = ref(false)
const liked = ref(false)
const submitting = ref(false)

const replyForm = reactive({
  authorName: '',
  authorEmail: '',
  authorUrl: '',
  content: '',
});

const normalizeUrl = (url: string) => {
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

const handleLike = async () => {
  try {
    await commentApi.like(props.comment.id)
    props.comment.likeCount++
    liked.value = true
  } catch (error) {
    ElMessage.error('点赞失败')
  }
}

const handleReply = async () => {
  if (!replyForm.authorName || !replyForm.content) {
    ElMessage.warning('请填写姓名和内容')
    return
  }

  submitting.value = true
  try {
    await commentApi.create({
      articleId: props.comment.articleId,
      parentId: props.comment.id,
      authorName: replyForm.authorName,
      authorEmail: replyForm.authorEmail,
      authorUrl: replyForm.authorUrl || undefined,
      content: replyForm.content,
    })
    ElMessage.success('回复成功')
    showReply.value = false
    replyForm.authorName = ''
    replyForm.authorEmail = ''
    replyForm.authorUrl = ''
    replyForm.content = ''
    emit('replySubmitted')
  } catch (error) {
    ElMessage.error('回复失败')
  } finally {
    submitting.value = false
  }
}

const handleReplySubmitted = () => {
  emit('replySubmitted')
}
</script>

<style scoped>
.comment {
  border-bottom: 1px solid var(--border-color);
  padding: 15px 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-color);
}

.author {
  font-weight: 500;
  color: var(--text-primary);
}

.author a {
  color: var(--color-link);
  text-decoration: none;
}

.author a:hover {
  text-decoration: underline;
}

.date {
  color: var(--text-muted);
  font-size: 14px;
}

.comment-content {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 10px;
}

.comment-actions {
  margin-bottom: 10px;
}

.reply-form {
  margin-top: 15px;
  padding: 15px;
  background: var(--bg-hover);
  backdrop-filter: blur(8px);
  border-radius: 4px;
}

.replies {
  margin-left: 30px;
  border-left: 2px solid var(--border-color);
  padding-left: 15px;
}
</style>