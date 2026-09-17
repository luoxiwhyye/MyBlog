<template>
  <div class="emoji-picker" :class="`emoji-picker--${placement}`">
    <!-- 分组 tab 栏：只做「切分组」一件事，不承载任何其他功能 -->
    <div class="emoji-tabs" role="tablist">
      <button
        v-for="(group, gi) in groups"
        :key="group.id"
        type="button"
        role="tab"
        class="emoji-tab"
        :class="{ active: gi === activeIndex }"
        :title="group.name"
        :aria-selected="gi === activeIndex"
        @click="activeIndex = gi"
      >
        <span class="emoji-tab__cover">
          <img
            v-if="showCoverImage(group)"
            :src="normalizeAssetUrl(group.cover)"
            alt=""
            @error="markCoverFailed(group.id)"
          />
          <span v-else class="emoji-tab__cover-text">{{ coverText(group) }}</span>
        </span>
        <span class="emoji-tab__name">{{ group.name }}</span>
      </button>
    </div>

    <!-- 表情面板：只有表情本身 -->
    <div class="emoji-body">
      <div v-if="activeGroup" class="emoji-grid">
        <button
          v-for="item in activeGroup.emojis"
          :key="item.id"
          type="button"
          class="emoji-item"
          :class="{
            'emoji-item--image': isImage(item.content),
            'kaomoji-item': !isImage(item.content) && item.content.length > 3,
            'is-failed': failedEmojis.has(item.id),
          }"
          :title="isImage(item.content) ? '图片表情' : item.content"
          @click="emit('select', item.content)"
        >
          <img
            v-if="isImage(item.content) && !failedEmojis.has(item.id)"
            :src="normalizeAssetUrl(item.content)"
            alt="表情"
            loading="lazy"
            @error="markEmojiFailed(item.id)"
          />
          <template v-else-if="isImage(item.content)">🖼️</template>
          <template v-else>{{ item.content }}</template>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useEmoji, type EmojiGroupView } from "~/composables/useEmoji";
import { isEmojiImage } from "~/utils/commentRender";
import { normalizeAssetUrl } from "~/utils/image";

const props = withDefaults(
  defineProps<{
    /** 面板弹出方向：top=向上（默认），bottom=向下 */
    placement?: "top" | "bottom";
  }>(),
  { placement: "top" },
);

const emit = defineEmits<{
  select: [content: string];
}>();

const { groups, loadEmoji } = useEmoji();

onMounted(() => {
  void loadEmoji();
});

const activeIndex = ref(0);
const activeGroup = computed(
  () => groups.value[activeIndex.value] || groups.value[0],
);

// 分组标识加载失败 → 回退文本（须用新 Set 赋值才触发更新）
const failedCovers = ref<Set<number>>(new Set());
const failedEmojis = ref<Set<number>>(new Set());

watch(
  () => groups.value.length,
  (len) => {
    if (activeIndex.value >= len) activeIndex.value = 0;
  },
);

const isImage = (content: string) => isEmojiImage(content);

const showCoverImage = (group: EmojiGroupView) =>
  !!group.cover && isEmojiImage(group.cover) && !failedCovers.value.has(group.id);

/**
 * 标识回退：文本标识 > 组内首个文本表情 > 分组名首字。
 * 不在此处硬截字符（颜文字会被砍成残句），超宽交给 CSS 省略号收尾。
 */
const coverText = (group: EmojiGroupView) => {
  if (group.cover && !isEmojiImage(group.cover)) return group.cover;
  const firstText = group.emojis.find((item) => !isEmojiImage(item.content));
  if (firstText) return firstText.content;
  return (group.name || "?").slice(0, 1);
};

const markCoverFailed = (groupId: number) => {
  const next = new Set(failedCovers.value);
  next.add(groupId);
  failedCovers.value = next;
};

const markEmojiFailed = (emojiId: number) => {
  const next = new Set(failedEmojis.value);
  next.add(emojiId);
  failedEmojis.value = next;
};
</script>

<style lang="scss" scoped>
.emoji-picker {
  position: absolute;
  right: 0;
  z-index: 40;
  width: 380px;
  max-width: calc(100vw - 32px);
  max-height: 320px;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(150%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(150%);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg, 12px);
  box-shadow: var(--shadow-elevated);
  overflow: hidden;
}

/* 向上弹出（评论区/回复框）：避开下方内容 */
.emoji-picker--top {
  bottom: calc(100% + 8px);
}

/* 向下弹出（留言板）：避开上方卡片头，下方留白充足 */
.emoji-picker--bottom {
  top: calc(100% + 4px);
}

/* ===== 分组 tab 栏：图标与文字分列 + gap 间隔 + 省略号兜底，杜绝叠加 ===== */
.emoji-tabs {
  display: flex;
  gap: 6px;
  flex: 0 0 auto;
  padding: 8px 8px 6px;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid var(--border-light);
}

.emoji-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  min-width: 0;
  max-width: 150px;
  padding: 4px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: var(--bg-hover);
  }

  &.active {
    background: var(--color-accent-light);
    color: var(--color-accent-deep);
  }
}

/* 标识列：图片固定 18×18；文本（如颜文字）按内容伸展到上限，避免被裁成残句 */
.emoji-tab__cover {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 18px;
  height: 18px;
  max-width: 64px;
  font-size: 15px;
  line-height: 1;
  overflow: hidden;
  white-space: nowrap;

  img {
    flex: 0 0 18px;
    width: 18px;
    height: 18px;
    object-fit: contain;
    border-radius: 3px;
  }
}

/* 文本须是独立元素：flex 容器上的 text-overflow 对匿名文本项不生效 */
.emoji-tab__cover-text {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.emoji-tab__name {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ===== 表情面板 ===== */
.emoji-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 8px;
  overflow-y: auto;
  overflow-x: hidden;
}

.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: flex-start;
}

.emoji-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 2px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  overflow: hidden;
  transition: background 0.15s;

  &:hover {
    background: var(--bg-hover);
  }

  img {
    width: 26px;
    height: 26px;
    object-fit: contain;
    border-radius: 4px;
  }

  &.is-failed {
    font-size: 14px;
    color: var(--text-muted);
  }
}

/* 颜文字：宽度自适应 + 允许换行，避免撑破面板产生横向滚动 */
.kaomoji-item {
  width: auto;
  max-width: 100%;
  height: auto;
  min-height: 28px;
  padding: 4px 8px;
  font-size: 13px;
  white-space: normal;
  word-break: break-all;
  overflow-wrap: anywhere;
  border: 1px solid var(--border-light);
}

@media (max-width: 640px) {
  .emoji-picker {
    width: 100%;
    max-width: 320px;
  }
}
</style>
