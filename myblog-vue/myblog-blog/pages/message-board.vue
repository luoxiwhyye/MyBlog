<template>
  <div class="message-board-page">
    <FeatureDisabled v-if="featureDisabled" feature="留言板" />

    <template v-else>
    <PageHeader
      :title="t('messageBoard.title')"
      :description="t('messageBoard.description')"
    />

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
          <CommentInput
            ref="commentInputRef"
            v-model="form.content"
            :placeholder="t('messageBoard.contentPlaceholder')"
            placement="bottom"
          />
        </div>
        <el-checkbox v-model="form.notifyEmail" class="message-form-notify">
          {{ t('messageBoard.notifyApproved') }}
        </el-checkbox>
        <div class="message-form-actions">
          <el-button type="primary" native-type="submit" class="submit-btn" :loading="submitting">
            {{ t('messageBoard.submit') }}
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 留言列表 -->
    <div v-if="pending" class="message-loading">
      <el-skeleton animated :rows="4" />
    </div>
    <AppError
      v-else-if="loadError"
      :title="t('error.loadTitle')"
      :description="t('error.loadDesc')"
      :retry-text="t('error.retry')"
      @retry="retryLoad"
    />
    <EmptyState
      v-else-if="messages.length === 0"
      :message="t('messageBoard.title')"
      :description="t('messageBoard.empty')"
      :action-text="t('notFound.backHome')"
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
          <div class="message-content" v-html="renderMessageContent(message.content)"></div>
        </div>
      </div>

      <div v-if="hasMore" class="message-load-more">
        <el-button :loading="loadingMore" @click="loadMore">
          {{ t('messageBoard.loadMore') }}
        </el-button>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { ElMessage } from "element-plus";
import { messageBoardApi } from "~/api";
import type { MessageBoard, PaginatedResponse } from "~/types";
import { formatDateTime } from "~/utils/format";
import { getGravatarUrl } from "~/utils/gravatar";
import { renderCommentContent } from "~/utils/commentRender";
import CommentInput from "~/components/common/CommentInput.vue";

usePageSeo({
  title: "留言板",
  description: "在这里留下您的足迹与想法，与我交流分享。",
});

const { t } = useI18n();

const settingsStore = useSettingsStore();

// 等待设置加载完成，确保功能开关判断准确
await settingsStore.ensureSettings();

// 功能开关：未配置（''）视为启用；仅显式 'false' 才禁用
const featureDisabled = computed(
  () => settingsStore.getSetting("enable_message_board") === "false",
);

const PAGE_SIZE = 20;

const emptyPage = (): PaginatedResponse<MessageBoard> => ({
  list: [],
  total: 0,
  page: 1,
  pageSize: PAGE_SIZE,
});

const { data, pending, error: listError, refresh } = await useAsyncData(
  "message-board",
  () =>
    messageBoardApi
      .getList({ page: 1, pageSize: PAGE_SIZE })
      .then((res) => res.data),
  { default: emptyPage },
);

const messages = computed(() => data.value.list || []);
const loadError = computed(() => !!listError.value);
const retryLoad = () => refresh();
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
//
// notifyEmail = 邮件订阅开关，**默认不勾**（不接收）。
// 不写进 localStorage：名字 / 邮箱是「便于下次少填」的便利，而订阅是「同意收信」的
// 意愿，两者性质不同 —— 持久化会让回访者在不知情的情况下持续订阅。
// 提交后也不重置：同一次会话里勾了就是勾了，重置等于静默反悔。
const form = reactive({
  authorName: "",
  authorEmail: "",
  authorUrl: "",
  content: "",
  notifyEmail: false,
});

const submitting = ref(false);
const submitted = ref(false);
const commentInputRef = ref<any>(null);

// 标记文本 → 安全 HTML（白名单：仅 [img:url] 与 @提及）
const renderMessageContent = (content: string) => renderCommentContent(content);

const normalizeUrl = (url: string) => {
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

const handleSubmit = async () => {
  // 按 trim 后判空：标记文本里的 `\n` 等不可见字符不算内容
  if (!form.authorName || !form.content.trim()) {
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
      notifyEmail: form.notifyEmail,
    });
    ElMessage.success(t("messageBoard.success") || "留言成功");
    submitted.value = true;
    form.authorName = "";
    form.authorEmail = "";
    form.authorUrl = "";
    // 清空富文本编辑器（会同步 v-model 为空）
    commentInputRef.value?.clear();
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
  /* 确保表情面板能覆盖上方元素（如卡片 header） */
  z-index: 30;
}

.message-form-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

/* 邮件订阅开关：位于输入框与提交按钮之间，默认不勾 */
.message-form-notify {
  /* display: flex（块级）让它独占一行，不依赖后续元素是否块级，理由同文章页 */
  display: flex;
  margin-top: 12px;

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
    color: var(--color-accent-deep);
    text-decoration: none;

    &:hover {
      color: var(--color-category-strong);
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

  /* v-html 注入内容不带 scoped 属性，需 :deep 命中 */
  :deep(.comment-markup-img) {
    max-width: 120px;
    max-height: 120px;
    margin: 0 2px;
    border-radius: 4px;
    vertical-align: middle;
  }

  :deep(.mention) {
    color: var(--color-accent-deep);
    font-weight: 600;
  }
}

.message-load-more {
  text-align: center;
  margin-top: 16px;
}

/* 表单主按钮：移动端撑到 44px 触摸目标（原为控件默认 32px）。
   与后台文章页的发表评论按钮同一口径。 */
@media (max-width: 768px) {
  .submit-btn {
    min-height: $touch-target-min;
  }
}

@media (max-width: 768px) {
  .message-form-row {
    flex-direction: column;
  }
}
</style>
