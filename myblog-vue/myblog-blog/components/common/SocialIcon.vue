<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="activeColor || 'currentColor'"
    aria-hidden="true"
    role="img"
  >
    <path :d="iconDef.path" :fill-rule="iconDef.fillRule" />
  </svg>
</template>

<script setup lang="ts">
import { resolveSocialIcon, socialIconColor } from "~/utils/socialIcons";

/**
 * 社交链接图标：按后台 `social_links` 配置里的可选 `icon` 语义 key 渲染对应品牌图标。
 * - 未配置 / 未识别 key → 回退为通用「外链 / 箭头」图标（resolveSocialIcon 兜底）。
 * - 默认随 `currentColor`（跟随所在链接的文本色与主题），**保持向后兼容**；
 *   只有显式传 `color` 时才上品牌色（兜底图标无品牌色，仍走 currentColor）。
 */
const props = withDefaults(
  defineProps<{
    /** 后台 social_links 每项的 icon 语义 key，如 "github"、"weibo"；为空则回退通用图标 */
    icon?: string;
    /** 图标边长（px） */
    size?: number;
    /**
     * 品牌色开关：
     *   - `false`（默认）：随 `currentColor`，不影响既有调用方
     *   - `true`：使用该 icon 对应的品牌色（按亮 / 暗模式自动切换）
     *   - `string`：直接使用该色值
     */
    color?: boolean | string;
  }>(),
  { icon: "", size: 16, color: false },
);

const iconDef = computed(() => resolveSocialIcon(props.icon));

/** 亮 / 暗模式（用于取品牌色的暗色变体） */
const isDark = ref(false);
let observer: MutationObserver | null = null;

onMounted(() => {
  const root = document.documentElement;
  const sync = () => {
    isDark.value = root.classList.contains("dark");
  };
  sync();
  // 主题通过 <html class="dark"> 切换，观察 class 变化即可
  observer = new MutationObserver(sync);
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});

const activeColor = computed(() => {
  if (!props.color) return "";
  if (typeof props.color === "string") return props.color;
  // 兜底图标无品牌色 → 返回空串，仍走 currentColor
  return socialIconColor(iconDef.value, isDark.value);
});
</script>
