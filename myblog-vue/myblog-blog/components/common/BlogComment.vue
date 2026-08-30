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
  width: 380px;
  max-height: 300px;
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(150%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(150%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-elevated);
  overflow-y: auto;
  overflow-x: hidden; /* 宽面板下内容完整显示，此规则仅作兜底 */
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

  .emoji-picker {
    width: 320px;
    right: -30px;
  }

  .replies {
    margin-left: 16px;
    padding-left: 10px;
  }
}
</style>
