<template>
  <footer class="footer">
    <div class="container">
      <!-- 上行：站点标语（居中，允许换行） -->
      <p v-if="siteDescription" class="slogan">{{ siteDescription }}</p>

      <!-- 下行：版权 + 备案号 + 后台入口，成组居中并排。
           两项可选项都是「未配置即不渲染」，flex + gap 让配置缺省时也不留空洞。 -->
      <div class="footer-meta">
        <p class="copyright">
          &copy; {{ new Date().getFullYear() }} {{ siteAuthor || "MyBlog" }}. {{ t('footer.rights') }}
        </p>
        <!-- 备案号：未配置时不渲染（详见 components/common/SiteIcp.vue） -->
        <SiteIcp />
        <!-- 后台入口：站长工具，不占主导航（避免破坏访客信息层级）。
             链接目标由「后台 → 基本设置 → 后台入口」决定（可填完整 URL 或相对路径），
             未配置时整项不渲染，不占位也不留空白。 -->
        <a
          v-if="siteAdminUrl"
          class="footer-admin"
          :href="siteAdminUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('footer.adminEntry') }}
        </a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const settingsStore = useSettingsStore();
const bloggerStore = useBloggerStore();
const { t } = useI18n();

await Promise.all([settingsStore.ensureSettings(), bloggerStore.ensureProfile()]);

const siteAuthor = computed(() => bloggerStore.nickname());
const siteDescription = computed(
  () => settingsStore.getSetting("site_description") || "",
);
const siteAdminUrl = computed(() => settingsStore.getSetting("site_admin_url"));
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.footer {
  position: relative;
  /* 玻璃质感：采用与全站卡片相同的 --bg-card 底色 + backdrop-filter 配方。
     页脚原先只有 --bg-card、没有模糊，是背景图透出时全站唯一「半透明却不像玻璃」的区域。
     注意：这里**不**加 border —— 全站卡片用 --glass-border 描边，而页脚的上边缘按设计规范
     由下方 ::before 的渐变细线承担（规范要求「多用间距代替硬边框」）。
     Header 刻意不用 backdrop-filter（它会创建 containing block，把内部 el-drawer 的
     position: fixed 裁掉）；页脚没有固定定位后代，可以安全使用。 */
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  padding: $spacing-6 0;
  transition: background-color 0.3s, border-color 0.3s;
  /* 裁剪 :after 柔光装饰圆的向下溢出，避免其撑大文档滚动高度，
     在页面底部形成 body 之外的奇怪留白 */
  overflow: hidden;
}

/* 顶部「天光渐变」细分隔：设计规范里保留的渐变性边框实例，颜色随主题色联动
   （--color-category / --color-accent）。
   规范要求「多用间距代替硬边框，保留的边框用渐变细线」，故这里**不**用
   border-top：上边缘由这条渐变线承担，不要改成实线边框。 */
.footer::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-category),
    var(--color-accent),
    transparent
  );
  opacity: 0.7;
}

/* 居中柔光装饰（呼应背景，无溢出、不遮文字）；色值走主题色的装饰维度 */
.footer::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--deco-a), transparent 70%);
  pointer-events: none;
  /* 两行分层后柔光圆正好压在下行元信息文字后面，从 0.45 降到 0.3 减弱干扰 */
  opacity: 0.3;
}

/* 栏宽与水平内边距必须与 .main-content 一致，否则页脚文字会比正文左右各外扩一截
   （原先 max-width 1400px vs 正文 1200px，实测文字错位 103px）。
   两处共用 $layout-max-width / $layout-gutter，避免再次各自漂移。

   2026-09-15 改为**两行分层**：上行 slogan 居中、下行元信息成组居中。
   改前是 `space-between` 的左右两块 —— 1200px 容器里常见文案下中间会留 ≥400px 空档，
   且单段 slogan 用 `align-items: center` 对齐两行块的整体中线，视觉上既没贴版权
   也没贴 meta，是「信息分散」的根源。 */
.container {
  width: 100%;
  max-width: $layout-max-width;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-3;
  padding: 0 $layout-gutter;
}

.copyright {
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s;
}

/* 版权行与元信息（备案号 + 后台入口）成组居中并排（原先是「版权在上、元信息在下」两行）。 */
.footer-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: $spacing-3;
}

.footer-admin {
  font-size: $font-size-sm;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.3s;
}

.footer-admin:hover {
  color: var(--color-category-strong);
  text-decoration: underline;
}

.slogan {
  color: var(--text-muted);
  /* $font-size-sm = 0.875rem，在 15px 根字号下约 13.1px，与原先写死的 13px 基本一致 */
  font-size: $font-size-sm;
  text-align: center;
  line-height: $line-height-relaxed;
  margin: 0;
}

/* ≤480px 与 .main-content / 顶栏同步收窄水平留白，保持左右边缘对齐 */
@media (max-width: 480px) {
  .container {
    padding: 0 $layout-gutter-mobile;
  }
}
</style>
