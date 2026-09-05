<template>
  <div class="message-board-page">
    <div class="page-header">
      <h1>{{ t('messageBoard.title') }}</h1>
      <p class="page-desc">{{ t('messageBoard.description') }}</p>
    </div>

    <!-- 发表留言 -->
    <el-card class="message-form-card" shadow="never">
      <template #header>
        <div class="form-header">
          <span>{{ t('messageBoard.leave') }}</span>
          <span v-if="submitted" class="form-hint">{{ t('messageBoard.pendingHint') }}</span>
        </div>
      </template>
      <el-form @submit.prevent="handleSubmit">
        <div class="message-form-row">
          <el-input v-model="form.authorName" :placeholder="t('messageBoard.namePlaceholder')" class="form-name" />
          <el-input v-model="form.authorEmail" :placeholder="t('messageBoard.emailPlaceholder')" class="form-email" />
          <el-input v-model="form.authorUrl" :placeholder="t('messageBoard.urlPlaceholder')" class="form-url" />
        </div>
        <div class="message-textarea-wrap">
          <el-input
            v-model="form.content"
            type="textarea"
            :placeholder="t('messageBoard.contentPlaceholder')"
            :rows="4"
          />
          <button type="button" class="emoji-btn" title="插入表情" @click="emojiOpen = !emojiOpen">😊</button>
          <div v-if="emojiOpen" class="emoji-picker">
            <div class="emoji-tabs">
              <button :class="{ active: emojiTab === 'emoji' }" type="button" @click="emojiTab = 'emoji'">Emoji</button>
              <button :class="{ active: emojiTab === 'kaomoji' }" type="button" @click="emojiTab = 'kaomoji'">颜文字</button>
            </div>
            <div v-if="emojiTab === 'emoji'" class="emoji-grid">
              <button v-for="emoji in emojiList" :key="emoji" type="button" class="emoji-item" @click="insertEmoji(emoji)">{{ emoji }}</button>
            </div>
            <div v-else class="kaomoji-grid">
              <button v-for="kao in kaomojiList" :key="kao" type="button" class="kaomoji-item" @click="insertEmoji(kao)">{{ kao }}</button>
            </div>
          </div>
        </div>
        <div class="message-form-actions">
          <el-button type="primary" native-type="submit" :loading="submitting">
            {{ t('messageBoard.submit') }}
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 留言列表 -->
    <div v-if="pending" class="message-loading">
      <el-skeleton animated :rows="4" />
    </div>
    <EmptyState
      v-else-if="messages.length === 0"
      :message="t('messageBoard.title')"
      :description="t('messageBoard.empty')"
      action-text="返回首页"
      action-to="/home"
    />
    <div v-else class="message-list">
      <div v-for="message in messages" :key="message.id" class="message-item">
        <img
          class="message-avatar"
          :src="getGravatarUrl(message.authorEmail, 44)"
          :alt="message.authorName"
          width="44"
          height="44"
          loading="lazy"
        />
        <div class="message-body">
          <div class="message-head">
            <span class="message-author">
              <a
                v-if="message.authorUrl"
                :href="normalizeUrl(message.authorUrl)"
                target="_blank"
                rel="noopener noreferrer ugc"
              >{{ message.authorName }}</a>
              <template v-else>{{ message.authorName }}</template>
            </span>
            <time class="message-date">{{ formatDateTime(message.createdAt) }}</time>
          </div>
          <div class="message-content">{{ message.content }}</div>
        </div>
      </div>

      <div v-if="hasMore" class="message-load-more">
        <el-button :loading="loadingMore" @click="loadMore">
          {{ t('messageBoard.loadMore') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { ElMessage } from "element-plus";
import { messageBoardApi } from "~/api";
import type { MessageBoard, PaginatedResponse } from "~/types";
import { formatDateTime } from "~/utils/format";
import { getGravatarUrl } from "~/utils/gravatar";

usePageSeo({
  title: "留言板",
  description: "在这里留下您的足迹与想法，与我交流分享。",
});

const { t } = useI18n();

const PAGE_SIZE = 20;

const emptyPage = (): PaginatedResponse<MessageBoard> => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: PAGE_SIZE,
});

const { data, pending, refresh } = await useAsyncData(
  "message-board",
  async () => {
    try {
      const res = await messageBoardApi.getList({ page: 1, pageSize: PAGE_SIZE });
      return res.data;
    } catch {
      return emptyPage();
    }
  },
  { default: emptyPage },
);

const messages = computed(() => data.value.list || []);
const hasMore = computed(() => data.value.list.length < data.value.total);
const loadingMore = ref(false);

const page = ref(1);

const loadMore = async () => {
  loadingMore.value = true;
  try {
    const nextPage = page.value + 1;
    const res = await messageBoardApi.getList({
      page: nextPage,
      pageSize: PAGE_SIZE,
    });
    data.value = {
      ...data.value,
      list: [...data.value.list, ...(res.data.list || [])],
      total: res.data.total,
      page: nextPage,
    };
    page.value = nextPage;
  } catch {
    ElMessage.error(t("messageBoard.loadError") || "加载失败");
  } finally {
    loadingMore.value = false;
  }
};

// 发言表单
const form = reactive({
  authorName: "",
  authorEmail: "",
  authorUrl: "",
  content: "",
});

const submitting = ref(false);
const submitted = ref(false);
const emojiOpen = ref(false);
const emojiTab = ref<"emoji" | "kaomoji">("emoji");

