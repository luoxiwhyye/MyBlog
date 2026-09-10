<template>
  <div class="comment">
    <img
      class="avatar"
      :src="getGravatarUrl(comment.authorEmail, 40)"
      :alt="comment.authorName"
      width="40"
      height="40"
      loading="lazy"
    />
    <div class="comment-body">
      <div class="comment-head">
        <span class="author">
          <a
            v-if="comment.authorUrl"
            :href="normalizeUrl(comment.authorUrl)"
            target="_blank"
            rel="noopener noreferrer ugc"
          >{{ comment.authorName }}</a>
          <template v-else>{{ comment.authorName }}</template>
        </span>
        <time class="date">{{ formatDateTime(comment.createdAt || comment.createAt || "") }}</time>
      </div>

      <div class="bubble">
        <div class="comment-content" v-html="renderContent(comment.content)"></div>
        <div class="comment-actions">
          <el-button link size="small" class="like-btn" :class="{ liked }" :disabled="liked" @click="handleLike">
            <svg
              class="like-icon"
              :class="{ 'is-liked': liked }"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M7 10v12" />
              <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
            </svg>
            {{ likeCount }}
          </el-button>
          <el-button link size="small" @click="showReplyForm">回复</el-button>
        </div>
      </div>

      <div v-if="showReply" class="reply-form">
        <el-form @submit.prevent="handleReply">
          <div class="reply-form-row">
            <el-input v-model="replyForm.authorName" placeholder="您的姓名" class="form-name" />
            <el-input v-model="replyForm.authorEmail" placeholder="您的邮箱" class="form-email" />
            <el-input v-model="replyForm.authorUrl" placeholder="https://（选填）" class="form-url" />
          </div>
          <div class="reply-textarea-wrap">
            <CommentInput
              ref="replyInputRef"
              v-model="replyForm.content"
              placeholder="写下您的回复..."
            />
          </div>
          <div class="reply-actions">
            <el-button type="primary" native-type="submit" :loading="submitting">
              提交回复
            </el-button>
            <el-button @click="showReply = false">取消</el-button>
          </div>
        </el-form>
      </div>

      <div v-if="comment.replies && comment.replies.length" class="replies">
        <BlogComment
          v-for="reply in comment.replies"
          :key="reply.id"
          :comment="reply"
          @reply-submitted="handleReplySubmitted"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { commentApi } from "~/api";
import type { Comment } from "~/types";
import { formatDateTime } from "~/utils/format";
import { getGravatarUrl } from "~/utils/gravatar";
import { renderCommentContent } from "~/utils/commentRender";
import CommentInput from "~/components/common/CommentInput.vue";

defineOptions({
  name: "BlogComment",
});

const props = defineProps<{
  comment: Comment;
}>();

const emit = defineEmits<{
  replySubmitted: [];
}>();

const showReply = ref(false);
const liked = ref(false);
const submitting = ref(false);
const likeCount = ref(props.comment.likeCount);
const replyInputRef = ref<any>(null);

const replyForm = reactive({
  authorName: "",
  authorEmail: "",
  authorUrl: "",
  content: "",
});

const normalizeUrl = (url: string) => {
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

// 标记文本 → 安全 HTML（白名单：仅 [img:url] 与 @提及）
const renderContent = (content: string) => renderCommentContent(content);

// 回复时自动 @ 对方（若未手动输入）
const showReplyForm = () => {
  showReply.value = true;
  if (!replyForm.content.includes(`@${props.comment.authorName}`)) {
    // 通过编辑器 API 插入，并按标记文本序列化
    nextTick(() => {
      replyInputRef.value?.insertEmoji(`@${props.comment.authorName} `);
    });
  }
};

watch(
  () => props.comment.likeCount,
  (value) => {
    likeCount.value = value;
  },
);

const handleLike = async () => {
  try {
    await commentApi.like(props.comment.id);
    likeCount.value += 1;
    liked.value = true;
  } catch {
    ElMessage.error("点赞失败");
  }
};

const handleReply = async () => {
  if (!replyForm.authorName || !replyForm.content) {
    ElMessage.warning("请填写姓名和内容");
    return;
  }
  if (replyForm.authorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyForm.authorEmail)) {
    ElMessage.warning("请输入有效的邮箱地址");
    return;
  }

  submitting.value = true;
  try {
    await commentApi.create({
      articleId: props.comment.articleId,
      // 两级扁平结构：回复任意层的评论，都挂到其所属顶级评论下（第二层）
      parentId: props.comment.parentId ?? props.comment.id,
      authorName: replyForm.authorName,
      authorEmail: replyForm.authorEmail,
      authorUrl: replyForm.authorUrl || undefined,
      content: replyForm.content,
    });
    ElMessage.success("回复成功");
    showReply.value = false;
    replyForm.authorName = "";
    replyForm.authorEmail = "";
    replyForm.authorUrl = "";
    // 清空富文本编辑器（会同步 v-model 为空）
    replyInputRef.value?.clear();
    emit("replySubmitted");
  } catch {
    ElMessage.error("回复失败");
  } finally {
    submitting.value = false;
  }
};

