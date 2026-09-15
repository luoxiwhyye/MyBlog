<template>
  <header class="page-head">
    <div class="page-head__text">
      <h1 class="page-head__title">{{ title }}</h1>
      <p v-if="description" class="page-head__desc">{{ description }}</p>
    </div>
    <!-- 右侧插槽：目前只用于详情页把面包屑放到与标题同一行（靠 margin-left:auto 靠右） -->
    <slot />
  </header>
</template>

<script setup lang="ts">
/**
 * 站内页页头卡（分类 / 标签 / 归档 / 友链 / 留言板 / 关于）
 *
 * 一张横向玻璃卡，第一行「渐变竖条 + 标题」（+ 右侧可选内容，如面包屑），说明另起一行。
 *
 * 为什么要抽组件：改之前 8 个站内页的页头是**裸文字浮在背景图上**，且各写各的 ——
 * 字重 700/800 混用、`text-shadow` 单层/双层/无三态并存、说明字号 14/15px 混用，
 * 与全站「玻璃卡」的语言割裂（这正是「页头显得突兀」的来源）。统一到这里后，
 * 以后调页头只改这一个文件。
 *
 * 两个刻意的取舍：
 * 1. **竖条而非「页面性质胶囊」**：胶囊（如「分类」）与标题（也是「分类」）在同一页会
 *    重复同一句话。竖条是 friends 页既有写法，也是设计规范里 `--gradient-brand`
 *    规定的用途（「标题竖条」）。
 * 2. **卡内标题一律不要 `text-shadow` / `--text-glow`**：光晕的用途是「文字直接压在
 *    背景图上时保可读性」，卡内已有 `--bg-card` 兜底，加了只会让字发虚。
 *    全站现在只有两个页面还需要它：欢迎页 `pages/index.vue`（整屏背景图 + 极简，
 *    标题直接压在图上）与 `layouts/landing.vue` 的备案号。
 *    文章页标题虽然也在卡内，故一并去掉了光晕。
 */
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.page-head {
  /* 走站点唯一的卡片配方（abstracts/_mixins.scss）。
     内边距用 $spacing-5/$spacing-6：均 ≥ 留白下限 $spacing-5（≈18.75px）。
     横向布局：左列标题 + 说明、右侧插槽（面包屑），align-items: flex-start
     保证说明换行时标题仍与右侧插槽首行对齐。 */
  @include card-glass($padding: $spacing-5 $spacing-6);
  display: flex;
  align-items: flex-start;
  gap: $spacing-4;
  margin-bottom: $spacing-6;
}

.page-head__text {
  /* flex 子项默认 min-width:auto，长标题不会收缩 → 需显式 0 才能省略/换行 */
  min-width: 0;
  flex: 1;
}

.page-head__title {
  display: flex;
  align-items: center;
  gap: 10px;
  /* 站内页 h1 基线：全站 6 类站内页统一此档，不要再自成一档 */
  font-size: clamp(1.5rem, 3.5vw, 2rem);
  color: var(--text-primary);
  line-height: $line-height-tight;
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;

  &::before {
    content: "";
    flex-shrink: 0;
    width: 6px;
    /* 用 em 跟随 clamp 字号联动，避免固定 28px 在小屏下高出一截 */
    height: 1.1em;
    border-radius: 3px;
    background: var(
      --gradient-brand,
      linear-gradient(180deg, var(--color-category), var(--color-accent))
    );
  }
}

.page-head__desc {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  line-height: $line-height-relaxed;
}

@media (max-width: 768px) {
  .page-head {
    margin-bottom: $spacing-5;
  }
}
</style>
