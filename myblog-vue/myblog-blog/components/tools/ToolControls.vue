<template>
  <section class="tool-panel">
    <div class="panel-header">
      <h2>控制台</h2>
      <span class="shortcut-tip">Ctrl / Cmd + K 快速切换工具</span>
    </div>

    <div v-if="props.tool.options.length" class="option-list">
      <div v-for="option in props.tool.options" :key="option.key" class="option-item">
        <span class="option-label">{{ option.label }}</span>

        <el-select
          v-if="option.type === 'select'"
          :model-value="getOptionValue(option.key, option.defaultValue as string)"
          size="large"
          @update:model-value="(val: string) => handleOptionChange(option.key, val)"
        >
          <el-option
            v-for="choice in option.options"
            :key="choice.value"
            :label="choice.label"
            :value="choice.value"
          />
        </el-select>

        <el-radio-group
          v-else-if="option.type === 'radio'"
          :model-value="getOptionValue(option.key, option.defaultValue as string)"
          @update:model-value="(val: string) => handleOptionChange(option.key, val)"
        >
          <el-radio-button
            v-for="choice in option.options"
            :key="choice.value"
            :value="choice.value"
          >
            {{ choice.label }}
          </el-radio-button>
        </el-radio-group>

        <el-checkbox-group
          v-else-if="option.type === 'checkbox-group'"
          :model-value="getCheckboxValue(option.key, option.defaultValue)"
          @update:model-value="(val: string[]) => handleOptionChange(option.key, val)"
        >
          <el-checkbox
            v-for="choice in option.options"
            :key="choice.value"
            :value="choice.value"
            border
          >
            {{ choice.label }}
          </el-checkbox>
        </el-checkbox-group>

        <el-switch
          v-else-if="option.type === 'switch'"
          :model-value="Boolean(props.options[option.key] ?? option.defaultValue)"
          @update:model-value="(val: boolean) => handleOptionChange(option.key, val)"
        />

        <el-input-number
          v-else
          :model-value="Number(props.options[option.key] ?? option.defaultValue)"
          :min="getNumberMin(option)"
          :max="getNumberMax(option)"
          :step="getNumberStep(option)"
          controls-position="right"
          @update:model-value="(val: number | undefined) => handleOptionChange(option.key, Number(val ?? option.defaultValue))"
        />

        <small v-if="option.helperText" class="option-help">{{ option.helperText }}</small>
      </div>
    </div>

    <div class="action-list">
      <el-button type="primary" size="large" :loading="props.loading" @click="emit('process')">
        立即处理
      </el-button>
      <el-button v-if="props.tool.features.hasExample" size="large" @click="emit('example')">
        示例
      </el-button>
      <el-button v-if="props.tool.features.hasSwap" size="large" @click="emit('swap')">
        交换
      </el-button>
      <el-button v-if="props.tool.features.hasClear" size="large" @click="emit('clear')">
        清空
      </el-button>
      <el-button v-if="props.tool.features.hasCopy" size="large" :disabled="!props.hasOutput" @click="emit('copy')">
        复制结果
      </el-button>
      <el-button
        v-if="props.tool.features.hasExport"
        size="large"
        :disabled="!props.hasOutput"
        @click="emit('export')"
      >
        导出文件
      </el-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ToolMeta, ToolNumberOption, ToolOptionDefinition, ToolOptionValues } from "~/types/tool";

const props = defineProps<{
  tool: ToolMeta;
  options: ToolOptionValues;
  loading: boolean;
  hasOutput: boolean;
}>();

const emit = defineEmits<{
  "update-option": [key: string, value: string | number | boolean | string[]];
  process: [];
  example: [];
  swap: [];
  clear: [];
  copy: [];
  export: [];
}>();

const getOptionValue = (key: string, fallback: string): string => {
  const value = props.options[key];
  console.log('[ToolControls] getOptionValue', { key, value, fallback, allOptions: JSON.stringify(props.options) });
  return value !== undefined && value !== null ? String(value) : fallback;
};

const handleOptionChange = (key: string, value: string | number | boolean | string[]) => {
  console.log('[ToolControls] handleOptionChange → emit update-option', { key, value, type: typeof value });
  emit("update-option", key, value);
};

const getCheckboxValue = (key: string, fallback: string[]) => {
  const value = props.options[key];
  return Array.isArray(value) ? value : fallback;
};

const isNumberOption = (option: ToolOptionDefinition): option is ToolNumberOption => {
  return option.type === "number";
};

const getNumberMin = (option: ToolOptionDefinition) => {
  return isNumberOption(option) ? option.min : undefined;
};

const getNumberMax = (option: ToolOptionDefinition) => {
  return isNumberOption(option) ? option.max : undefined;
};

const getNumberStep = (option: ToolOptionDefinition) => {
  return isNumberOption(option) ? (option.step ?? 1) : 1;
};
</script>

<style scoped>
.tool-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 20px;
  padding: 20px;
  backdrop-filter: blur(12px);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-header h2 {
  font-size: 18px;
  color: var(--text-primary);
}

.shortcut-tip {
  color: var(--text-muted);
  font-size: 13px;
}

.option-list {
  display: grid;
  gap: 16px;
  margin-bottom: 18px;
}

.option-item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-label {
  font-weight: 600;
  color: var(--text-primary);
}

.option-help {
  color: var(--text-muted);
}

.action-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 768px) {
  .tool-panel {
    padding: 16px;
    border-radius: 16px;
  }

  .panel-header {
    flex-direction: column;
  }
}
</style>
