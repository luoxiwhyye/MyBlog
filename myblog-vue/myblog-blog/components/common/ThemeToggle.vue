<template>
  <button
    class="theme-toggle"
    :title="isDark ? '切换到亮色模式' : '切换到暗色模式'"
    :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'"
    @click="themeStore.toggle()"
  >
    <!-- 太阳图标（亮色模式） -->
    <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
    <!-- 月亮图标（暗色模式） -->
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </button>
</template>

<script setup lang="ts">
const themeStore = useThemeStore();
const isDark = computed(() => themeStore.isDark);
</script>

<style lang="scss" scoped>
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s,
    box-shadow var(--transition-bounce),
    transform var(--transition-bounce);
  flex-shrink: 0;
}

.theme-toggle:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  box-shadow: var(--shadow-glow);
  transform: scale(1.05);
}

.theme-toggle:active {
  transform: scale(0.96);
}

/* 移动端提升到 44px 触摸目标：原 36px 容易误触。
   放在文件末尾以覆盖上方的 width/height（同 specificity 时后者生效）。 */
@media (max-width: 768px) {
  .theme-toggle {
    width: 44px;
    height: 44px;
  }
}
</style>
