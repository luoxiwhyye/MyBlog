<template>
  <div class="empty-state">
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
defineProps<{
  message: string;
  description?: string;
  actionText?: string;
  actionTo?: string;
}>();
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 64px 20px;
  gap: 12px;
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
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.2s, transform 0.2s;
}

html.dark .empty-action {
  color: var(--color-accent-deep);
}

.empty-action:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}
</style>
