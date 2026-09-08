<template>
  <EmptyState
    :message="message"
    :description="t('featureDisabled.desc')"
  >
    <template #action>
      <NuxtLink to="/home" class="feature-back-link">
        {{ t('featureDisabled.goHome') }}
      </NuxtLink>
    </template>
  </EmptyState>
</template>

<script setup lang="ts">
import { computed } from "vue";

const { t } = useI18n();

const props = defineProps<{
  feature: string;
}>();

const message = computed(() => t('featureDisabled.title', { feature: props.feature }));
</script>

<style lang="scss" scoped>
.feature-back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--color-accent);
  color: #fff;
  font-size: 14px;
  text-decoration: none;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.88;
  }
}
</style>
