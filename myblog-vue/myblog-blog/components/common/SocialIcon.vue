<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    role="img"
  >
    <path :d="iconDef.path" />
  </svg>
</template>

<script setup lang="ts">
import { resolveSocialIcon } from "~/utils/socialIcons";

/**
 * 社交链接图标：按后台 `social_links` 配置里的可选 `icon` 语义 key 渲染对应品牌图标。
 * - 未配置 / 未识别 key → 回退为通用「外链 / 箭头」图标（resolveSocialIcon 兜底）。
 * - 颜色统一随 currentColor，跟随所在链接的文本色与主题。
 */
const props = withDefaults(
  defineProps<{
    /** 后台 social_links 每项的 icon 语义 key，如 "github"、"weibo"；为空则回退通用图标 */
    icon?: string;
    /** 图标边长（px） */
    size?: number;
  }>(),
  { icon: "", size: 16 },
);

const iconDef = computed(() => resolveSocialIcon(props.icon));
</script>
