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
          <el-button link size="small" @click="emit('reply', comment)">回复</el-button>
        </div>
      </div>

      <div v-if="comment.replies && comment.replies.length" class="replies">
        <BlogComment
          v-for="reply in comment.replies"
          :key="reply.id"
          :comment="reply"
          @reply="(c) => emit('reply', c)"
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

defineOptions({
  name: "BlogComment",
});

const props = defineProps<{
  comment: Comment;
}>();

/**
 * 回复表单**不在这里**渲染：它被提到评论区的表单里（见 pages/article/[id].vue）。
 * 原先就地展开在本条评论下方 —— 子评论只剩一半宽度，表单（3 个输入框 +
 * 富文本 + 勾选框 + 2 个按钮）挤不下。现在只把「要回复哪条」抛给父级。
 */
const emit = defineEmits<{
  reply: [comment: Comment];
  replySubmitted: [];
}>();

const liked = ref(false);
const likeCount = ref(props.comment.likeCount);

const normalizeUrl = (url: string) => {
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

// 标记文本 → 安全 HTML（白名单：仅 [img:url] 与 @提及）
const renderContent = (content: string) => renderCommentContent(content);

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

const handleReplySubmitted = () => {
  emit("replySubmitted");
};
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;
@use "../../assets/css/abstracts/mixins" as *;

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
  /* 内联链接：视觉不变，只把命中区向外撑开（受上下的气泡与描述行约束，取 ±10px） */
  @include tap-target(6px, 10px);
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
  padding: $spacing-5;
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
  color: var(--color-accent-deep);
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
  /* 操作区撑满气泡宽度，两个按钮靠右对齐（原先无 justify-content → flex-start，
     按钮贴左而右侧空出一大片）。
     ⚠️ 不要顺手改 .reply-actions（回复表单里的「提交回复 / 取消」）—— 表单按钮靠左是惯例。 */
  justify-content: flex-end;
  gap: 8px;
  margin-top: 2px;
}

/* 点赞 / 回复：视觉高度仅 22px，靠 ::after 把命中区撑到 44px（按钮间距 8px → 横向只能 ±4）。 */
.comment-actions :deep(.el-button) {
  @include tap-target(4px, 11px);
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

/* 邮件订阅开关：位于输入框与操作按钮之间，默认不勾 */
.reply-form-notify {
  /* display: flex（块级）让它独占一行，不依赖后续元素是否块级，理由同文章页 */
  display: flex;
  margin-bottom: 12px;

  /* 勾选框本身只有 14×14、整行 32px —— 移动端把整行提到 44px 触摸目标 */
  @media (max-width: 768px) {
    min-height: $touch-target-min;
    align-items: center;
  }

  :deep(.el-checkbox__label) {
    font-size: $font-size-sm;
    color: var(--text-secondary);
  }
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

  /* ===== 子评论：「分支式」排版 =====
     原先子评论仍是「头像 + 内容」两列，且外面还有 16px 缩进 + 10px 内边距 + 2px 竖线，
     再减掉 36px 头像与间距 → 正文实际只剩约 210/356 = **59%** 宽度，手机上一行放不下
     几个字。移动端改成分支树常见的写法：
       · 去掉子评论头像（侧边竖线已能表达从属关系）
       · 缩进收到 12px（竖线的位置）
     这样正文回到 ~85% 宽度。
     ⚠️ 只影响移动端；桌面端保持「头像 + 内容」原样。 */
  .replies {
    margin-left: 0;
    padding-left: 12px;
  }

  .replies .avatar {
    display: none;
  }

  /* 气泡尾巴是指向头像的，头像没了尾巴就悬空了 */
  .replies .bubble::before {
    display: none;
  }

  .replies .bubble {
    border-top-left-radius: var(--radius-card-lg);
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
