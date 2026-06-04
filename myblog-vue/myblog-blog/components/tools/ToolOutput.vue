<template>
  <section class="tool-panel">
    <div class="panel-header">
      <h2>{{ props.tool.outputLabel ?? "输出结果" }}</h2>
      <el-tag v-if="props.loading" type="primary" effect="plain">处理中</el-tag>
    </div>

    <el-alert
      v-if="props.error"
      type="error"
      :closable="false"
      :title="props.error"
      show-icon
      class="output-alert"
    />

    <el-empty
      v-else-if="!props.loading && !props.output && !props.details"
      description="输入内容后将自动处理并在这里展示结果"
    />

    <template v-else>
      <el-input
        v-if="props.output"
        :model-value="props.output"
        type="textarea"
        :rows="12"
        readonly
        resize="vertical"
        :input-style="monospaceStyle"
      />

      <div v-if="props.details?.kind === 'metrics'" class="metric-grid">
        <article v-for="item in props.details.items" :key="item.label" class="metric-card">
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </article>
      </div>

      <div v-else-if="props.details?.kind === 'timestamp'" class="kv-grid">
        <article v-for="item in props.details.entries" :key="item.label" class="kv-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </article>
      </div>

      <div v-else-if="props.details?.kind === 'color'" class="color-card">
        <div class="color-swatch" :style="{ backgroundColor: props.details.swatch }" />
        <div class="color-values">
          <div v-for="variant in props.details.variants" :key="variant.label" class="kv-card">
            <span>{{ variant.label }}</span>
            <strong>{{ variant.value }}</strong>
          </div>
        </div>
      </div>

      <div v-else-if="props.details?.kind === 'case'" class="kv-grid">
        <article
          v-for="variant in props.details.variants"
          :key="variant.key"
          class="kv-card"
          :class="{ 'kv-card--active': variant.key === props.details!.selectedKey }"
        >
          <span>{{ variant.label }}</span>
          <strong>{{ variant.value }}</strong>
        </article>
      </div>

      <div v-else-if="props.details?.kind === 'regex'" class="regex-block">
        <div class="regex-preview">
          <span
            v-for="(segment, index) in regexSegments"
            :key="`${segment.value}-${index}`"
            :class="{ highlight: segment.highlighted }"
          >
            {{ segment.value }}
          </span>
        </div>

        <div class="kv-grid">
          <article v-for="(match, index) in props.details.matches" :key="`${match.index}-${index}`" class="kv-card">
            <span>匹配 #{{ index + 1 }} @ {{ match.index }}</span>
            <strong>{{ match.text }}</strong>
          </article>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { ToolMeta, ToolResultDetails } from "~/types/tool";

const props = defineProps<{
  tool: ToolMeta;
  output: string;
  loading: boolean;
  error: string | null;
  details: ToolResultDetails | null;
}>();

const monospaceStyle = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

const regexSegments = computed(() => {
  if (props.details?.kind !== "regex") {
    return [];
  }

  const segments: Array<{ value: string; highlighted: boolean }> = [];
  let cursor = 0;

  for (const match of props.details.matches) {
    if (match.index > cursor) {
      segments.push({
        value: props.details.sourceText.slice(cursor, match.index),
        highlighted: false,
      });
    }

    const matchEnd = match.index + match.text.length;
    segments.push({
      value: props.details.sourceText.slice(match.index, matchEnd),
      highlighted: true,
    });
    cursor = matchEnd;
  }

  if (cursor < props.details.sourceText.length) {
    segments.push({
      value: props.details.sourceText.slice(cursor),
      highlighted: false,
    });
  }

  return segments.filter((item) => item.value);
});
</script>

<style scoped>
.tool-panel {
  background: #ffffff;
  border: 1px solid #e6edf5;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-header h2 {
  font-size: 18px;
  color: #16213e;
}

.output-alert {
  margin-bottom: 16px;
}

.metric-grid,
.kv-grid {
  margin-top: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.metric-card,
.kv-card {
  border: 1px solid #e6edf5;
  border-radius: 16px;
  padding: 14px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-card strong,
.kv-card strong {
  color: #0f766e;
  word-break: break-word;
}

.metric-card span,
.kv-card span {
  color: #64748b;
  font-size: 13px;
}

.kv-card--active {
  border-color: #14b8a6;
  box-shadow: 0 8px 20px rgba(20, 184, 166, 0.12);
}

.color-card {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 16px;
  align-items: stretch;
}

.color-swatch {
  min-height: 120px;
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.color-values {
  display: grid;
  gap: 12px;
}

.regex-block {
  margin-top: 16px;
  display: grid;
  gap: 16px;
}

.regex-preview {
  white-space: pre-wrap;
  word-break: break-word;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid #e6edf5;
  background: #f8fafc;
  line-height: 1.7;
}

.highlight {
  background: rgba(20, 184, 166, 0.18);
  border-radius: 6px;
  padding: 1px 2px;
}

@media (max-width: 768px) {
  .tool-panel {
    padding: 16px;
    border-radius: 16px;
  }

  .color-card {
    grid-template-columns: 1fr;
  }
}
</style>
