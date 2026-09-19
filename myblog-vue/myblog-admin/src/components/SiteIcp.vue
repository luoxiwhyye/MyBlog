<template>
  <a
    v-if="siteIcp"
    class="site-icp"
    :href="MIIT_URL"
    target="_blank"
    rel="noopener noreferrer"
    title="在工信部备案系统查验"
  >
    {{ siteIcp }}
  </a>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

/**
 * 站点备案号（合规信息）。
 *
 * 与前台 `myblog-vue/myblog-blog/components/common/SiteIcp.vue` **同源** ——
 * 前后台是两个独立工程、没有共享代码目录，所以这里是第二份实现。
 * 判据与行为必须一致：未配置 `site_icp` 时不渲染、链接到工信部查询系统、
 * 新窗口打开且带 noopener。**改一处必须改另一处。**
 */
const MIIT_URL = "https://beian.miit.gov.cn/";

const settingsStore = useSettingsStore();

const siteIcp = computed(() => settingsStore.getSetting('site_icp'));
</script>

<style lang="scss" scoped>
.site-icp {
  display: inline-block;
  font-size: $font-size-sm;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.3s;
}

.site-icp:hover {
  color: var(--color-accent-deep);
  text-decoration: underline;
}

.site-icp:focus-visible {
  outline: 2px solid var(--color-accent-deep);
  outline-offset: 2px;
  border-radius: 2px;
}
</style>
