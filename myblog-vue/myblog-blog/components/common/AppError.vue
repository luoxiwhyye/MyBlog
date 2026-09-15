<template>
  <div class="app-error">
    <div class="error-icon" aria-hidden="true">
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
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    </div>
    <p class="error-message">{{ title }}</p>
    <p v-if="description" class="error-desc">{{ description }}</p>
    <slot name="action">
      <button v-if="retryable" type="button" class="error-action" @click="emit('retry')">
        <svg
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
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M8 16H3v5" />
        </svg>
        {{ retryText }}
      </button>
    </slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
  retryable?: boolean;
  retryText?: string;
}>();

const emit = defineEmits<{
  (e: "retry"): void;
}>();
</script>

<style lang="scss" scoped>
.app-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 64px 20px;
  gap: 12px;
}

.error-icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  color: var(--color-danger);
  box-shadow: var(--shadow-card);
  margin-bottom: 4px;
}

.error-message {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.error-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
  max-width: 380px;
}

.error-action {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: var(--color-accent);
  color: var(--color-accent-text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
}

.error-action:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}
</style>
