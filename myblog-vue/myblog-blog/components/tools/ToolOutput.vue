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
        :autosize="{ minRows: 4, maxRows: 16 }"
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

      <div v-else-if="props.details?.kind === 'image'" class="image-block">
        <img
          :src="props.details.src"
          :alt="props.details.alt"
          :width="props.details.width"
          :height="props.details.height"
          class="image-preview"
        />
        <a
          :href="props.details.src"
          :download="`qr-${Date.now()}.svg`"
          class="image-download"
        >
          下载 QR 图片
        </a>
      </div>

      <div v-else-if="props.details?.kind === 'jwt'" class="jwt-block">
        <el-alert
          :type="props.details.signatureValid ? 'success' : 'info'"
          :closable="false"
          show-icon
          :title="props.details.signatureMessage"
          class="jwt-signature"
        />
        <div class="section-title">Header</div>
        <pre class="json-pre">{{ prettyJson(props.details.header) }}</pre>
        <div class="section-title">Payload</div>
        <pre class="json-pre">{{ prettyJson(props.details.payload) }}</pre>
      </div>

      <div v-else-if="props.details?.kind === 'diff'" class="diff-block">
        <div
          v-for="(line, index) in props.details.lines"
          :key="index"
          class="diff-line"
          :class="`diff-line--${line.type}`"
        >
          <span class="diff-sign">{{ line.type === "add" ? "+" : line.type === "remove" ? "-" : " " }}</span>
          <code>{{ line.text }}</code>
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

/** 格式化 object 为 JSon 字符串（用于 JWT 展示） */
const prettyJson = (value: unknown) => {
  return JSON.stringify(value, null, 2);
};
</script>

<style lang="scss" scoped>
.tool-panel {
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  padding: 20px;
  backdrop-filter: blur(var(--glass-blur));
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
  color: var(--text-primary);
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
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 14px;
  background: var(--bg-card);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-card strong,
.kv-card strong {
  color: var(--text-primary);
  word-break: break-word;
}

.metric-card span,
.kv-card span {
  color: var(--text-muted);
  font-size: 13px;
}

.kv-card--active {
  border-color: var(--border-light);
  box-shadow: var(--shadow-glow);
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
  border: 1px solid var(--border-light);
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
  border: 1px solid var(--border-light);
  background: var(--bg-hover);
  line-height: 1.7;
}

.highlight {
  background: var(--color-category-soft);
  border-radius: 6px;
  padding: 1px 2px;
}

/* 二维码图片预览 */
.image-block {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.image-preview {
  border: 1px solid var(--border-light);
  border-radius: 16px;
  background: #fff;
  max-width: 100%;
}

.image-download {
  color: var(--color-accent);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;

  &:hover {
    color: var(--color-category);
  }
}

/* JWT 解析 */
.jwt-block {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.jwt-signature {
  margin-bottom: 8px;
}

.section-title {
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 600;
}

.json-pre {
  margin: 0;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-hover);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  overflow-x: auto;
  white-space: pre;
}

/* JSON Diff */
.diff-block {
  margin-top: 16px;
  display: grid;
  gap: 2px;
  border-radius: 12px;
  border: 1px solid var(--border-light);
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
}

.diff-line {
  display: flex;
  gap: 8px;
  padding: 2px 12px;
  line-height: 1.6;

  code {
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--text-secondary);
  }
}

.diff-sign {
  width: 14px;
  text-align: center;
  flex-shrink: 0;
  font-weight: 700;
}

.diff-line--add {
  background: rgba(63, 191, 47, 0.12);

  .diff-sign {
    color: var(--color-success);
  }
}

.diff-line--remove {
  background: rgba(245, 108, 108, 0.12);

  .diff-sign {
    color: var(--color-danger);
  }
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
