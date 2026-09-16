<template>
  <a
    v-if="siteIcp"
    class="site-icp"
    :href="MIIT_URL"
    target="_blank"
    rel="noopener noreferrer"
    :title="t('siteIcp.linkTitle')"
  >
    {{ siteIcp }}
  </a>
</template>

<script setup lang="ts">
/**
 * 站点备案号（合规信息）
 *
 * 抽取为公共组件，供页脚与欢迎页（landing 布局）共用，避免各处各写一份。
 * 未配置 `site_icp` 时整体不渲染，不占位也不留空白。
 *
 * 备案号按惯例链接到工信部备案查询系统，新窗口打开并带 noopener。
 */
const MIIT_URL = "https://beian.miit.gov.cn/";

const settingsStore = useSettingsStore();
const { t } = useI18n();

const siteIcp = computed(() => settingsStore.getSetting("site_icp"));
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.site-icp {
  display: inline-block;
  /* 与 .footer-admin 的 $font-size-sm 统一（原为写死的 13px，两处差 0.1px 但来源不同） */
  font-size: $font-size-sm;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.3s;
}

.site-icp:hover {
  color: var(--color-category-strong);
  text-decoration: underline;
}

.site-icp:focus-visible {
  outline: 2px solid var(--color-accent-deep);
  outline-offset: 2px;
  border-radius: 2px;
}
</style>