const emojiList = [
  "😀","😃","😄","😁","😅","😂","🤣","😊","😇","🙂","😉","😌","😍","🥰","😘","😗","😋","😛","😜","🤪",
  "😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡",
  "👍","👎","👏","🙌","🤝","💪","👀","🧠","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","💖","💗",
  "🔥","⭐","✨","🎉","🎊","🙏","💯","✅","❌","❓","❗","💡","📌","🔗","💻","📱","🖥️","⌨️","🎵","🌈",
  "🍀","🌻","🌙","☁️","🚀","🌊","🎈","🎁","🍰","☕","🐱","🐶","🦋","🌸","🌿","🍃","🎨","🎬","📚","✈️",
];

const kaomojiList = [
  "(｡･ω･｡)","(◕‿◕)","(◠‿◠)","(≧◡≦)","(⌒‿⌒)","(＾▽＾)","(◍•ᴗ•◍)","(づ｡◕‿‿◕｡)づ",
  "(╥_╥)","(╯︵╰,)","(╥﹏╥)","(个_个)","(¬_¬)","(ーー;)","(￣ω￣)","(＾～＾)",
  "(╯°□°）╯︵ ┻━┻","┐(￣ヘ￣)┌","¯\\_(ツ)_/¯","( ´ ▽ ` )ﾉ","(☞ﾟヮﾟ)☞",
  "( ͡° ͜ʖ ͡°)","(⌐■_■)","(＃￣0￣)","(˘▽˘)っ♨","(^_−)☆","(•̀ᴗ•́)و","ರ_ರ","(ᗒᗣᗕ)՞",
];

const insertEmoji = (text: string) => {
  form.content += text;
  emojiOpen.value = false;
};

const normalizeUrl = (url: string) => {
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

const handleSubmit = async () => {
  if (!form.authorName || !form.content) {
    ElMessage.warning(t("messageBoard.fillRequired") || "请填写昵称和内容");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.authorEmail)) {
    ElMessage.warning(t("messageBoard.invalidEmail") || "请输入有效的邮箱地址");
    return;
  }
  if (form.authorUrl && !/^https?:\/\//i.test(form.authorUrl)) {
    ElMessage.warning(t("messageBoard.invalidUrl") || "网址需以 http(s):// 开头");
    return;
  }

  submitting.value = true;
  try {
    await messageBoardApi.create({
      authorName: form.authorName,
      authorEmail: form.authorEmail,
      authorUrl: form.authorUrl || undefined,
      content: form.content,
    });
    ElMessage.success(t("messageBoard.success") || "留言成功");
    submitted.value = true;
    form.authorName = "";
    form.authorEmail = "";
    form.authorUrl = "";
    form.content = "";
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || t("messageBoard.fail") || "留言失败");
  } finally {
    submitting.value = false;
  }
};
</script>

<style lang="scss" scoped>
@use "../assets/css/abstracts/variables" as *;

.message-board-page {
  max-width: 820px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 24px;

  h1 {
    font-size: clamp(1.5rem, 3.5vw, 2rem);
    color: var(--text-primary);
    margin: 0 0 8px;
  }
}

.page-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
}

.message-form-card {
  margin-bottom: 24px;
  border-radius: 16px;
  background: var(--bg-card);
  backface-visibility: hidden;
  /* el-card 默认 overflow:hidden 会裁剪向上/向下弹出的 emoji 面板，改为可见 */
  overflow: visible;
  /* 确保卡内浮层（emoji 面板）能盖过 header/body 等内部层叠上下文 */
  position: relative;
  z-index: 20;

  /* 卡片内部 body 也可能带 overflow:hidden，一并放开 */
  :deep(.el-card__body) {
    overflow: visible;
  }
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.form-hint {
  font-size: 12px;
  color: var(--text-muted);
}

.message-form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;

  .form-name {
    flex: 1;
  }
  .form-email {
    flex: 1;
  }
  .form-url {
    flex: 1;
  }
}

.message-textarea-wrap {
  position: relative;
  /* 确保向上弹出的 emoji 面板能覆盖上方元素（如卡片 header） */
  z-index: 30;
}

.emoji-btn {
  position: absolute;
  right: 4px;
  bottom: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  opacity: 0.6;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
}

.emoji-picker {
  position: absolute;
  right: 0;
  /* 向下弹出：避开上方卡片 header，且页面下方留白充足、不会被容器裁剪 */
  top: calc(100% + 4px);
  /* 高于 form 内元素，防止被遮挡 */
  z-index: 40;
  width: 380px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  box-shadow: var(--shadow-elevated);
}

.emoji-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;

  button {
    border: none;
    background: transparent;
    padding: 4px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-secondary);

    &.active {
      background: var(--color-accent-light);
      color: var(--color-accent);
    }
  }
}

.emoji-grid,
.kaomoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
}

.emoji-item,
.kaomoji-item {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
  border-radius: 6px;
  word-break: break-all;

  &:hover {
    background: var(--bg-hover);
  }
}

.message-form-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.message-loading {
  padding: 24px 0;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  backdrop-filter: blur(var(--glass-blur));
}

.message-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
}

.message-body {
  flex: 1;
  min-width: 0;
}

.message-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.message-author {
  font-weight: 600;
  color: var(--text-primary);

  a {
    color: var(--color-accent);
    text-decoration: none;

    &:hover {
      color: var(--color-category);
    }
  }
}

.message-date {
  font-size: 12px;
  color: var(--text-muted);
}

.message-content {
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.message-load-more {
  text-align: center;
  margin-top: 16px;
}

@media (max-width: 768px) {
  .message-form-row {
    flex-direction: column;
  }
  .emoji-picker {
    width: 320px;
    left: 0;
    right: auto;
  }

  /* 移动端 emoji 按钮提升到 44px 触摸目标 */
  .emoji-btn {
    padding: 12px;
    font-size: 20px;
    right: 2px;
    bottom: 2px;
  }
}
</style>