const handleReplySubmitted = () => {
  emit("replySubmitted");
};
</script>

<style lang="scss" scoped>
.comment {
  display: flex;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
  padding: 15px 0;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
  box-shadow: 0 0 0 3px var(--color-category-soft);
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 6px;
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
  margin-left: auto;
  color: var(--text-muted);
  font-size: 13px;
}

/* ===== 评论气泡 ===== */
.bubble {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  border-top-left-radius: 6px;
  padding: 12px 14px;
  backdrop-filter: blur(var(--glass-blur));
}

/* 气泡尾巴（指向头像） */
.bubble::before {
  content: "";
  position: absolute;
  left: -6px;
  top: 12px;
  width: 12px;
  height: 12px;
  background: var(--bg-card);
  border-left: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
  transform: rotate(45deg);
}

.comment-content {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 6px;
  word-break: break-word;
}

.comment-content :deep(.mention) {
  color: var(--color-accent);
  font-weight: 600;
  background: var(--color-accent-light);
  border-radius: 4px;
  padding: 0 4px;
}

.comment-content :deep(.comment-markup-img) {
  max-width: 120px;
  max-height: 120px;
  margin: 0 2px;
  border-radius: 4px;
  vertical-align: middle;
}

.comment-actions {
  display: flex;
  gap: 8px;
  margin-top: 2px;
}

.like-btn {
  color: var(--text-muted);
  transition: color 0.2s;
}

.like-btn:hover:not(:disabled) {
  color: var(--color-fav);
}

.like-btn.liked {
  color: var(--color-fav);
}

.like-icon {
  width: 16px;
  height: 16px;
  vertical-align: -3px;
  margin-right: 2px;
  flex-shrink: 0;
}

/* 点赞后：实心 + 品牌色填充 */
.like-icon.is-liked {
  fill: var(--color-fav);
  stroke: var(--color-fav);
}

.reply-form {
  margin-top: 12px;
  padding: 16px;
  background: var(--bg-hover);
  backdrop-filter: blur(var(--glass-blur));
  border-radius: var(--radius-card-lg);
  border: 1px solid var(--glass-border);
}

.reply-form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.reply-textarea-wrap {
  position: relative;
  margin-bottom: 12px;
}

.reply-actions {
  display: flex;
  gap: 10px;
}

.replies {
  position: relative;
  margin-top: 12px;
  margin-left: 40px;
  border-left: 2px solid var(--border-color);
  padding-left: 15px;
}

/* 嵌套层级连接点 — 可视化评论树（青色） */
/* 定位到首条回复头像的垂直中心（.comment padding 15px + 头像一半 20px），避免悬空错位 */
.replies::before {
  content: "";
  position: absolute;
  left: -5px;
  top: 35px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-category);
  border: 2px solid var(--bg-card);
  box-shadow: 0 0 0 1px var(--border-color);
}

@media (max-width: 768px) {
  .reply-form-row {
    grid-template-columns: 1fr;
  }

  .replies {
    margin-left: 16px;
    padding-left: 10px;
  }

  /* ===== 评论区移动端排版 ===== */
  .comment {
    gap: 10px;
    padding: 12px 0;
  }

  .avatar {
    width: 36px;
    height: 36px;
  }

  /* 昵称与时间分两行：避免挤在同一行过于局促 */
  .comment-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .date {
    margin-left: 0;
  }

  /* 正文满宽、减小内边距，减少频繁换行 */
  .bubble {
    padding: 10px 12px;
  }

  .comment-content {
    font-size: 14px;
    line-height: 1.7;
  }
}
</style>
