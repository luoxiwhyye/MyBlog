<template>
  <span v-if="siteIcp || policeIcp" class="site-filing">
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
    <a
      v-if="policeIcp"
      class="site-icp"
      :href="policeUrl"
      target="_blank"
      rel="noopener noreferrer"
      :title="t('siteIcp.policeLinkTitle')"
    >
      <img class="site-icp__icon" src="/police.png" alt="" />
      {{ policeIcp }}
    </a>
  </span>
</template>

<script setup lang="ts">
/**
 * 站点备案信息（合规项）
 *
 * 承载两条备案号：工信部 ICP 备案号（`site_icp`）与公安联网备案号（`site_police_icp`），
 * 抽取为公共组件供页脚与欢迎页（landing 布局）共用，避免各处各写一份。
 * 每条都是「未配置即不渲染」，两条都未配置时整体不渲染，不占位也不留空白。
 *
 * 各自链接到对应的官方查询系统，新窗口打开并带 noopener。
 * 公安备案那条额外带官方下发的图标（`public/police.png`，仓库内的静态文件，不是配置项）。
 */
import { buildPoliceIcpUrl } from "~/utils/policeIcp";

const MIIT_URL = "https://beian.miit.gov.cn/";

const settingsStore = useSettingsStore();
const { t } = useI18n();

const siteIcp = computed(() => settingsStore.getSetting("site_icp"));
const policeIcp = computed(() => settingsStore.getSetting("site_police_icp"));
const policeUrl = computed(() => buildPoliceIcpUrl(policeIcp.value));
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

/* 备案号成组：两条都配置时并排，窄屏（欢迎页 / 登录页）自动换行。
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
  /* 与 .footer-admin 的 $font-size-sm 统一（原为写死的 13px，两处差 0.1px 但来源不同） */
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
  color: var(--color-category-strong);
  text-decoration: underline;
}

.site-icp:focus-visible {
  outline: 2px solid var(--color-accent-deep);
  outline-offset: 2px;
  border-radius: 2px;
}
</style>
