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
      <time class="date">{{ formatDateTime(comment.createdAt || comment.createAt || "") }}</time>
    </div>
    <div class="comment-content" v-html="renderContent(comment.content)"></div>
    <div class="comment-actions">
      <el-button link size="small" :disabled="liked" @click="handleLike">
        👍 {{ likeCount }}
      </el-button>
      <el-button link size="small" @click="showReplyForm">回复</el-button>
    </div>
    <div v-if="showReply" class="reply-form">
      <el-form @submit.prevent="handleReply">
        <div class="reply-form-row">
          <el-input v-model="replyForm.authorName" placeholder="您的姓名" class="form-name" />
          <el-input v-model="replyForm.authorEmail" placeholder="您的邮箱" class="form-email" />
          <el-input v-model="replyForm.authorUrl" placeholder="https://（选填）" class="form-url" />
        </div>
        <div class="reply-textarea-wrap">
          <el-input
            v-model="replyForm.content"
            type="textarea"
            placeholder="写下您的回复..."
            :rows="3"
          />
          <button type="button" class="emoji-btn" title="插入表情" @click="replyEmojiOpen = !replyEmojiOpen">😊</button>
          <div v-if="replyEmojiOpen" class="emoji-picker">
            <div class="emoji-tabs">
              <button :class="{ active: replyEmojiTab === 'emoji' }" type="button" @click="replyEmojiTab = 'emoji'">Emoji</button>
              <button :class="{ active: replyEmojiTab === 'kaomoji' }" type="button" @click="replyEmojiTab = 'kaomoji'">颜文字</button>
            </div>
            <div v-if="replyEmojiTab === 'emoji'" class="emoji-grid">
              <button
                v-for="emoji in replyEmojiList"
                :key="emoji"
                type="button"
                class="emoji-item"
                @click="insertReplyEmoji(emoji)"
              >{{ emoji }}</button>
            </div>
            <div v-else class="kaomoji-grid">
              <button
                v-for="kao in replyKaomojiList"
                :key="kao"
                type="button"
                class="kaomoji-item"
                @click="insertReplyEmoji(kao)"
              >{{ kao }}</button>
            </div>
          </div>
        </div>
        <div class="reply-actions">
          <el-button type="primary" native-type="submit" :loading="submitting">
            提交回复
          </el-button>
          <el-button @click="showReply = false">取消</el-button>
        </div>
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
import { getGravatarUrl } from "~/utils/gravatar";

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
const replyEmojiOpen = ref(false);
const replyEmojiTab = ref<"emoji" | "kaomoji">("emoji");

const replyEmojiList = [
  "😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","😉","😌","😍","🥰","😘","😗","😋","😛","😜","🤪",
  "😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡",
  "👍","👎","👏","🙌","🤝","💪","👀","🧠","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💖","💗",
  "🔥","⭐","✨","🎉","🎊","🙏","💯","✅","❌","❓","❗","💡","📌","🔗","💻","📱","🖥️","⌨️","🎵","🌈",
];

const replyKaomojiList = [
  "(｡･ω･｡)","(◕‿◕)","(◠‿◠)","(≧◡≦)","(⌒‿⌒)","(＾▽＾)","(◍•ᴗ•◍)","(づ｡◕‿‿◕｡)づ",
  "(╥_╥)","(╯︵╰,)","(╥﹏╥)","(个_个)","(¬_¬)","(ーー;)","(￣ω￣)","(＾～＾)",
  "(╯°□°）╯︵ ┻━┻","┐(￣ヘ￣)┌","¯\\_(ツ)_/¯","( ´ ▽ ` )ﾉ","(☞ﾟヮﾟ)☞",
  "( ͡° ͜ʖ ͡°)","(⌐■_■)","(＃￣0￣)","(˘▽˘)っ♨","(^_−)☆","(•̀ᴗ•́)و","ರ_ರ","(ᗒᗣᗕ)՞",
];

const insertReplyEmoji = (text: string) => {
  replyForm.content += text;
  replyEmojiOpen.value = false;
};

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

// @提及渲染：将 @用户名 高亮
const renderContent = (content: string) => {
  if (!content) return ""
  return content.replace(
    /(@[^\s@,，。！？!?]+)/g,
    '<span class="mention">$1</span>',
  )
};

// 回复时自动 @ 对方（若未手动输入）
const showReplyForm = () => {
  const mention = `@${props.comment.authorName} `
  if (!replyForm.content.includes(`@${props.comment.authorName}`)) {
    replyForm.content = mention + replyForm.content
  }
  showReply.value = true
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

  submitting.value = true;
  try {
    await commentApi.create({
      articleId: props.comment.articleId,
      parentId: props.comment.id,
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

<style lang="scss" scoped>
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
  word-break: break-word;
}

.comment-content :deep(.mention) {
  color: var(--color-accent);
  font-weight: 600;
  background: var(--color-accent-light);
  border-radius: 4px;
  padding: 0 4px;
}

.comment-actions {
  margin-bottom: 10px;
}

.reply-form {
  margin-top: 15px;
  padding: 16px;
  background: var(--bg-hover);
  backdrop-filter: blur(8px);
  border-radius: 8px;
  border: 1px solid var(--border-light);
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

.reply-textarea-wrap :deep(.el-textarea__inner) {
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
  background: var(--bg-card);
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

.emoji-picker {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  width: 300px;
  max-height: 250px;
  background: var(--bg-card);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  box-shadow: var(--shadow-elevated);
  overflow-y: auto;
  z-index: 50;
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
  background: rgba(128, 128, 128, 0.15);
}

.kaomoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.kaomoji-item {
  border: 1px solid var(--border-light);
  background: rgba(128, 128, 128, 0.06);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.15s;
}

.kaomoji-item:hover {
  border-color: var(--color-accent);
}

.reply-actions {
  display: flex;
  gap: 10px;
}

@media (max-width: 768px) {
  .reply-form-row {
    grid-template-columns: 1fr;
  }

  .emoji-picker {
    width: 250px;
    right: -30px;
  }
}

.replies {
  position: relative;
  margin-left: 30px;
  border-left: 2px solid var(--border-color);
  padding-left: 15px;
}

/* 嵌套层级连接点 — 可视化评论树 */
.replies::before {
  content: "";
  position: absolute;
  left: -5px;
  top: 24px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-accent);
  border: 2px solid var(--bg-card);
  box-shadow: 0 0 0 1px var(--border-color);
}

@media (max-width: 768px) {
  .replies {
    margin-left: 12px;
    padding-left: 10px;
  }
}
</style>
