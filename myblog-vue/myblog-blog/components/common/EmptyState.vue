<template>
  <div class="empty-state" :class="`empty-state--${variant}`">
    <div class="empty-icon" aria-hidden="true">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    </div>
    <p class="empty-message">{{ message }}</p>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <slot name="action">
      <NuxtLink v-if="actionTo" :to="actionTo" class="empty-action">
        {{ actionText }}
      </NuxtLink>
    </slot>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    message: string;
    description?: string;
    actionText?: string;
    actionTo?: string;
    /** card = 自带玻璃卡载体（页面级空态）；plain = 调用方已提供卡片（卡内空态） */
    variant?: "card" | "plain";
  }>(),
  { variant: "card" },
);
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;
@use "../../assets/css/abstracts/mixins" as *;

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: $spacing-3;
}

/* card（默认）：容器本身就是一张玻璃卡，走全站唯一的卡片配方与留白下限。
   空态原先只是一个无底的排版容器，提示文字直接压在背景图上 —— 可读性完全由
   背景图的亮暗决定（压在深蓝区上看不清）。
   plain：调用方已经提供了卡片（文章详情页的评论区、工具箱输出面板），
   此时不能再套一层，否则会变成「卡中卡」。 */
.empty-state--card {
  @include card-glass($spacing-16 $spacing-5);
}

.empty-state--plain {
  /* 卡内空态：垂直留白收一档 —— 外层卡片自己已有内边距，再撑 60px 会显得很空 */
  padding: $spacing-8 $spacing-5;
}

.empty-icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  color: var(--text-muted);
  box-shadow: var(--shadow-card);
  margin-bottom: 4px;
}

/* 卡片形态下图标圆不再自带底色与投影：容器已经有底，再叠一层同色圆看不出来，
   只留描边把图标圈住。 */
.empty-state--card .empty-icon {
  background: transparent;
  box-shadow: none;
}

.empty-message {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
  max-width: 360px;
}

.empty-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 20px;
  border-radius: 8px;
  background: var(--color-accent);
  color: var(--color-accent-text);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s, transform 0.2s;
}

.empty-action:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}
</style>
