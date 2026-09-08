<template>
  <div class="maintenance-page">
    <div class="maintenance-card">
      <div class="maintenance-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      </div>
      <h1 class="maintenance-title">{{ t('maintenance.title') }}</h1>
      <p class="maintenance-desc">{{ t('maintenance.desc') }}</p>
      <p class="maintenance-hint">{{ t('maintenance.hint') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

// 维护页不套默认布局（避免 Header/Footer 受全局维护拦截影响），且禁止收录
definePageMeta({
  layout: false,
});

usePageSeo({
  title: t("maintenance.title"),
  description: t("maintenance.desc"),
});

useSeoMeta({
  robots: "noindex, nofollow",
});
</script>

<style lang="scss" scoped>
.maintenance-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-primary);
}

.maintenance-card {
  max-width: 520px;
  width: 100%;
  padding: 48px 36px;
  text-align: center;
  border-radius: var(--radius-card-lg, 16px);
  background: var(--bg-card);
  border: 1px solid var(--border-light);
}

.maintenance-icon {
  width: 88px;
  height: 88px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--color-accent);
  background: var(--color-accent-soft);
}

.maintenance-title {
  margin: 0 0 12px;
  font-size: clamp(1.4rem, 4vw, 1.8rem);
  color: var(--text-primary);
}

.maintenance-desc {
  margin: 0 0 10px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.maintenance-hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
