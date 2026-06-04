<template>
  <section class="tool-panel">
    <div class="panel-header">
      <h2>输入区</h2>
      <span>{{ totalBytesText }}</span>
    </div>
    <div class="input-grid" :class="{ 'input-grid--stacked': props.tool.features.multiInput }">
      <div v-for="field in props.tool.inputs" :key="field.key" class="input-item">
        <div class="field-header">
          <label :for="field.key">{{ field.label }}</label>
          <small v-if="field.helperText">{{ field.helperText }}</small>
        </div>

        <template v-if="field.type === 'textarea'">
          <el-input
            :id="field.key"
            :model-value="props.modelValue[field.key] ?? ''"
            type="textarea"
            :rows="field.rows ?? 10"
            :placeholder="field.placeholder"
            resize="vertical"
            :input-style="field.monospace ? monospaceStyle : undefined"
            @update:model-value="(val: string) => emitUpdate(field.key, val)"
          />
        </template>

        <template v-else-if="field.type === 'color'">
          <div class="color-field">
            <el-color-picker
              :model-value="props.modelValue[field.key] ?? '#409EFF'"
              :show-alpha="false"
              @update:model-value="(val: string | null) => emitUpdate(field.key, val || '#409EFF')"
            />
            <el-input
              :id="field.key"
              :model-value="props.modelValue[field.key] ?? ''"
              :placeholder="field.placeholder"
              :input-style="monospaceStyle"
              @update:model-value="(val: string) => emitUpdate(field.key, val)"
            />
          </div>
        </template>

        <template v-else>
          <el-input
            :id="field.key"
            :model-value="props.modelValue[field.key] ?? ''"
            :placeholder="field.placeholder"
            :input-style="field.monospace ? monospaceStyle : undefined"
            @update:model-value="(val: string) => emitUpdate(field.key, val)"
          />
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ToolInputValues, ToolMeta } from "~/types/tool";

const props = defineProps<{
  tool: ToolMeta;
  modelValue: ToolInputValues;
  totalBytes: number;
}>();

const emit = defineEmits<{
  update: [key: string, value: string];
}>();

const monospaceStyle = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

const emitUpdate = (key: string, value: string) => {
  emit("update", key, value);
};

const totalBytesText = computed(() => {
  return `已输入 ${(props.totalBytes / 1024).toFixed(props.totalBytes > 1024 ? 1 : 0)} KB`;
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
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  color: #475569;
}

.panel-header h2 {
  font-size: 18px;
  color: #16213e;
}

.input-grid {
  display: grid;
  gap: 16px;
}

.input-grid--stacked {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.input-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.field-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-header label {
  font-weight: 600;
  color: #16213e;
}

.field-header small {
  color: #64748b;
}

.color-field {
  display: flex;
  gap: 12px;
  align-items: center;
}

.color-field :deep(.el-input) {
  flex: 1;
}

@media (max-width: 768px) {
  .tool-panel {
    padding: 16px;
    border-radius: 16px;
  }
}
</style>
