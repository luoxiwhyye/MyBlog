<template>
  <component
    :is="isCopy ? 'button' : 'a'"
    class="social-link-item"
    :type="isCopy ? 'button' : undefined"
    :href="isCopy ? undefined : item.url"
    :target="isCopy ? undefined : '_blank'"
    :rel="isCopy ? undefined : 'noopener noreferrer'"
    :title="title"
    :aria-label="title"
    @click="isCopy ? handleCopy() : undefined"
  >
    <SocialIcon class="social-link-icon" :icon="item.icon" :size="size" :color="true" />
    <span>{{ item.name }}</span>
    <!-- 复制型链接加一个极小的复制图示：否则点下去是「复制」而非「跳转」这件事无从预判 -->
    <svg
      v-if="isCopy"
      class="social-link-copy-glyph"
      xmlns="http://www.w3.org/2000/svg"
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  </component>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { copyToClipboard } from "~/utils/clipboard";
import { resolveSocialAction, type SocialLinkItem } from "~/utils/socialLinks";

/**
 * 单条社交链接。
 *
 * 点击行为由 `social_links` 条目的 `action` 决定（见 `utils/socialLinks.ts`）：
 *   - `link`（默认）→ 渲染 `<a target="_blank">` 新标签页跳转
 *   - `copy` → 渲染 `<button>`，把 `url` 复制到剪贴板并弹提示
 *
 * 为什么做成组件而不是在各页面各写一遍：后台维护社交链接时是以「同一种条目」配置的，
 * 三处前台（首页 / 欢迎页 / 关于页）的**样式各不相同、但结构与行为完全一致**，
 * 把「a 还是 button」这个分支复制三份最容易漏改。样式仍由各页面的 scoped CSS 提供
 * （class 透传到本组件根元素），因此这里不接管外观。
 */
const props = withDefaults(
  defineProps<{
    /** 社交链接条目 */
    item: SocialLinkItem;
    /** 图标边长（px），与各页面原有取值保持一致 */
    size?: number;
  }>(),
  { size: 16 },
);

const { t } = useI18n();

const isCopy = computed(() => resolveSocialAction(props.item) === "copy");

/** title / aria-label：复制型额外说明动作，避免点下去才知道不是跳转 */
const title = computed(() =>
  isCopy.value
    ? `${props.item.name} · ${t("socialLink.copyHint")}`
    : props.item.name,
);

const handleCopy = async () => {
  const ok = await copyToClipboard(props.item.url);
  if (ok) {
    ElMessage.success(t("socialLink.copied"));
  } else {
    ElMessage.warning(t("socialLink.copyFailed"));
  }
};
</script>

<style lang="scss" scoped>
.social-link-item {
  /* 仅补 <button> 相对 <a> 多出的 UA 默认值。
     其余外观（背景 / 边框 / 内边距 / 字号 / 颜色 / 圆角）由调用页面的 scoped 样式提供，
     故这里刻意不设置，避免与之争优先级。 */
  font-family: inherit;
  text-align: inherit;
  cursor: pointer;
}

/* 图标不参与 flex 收缩，且用 block 消除内联 SVG 的 baseline 错位
   （原先由各页面各自声明，现统一到这里） */
.social-link-icon {
  flex: 0 0 auto;
  display: block;
}

/* 复制图示：小一号、略淡，不抢图标与文字的主次 */
.social-link-copy-glyph {
  flex: 0 0 auto;
  display: block;
  opacity: 0.55;
}
</style>
