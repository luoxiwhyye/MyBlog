<template>
  <span v-if="siteIcp || policeIcp" class="site-filing">
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
    <a
      v-if="policeIcp"
      class="site-icp"
      :href="policeUrl"
      target="_blank"
      rel="noopener noreferrer"
      title="在公安部备案系统查验"
    >
      <img class="site-icp__icon" src="/police.png" alt="" />
      {{ policeIcp }}
    </a>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { buildPoliceIcpUrl } from '@/utils/policeIcp'

/**
 * 站点备案信息（合规项）。
 *
 * 承载两条备案号：工信部 ICP 备案号（`site_icp`）与公安联网备案号（`site_police_icp`）。
 * 与前台 `myblog-vue/myblog-blog/components/common/SiteIcp.vue` **同源** ——
 * 前后台是两个独立工程、没有共享代码目录，所以这里是第二份实现。
 * 判据与行为必须一致：未配置的条目不渲染、都未配置时整体不渲染、
 * 各自链接到对应的官方查询系统、新窗口打开且带 noopener。**改一处必须改另一处。**
 * 公安备案那条额外带官方下发的图标（`public/police.png`，仓库内的静态文件，不是配置项）。
 */
const MIIT_URL = 'https://beian.miit.gov.cn/'

const settingsStore = useSettingsStore()

const siteIcp = computed(() => settingsStore.getSetting('site_icp'))
const policeIcp = computed(() => settingsStore.getSetting('site_police_icp'))
const policeUrl = computed(() => buildPoliceIcpUrl(policeIcp.value))
</script>

<style lang="scss" scoped>
/* 备案号成组：两条都配置时并排，窄屏（登录页）自动换行。
   用 center 对齐 —— 公安那条带图标，与纯文字的 ICP 那条按盒高居中才平齐
   （baseline 对齐时，行内 flex 盒的基线取首个子项【图标底边】，整条会被抬高）。 */
.site-filing {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: $spacing-2;
}

.site-icp {
  display: inline-flex;
  align-items: center;
  font-size: $font-size-sm;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.3s;
}

/* 公安备案图标（官方下发素材，62×67）：只定高、宽自适应，不拉变形。
   alt 留空 —— 图标是装饰性的，语义由旁边的备案号文字承担。 */
.site-icp__icon {
  height: 16px;
  width: auto;
  margin-right: $spacing-1;
  flex: 0 0 auto;
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
