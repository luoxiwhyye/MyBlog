<template>
  <div class="comment">
    <div class="comment-header">
      <span class="author">{{ comment.authorName }}</span>
      <time class="date">{{ formatDateTime(comment.createdAt || comment.createAt || "") }}</time>
    </div>
    <div class="comment-content" v-html="comment.content"></div>
    <div class="comment-actions">
      <el-button type="text" size="small" :disabled="liked" @click="handleLike">
        👍 {{ likeCount }}
      </el-button>
      <el-button type="text" size="small" @click="showReply = true">回复</el-button>
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
import { ElMessage } from "element-plus";
import { commentApi } from "~/api";
import type { Comment } from "~/types";
import { formatDateTime } from "~/utils/format";

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

const replyForm = reactive({
  authorName: "",
  authorEmail: "",
  content: "",
});

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

  submitting.value = true;
  try {
    await commentApi.create({
      articleId: props.comment.articleId,
      parentId: props.comment.id,
      authorName: replyForm.authorName,
      authorEmail: replyForm.authorEmail,
      content: replyForm.content,
    });
    ElMessage.success("回复成功");
    showReply.value = false;
    replyForm.authorName = "";
    replyForm.authorEmail = "";
    replyForm.content = "";
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

<style scoped>
.comment {
  border-bottom: 1px solid #e5e5e5;
  padding: 15px 0;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.author {
  font-weight: 500;
  color: #333;
}

.date {
  color: #999;
  font-size: 14px;
}

.comment-content {
  color: #555;
  line-height: 1.6;
  margin-bottom: 10px;
}

.comment-actions {
  margin-bottom: 10px;
}

.reply-form {
  margin-top: 15px;
  padding: 15px;
  background: #f8f8f8;
  border-radius: 4px;
}

.replies {
  margin-left: 30px;
  border-left: 2px solid #e5e5e5;
  padding-left: 15px;
}
</style>
