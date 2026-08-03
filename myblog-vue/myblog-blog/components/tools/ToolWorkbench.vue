<template>
  <ToolInput
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
} = useTool(props.tool);
</script>
