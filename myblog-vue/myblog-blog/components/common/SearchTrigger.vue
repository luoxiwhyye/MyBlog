<template>
  <button
    type="button"
    class="search-trigger"
    :title="`${t('commandPalette.open')} · ${t('commandPalette.hotkey')}`"
    :aria-label="t('commandPalette.open')"
    @click="open()"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
    <span class="search-trigger__hint">{{ t("commandPalette.hotkey") }}</span>
  </button>
</template>

<script setup lang="ts">
const { open } = useCommandPalette();
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.search-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--border-color, #d3d3d3);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary, #666);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s,
    box-shadow var(--transition-bounce),
    transform var(--transition-bounce);
}

.search-trigger:hover {
  background: var(--bg-hover, #f0f0f0);
  color: var(--text-primary, #333);
  border-color: var(--color-category);
  box-shadow: var(--shadow-glow);
  transform: scale(1.05);
}

.search-trigger:active {
  transform: scale(0.97);
}

.search-trigger:focus-visible {
  outline: 2px solid var(--color-category);
  outline-offset: 2px;
}

.search-trigger__hint {
  white-space: nowrap;
}

/* 中等宽度（导航仍内联展示）先收起文字提示，避免与导航挤在一起 */
@media (max-width: 1200px) {
  .search-trigger__hint {
    display: none;
  }
}

/* 移动端：与汉堡按钮一致提升到 44px 触摸目标，只留图标 */
@media (max-width: 992px) {
  .search-trigger {
    width: 44px;
    height: 44px;
    padding: 0;
  }
}
</style>
