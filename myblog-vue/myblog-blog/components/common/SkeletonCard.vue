<template>
  <div class="skeleton-card">
    <el-skeleton animated>
      <template #template>
        <div v-if="cover" class="skeleton-cover">
          <el-skeleton-item variant="image" class="skeleton-cover-img" />
        </div>
        <div class="skeleton-line">
          <el-skeleton-item variant="h3" style="width: 60%" />
          <el-skeleton-item
            v-for="n in rows"
            :key="n"
            variant="text"
            :style="`width: ${n === 1 ? '90%' : n === 2 ? '75%' : '40%'}`"
          />
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    cover?: boolean;
    rows?: number;
  }>(),
  { cover: true, rows: 2 },
);
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.skeleton-card {
  display: flex;
  flex-direction: column;
  padding: $spacing-4;
  border-radius: $border-radius-md;
  overflow: hidden;
  /* 复用全局毛玻璃卡片质感，保证骨架屏与真实卡片观感一致 */
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
}

.skeleton-cover {
  width: 100%;
  height: clamp(108px, 16vw, 180px);
  border-radius: $border-radius-sm;
  overflow: hidden;
  background: var(--bg-hover);
  margin-bottom: $spacing-3;
}

.skeleton-cover-img {
  width: 100%;
  height: 100%;
}

.skeleton-line {
  display: flex;
  flex-direction: column;
  gap: $spacing-2;
}
</style>
