<template>
  <footer class="footer">
    <div class="container">
      <div>
        <p class="copyright">
          &copy; {{ new Date().getFullYear() }} {{ siteAuthor || "MyBlog" }}. {{ t('footer.rights') }}
        </p>
        <p class="icp" v-if="siteIcp">{{ siteIcp }}</p>
      </div>
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
const siteIcp = computed(() => settingsStore.getSetting("site_icp"));
const siteDescription = computed(
  () => settingsStore.getSetting("site_description") || "",
);
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.footer {
  background: var(--bg-card);
  position: relative;
  padding: $spacing-5 0;
  margin-top: 0;
  transition: background-color 0.3s, border-color 0.3s;
  /* 裁剪 :after 柔光装饰圆的向下溢出，避免其撑大文档滚动高度，
     在页面底部形成 body 之外的奇怪留白 */
  overflow: hidden;
}

/* 顶部青光渐变细分隔（呼应图A天光） */
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

/* 居中柔光装饰（呼应背景，无溢出、不遮文字） */
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
  opacity: 0.45;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
}

.copyright {
  color: var(--text-primary);
  margin-bottom: 4px;
  transition: color 0.3s;
}

.icp {
  color: var(--text-muted);
  font-size: 13px;
  transition: color 0.3s;
}

.slogan {
  color: var(--text-muted);
  font-size: 13px;
  text-align: right;
  max-width: 360px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .container {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
