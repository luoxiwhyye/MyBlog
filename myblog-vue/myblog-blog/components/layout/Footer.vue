<template>
  <footer class="footer">
    <div class="container">
      <!-- 自上而下三行：备案号 → 版权 → 站点描述。
           备案是合规信息，放最上；三项都为「未配置即不渲染」，
           由 container 的 flex 列布局均分间距，配置缺省时也不留空洞。 -->
      <SiteIcp />
      <p class="copyright">
        &copy; {{ new Date().getFullYear() }} {{ siteAuthor || "MyBlog" }}. {{ t('footer.rights') }}
      </p>
      <p v-if="siteDescription" class="slogan">{{ siteDescription }}</p>
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

   三行分层：备案 / 版权 / 描述自上而下，靠 flex 列 + gap 均分间距；
   不用 space-between —— 1200px 容器下三行会被拉到上下贴边、中间留下大片空白。 */
.container {
  width: 100%;
  max-width: $layout-max-width;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: $spacing-3;
  padding: 0 $layout-gutter;
}

.copyright {
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s;
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
    /* 三行之间的间距也收紧一档（页脚实测 127px，其中上下 padding 占 41.9px） */
    gap: $spacing-2;
  }

  .footer {
    padding: $mobile-container-padding 0;
  }
}
</style>
