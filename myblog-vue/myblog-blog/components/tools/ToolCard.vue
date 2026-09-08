<template>
  <NuxtLink :to="getToolPath(tool)" class="tool-card">
    <div class="tool-card__top">
      <el-icon><component :is="tool.icon" /></el-icon>
      <button
        type="button"
        class="fav-btn"
        :class="{ active: favorite }"
        :title="(favorite ? '取消收藏 ' : '收藏 ') + tool.name"
        @click.prevent.stop="emit('toggle-favorite', tool.id)"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          :fill="favorite ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>
    </div>
    <strong>{{ tool.name }}</strong>
    <p>{{ tool.description }}</p>
    <div class="tool-tags">
      <el-tag
        v-for="keyword in tool.keywords.slice(0, 3)"
        :key="keyword"
        size="small"
        effect="plain"
      >
        {{ keyword }}
      </el-tag>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { getToolPath } from "~/config/tools";
import type { ToolMeta } from "~/types/tool";

/**
 * 工具箱统一卡片。
 * 分类区 / 最近使用·常用推荐 / 我的收藏 三处共用同一组件，
 * 保证「收藏按钮」等能力在所有位置一致（此前分类区卡片缺少收藏入口）。
 */
defineProps<{
  tool: ToolMeta;
  /** 是否已收藏（由父级从 localStorage 状态传入） */
  favorite?: boolean;
}>();

const emit = defineEmits<{
  (event: "toggle-favorite", id: ToolMeta["id"]): void;
}>();
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.tool-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 2vw, 12px);
  padding: clamp(12px, 2.5vw, $spacing-5);
  border-radius: var(--radius-card-lg);
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  text-decoration: none;
  transition:
    transform var(--transition-bounce),
    box-shadow var(--transition-bounce),
    border-color 0.2s ease;
}

.tool-card:hover {
  transform: translateY(-2px) scale(1.005);
  box-shadow: var(--shadow-elevated), var(--shadow-glow);
  border-color: transparent;
}

.tool-card__top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--color-accent);
  font-weight: 600;
}

.fav-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-hover);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

/* 移动端触摸热区：用 ::before 把 30px 视觉目标的命中区扩展到 44px，避免误触 */
.fav-btn::before {
  content: "";
  position: absolute;
  inset: -7px;
}

.fav-btn:hover {
  color: var(--color-fav);
  border-color: var(--color-fav);
}

.fav-btn.active {
  color: var(--color-fav);
  border-color: var(--color-fav-soft);
}

.tool-card strong {
  color: var(--text-primary);
}

.tool-card p {
  color: var(--text-secondary);
  line-height: 1.7;
}

.tool-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
}

/* ===== 移动端（375~430px 真机）：收紧卡片文字与间距 ===== */
@media (max-width: 480px) {
  /* 描述不超过 2 行，避免单列卡片被撑高呈现大而空 */
  .tool-card p {
    font-size: clamp(0.86rem, 3.5vw, 1rem);
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }

  .tool-card strong {
    font-size: clamp(1rem, 4vw, 1.14rem);
  }

  .tool-card__top {
    font-size: clamp(0.93rem, 3.5vw, 1rem);
  }

  .tool-tags {
    gap: 6px;
  }

  .tool-tags :deep(.el-tag) {
    font-size: clamp(0.86rem, 3vw, 0.93rem);
  }
}
</style>
