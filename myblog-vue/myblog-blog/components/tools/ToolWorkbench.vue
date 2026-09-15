<template>
  <ToolInput
    v-if="tool.inputs && tool.inputs.length > 0"
    :tool="tool"
    :model-value="inputs"
    :total-bytes="totalInputBytes"
    @update="updateInput"
  />

  <ToolControls
    :tool="tool"
    :options="state.options"
    :loading="state.isLoading"
    :has-output="hasOutput"
    @update-option="updateOption"
    @process="processNow"
    @example="loadExample"
    @swap="swap"
    @clear="clear"
    @copy="copyToClipboard()"
    @export="exportResult"
  />

  <!-- 历史快照：回退到之前的结果 -->
  <section v-if="history.length" class="tool-panel history-panel">
    <div class="panel-header">
      <h2>历史快照</h2>
      <button type="button" class="history-clear" @click="clearHistory">清空</button>
    </div>
    <div class="history-list">
      <button
        v-for="(item, ri) in history"
        :key="item.ts"
        type="button"
        class="history-item"
        :class="{ active: ri === historyIndex }"
        @click="restoreSnapshot(ri)"
      >
        <span class="history-index">#{{ ri + 1 }}</span>
        <span class="history-preview">{{ snapshotPreview(item) }}</span>
        <time class="history-time">{{ snapshotTime(item.ts) }}</time>
      </button>
    </div>
  </section>

  <ToolOutput
    :tool="tool"
    :output="state.output"
    :loading="state.isLoading"
    :error="state.error"
    :details="state.details"
  />
</template>

<script setup lang="ts">
import type { ToolMeta } from "~/types/tool";
import type { ToolHistorySnapshot } from "~/composables/useTool";
import { useTool } from "~/composables/useTool";

const props = defineProps<{
  tool: ToolMeta;
}>();

const {
  inputs,
  state,
  totalInputBytes,
  hasOutput,
  updateInput,
  updateOption,
  processNow,
  loadExample,
  clear,
  swap,
  copyToClipboard,
  exportResult,
  history,
  historyIndex,
  restoreSnapshot,
  clearHistory,
} = useTool(props.tool);

// 历史快照辅助：预览与时间
const snapshotPreview = (item: ToolHistorySnapshot) => {
  const text = item.output || "";
  return text.length > 60 ? `${text.slice(0, 60)}…` : text || "（空结果）";
};

const snapshotTime = (ts: number) => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getHours()}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// ===== 快捷键：Ctrl/Cmd+Enter 运行，Ctrl/Cmd+Shift+E 导出 =====
const handleKeydown = (event: KeyboardEvent) => {
  // 仅当焦点不在输入类控件且用户没有组合其他修饰键时，避免与默认行为冲突
  const mod = event.ctrlKey || event.metaKey;
  if (!mod) {
    return;
  }

  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void processNow();
    return;
  }

  if (event.key === "e" && event.shiftKey) {
    event.preventDefault();
    exportResult();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.tool-panel {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  padding: 20px;
  backdrop-filter: blur(var(--glass-blur));
}

/* ===== 历史快照 ===== */
.history-panel {
  margin-top: $spacing-4;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.panel-header h2 {
  font-size: 18px;
  color: var(--text-primary);
}

.history-clear {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: color $transition-fast, background-color $transition-fast;
}

.history-clear:hover {
  color: var(--color-danger);
  background: var(--bg-hover);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  /* 列表行（非内容卡片）：垂直 $spacing-4(15px) / 水平 $spacing-5(18.75px) */
  padding: $spacing-4 $spacing-5;
  border: 1px solid var(--border-light);
  border-radius: $border-radius-md;
  background: var(--bg-hover);
  cursor: pointer;
  text-align: left;
  transition:
    background-color $transition-fast,
    border-color $transition-fast,
    box-shadow $transition-fast;
}

.history-item:hover {
  background: var(--bg-card);
  border-color: var(--color-accent);
}

.history-item.active {
  border-color: var(--color-accent);
  /* 原为 var(--color-accent-soft, var(--color-category-soft)) —— 前者全站未定义，
     实际一直吃回退值；直接写真实存在的强调浅底令牌。 */
  background: color-mix(in srgb, var(--color-accent-light) 55%, transparent);
}

.history-index {
  flex: 0 0 auto;
  min-width: 30px;
  color: var(--color-accent-deep);
  font-size: $font-size-xs;
  font-weight: 700;
}

.history-preview {
  flex: 1;
  min-width: 0;
  color: var(--text-secondary);
  font-size: $font-size-sm;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-time {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: $font-size-xs;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 480px) {
  .tool-panel {
    padding: 14px;
  }

  .history-item {
    gap: 8px;
    padding: 8px 10px;
  }
}
</style>
