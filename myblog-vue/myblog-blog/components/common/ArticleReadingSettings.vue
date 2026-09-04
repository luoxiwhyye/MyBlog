<template>
  <div class="reading-settings">
    <button
      type="button"
      class="reading-settings-btn"
      :class="{ active: open }"
      :aria-expanded="open"
      aria-label="阅读设置"
      title="阅读设置"
      @click="open = !open"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M4 7V5h16v2" />
        <path d="M9 20h6" />
        <path d="M12 5v15" />
      </svg>
    </button>

    <Transition name="rs-drop">
      <div v-if="open" class="reading-settings-panel" role="dialog" aria-label="阅读设置">
        <div class="rs-row">
          <span class="rs-label">字号</span>
          <div class="rs-control">
            <button
              type="button"
              class="rs-step"
              :disabled="fontSize <= MIN_FONT"
              @click="stepFont(-1)"
            >
              −
            </button>
            <span class="rs-value">{{ fontSize }}px</span>
            <button
              type="button"
              class="rs-step"
              :disabled="fontSize >= MAX_FONT"
              @click="stepFont(1)"
            >
              ＋
            </button>
          </div>
        </div>

        <div class="rs-row">
          <span class="rs-label">行距</span>
          <div class="rs-lines">
            <button
              v-for="opt in LINE_OPTIONS"
              :key="opt.value"
              type="button"
              :class="{ active: lineHeight === opt.value }"
              @click="setLineHeight(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="rs-footer">
          <button type="button" class="rs-reset" @click="reset">恢复默认</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
interface ReadingPrefs {
  fontSize: number;
  lineHeight: number;
}

const model = defineModel<ReadingPrefs>({ required: true });

const KEY = "myblog:reading-prefs";
const MIN_FONT = 14;
const MAX_FONT = 24;
const DEFAULT: ReadingPrefs = { fontSize: 17, lineHeight: 1.75 };
const LINE_OPTIONS = [
  { label: "紧凑", value: 1.5 },
  { label: "标准", value: 1.75 },
  { label: "宽松", value: 2 },
];

const open = ref(false);

const fontSize = computed({
  get: () => model.value.fontSize,
  set: (v) => {
    model.value = { ...model.value, fontSize: v };
  },
});

const lineHeight = computed({
  get: () => model.value.lineHeight,
  set: (v) => {
    model.value = { ...model.value, lineHeight: v };
  },
});

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const stepFont = (delta: number) => {
  const next = clamp(fontSize.value + delta, MIN_FONT, MAX_FONT);
  model.value = { ...model.value, fontSize: next };
};

const setLineHeight = (v: number) => {
  model.value = { ...model.value, lineHeight: v };
};

const reset = () => {
  model.value = { ...DEFAULT };
};

const readPrefs = () => {
  if (!process.client) return;
  try {
    const saved = localStorage.getItem(KEY);
    if (!saved) return;
    const p = JSON.parse(saved) as Partial<ReadingPrefs>;
    if (p && typeof p.fontSize === "number" && typeof p.lineHeight === "number") {
      model.value = {
        fontSize: clamp(p.fontSize, MIN_FONT, MAX_FONT),
        lineHeight: LINE_OPTIONS.some((o) => o.value === p.lineHeight)
          ? p.lineHeight
          : DEFAULT.lineHeight,
      };
    }
  } catch {
    // ignore parse errors
  }
};

const savePrefs = () => {
  if (!process.client) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(model.value));
  } catch {
    // ignore storage errors
  }
};

onMounted(readPrefs);
watch(model, savePrefs, { deep: true });
</script>

<style lang="scss" scoped>
@use "../../assets/css/abstracts/variables" as *;

.reading-settings {
  position: relative;
  display: inline-flex;
}

.reading-settings-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: $border-radius-md;
  border: 1px solid var(--glass-border);
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(140%);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
}

.reading-settings-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-glow);
}

.reading-settings-btn.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.reading-settings-btn svg {
  pointer-events: none;
}

.reading-settings-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  width: 232px;
  padding: $spacing-4;
  background: var(--bg-card);
  backdrop-filter: blur(var(--glass-blur)) saturate(150%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(150%);
  border: 1px solid var(--glass-border);
  border-radius: $border-radius-md;
  box-shadow: var(--shadow-elevated);
  display: flex;
  flex-direction: column;
  gap: $spacing-4;
}

.rs-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-3;
}

.rs-label {
  font-size: $font-size-sm;
  color: var(--text-secondary);
  flex: 0 0 auto;
}

.rs-control {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: var(--bg-hover);
  border: 1px solid var(--border-light);
  border-radius: $border-radius-sm;
  overflow: hidden;
}

.rs-step {
  width: 30px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.rs-step:hover:not(:disabled) {
  background: var(--color-accent-light);
  color: var(--color-accent);
}

.rs-step:disabled {
  color: var(--text-muted);
  opacity: 0.5;
  cursor: not-allowed;
}

.rs-value {
  min-width: 48px;
  text-align: center;
  font-size: $font-size-sm;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.rs-lines {
  display: inline-flex;
  gap: $spacing-2;
}

.rs-lines button {
  padding: 5px 12px;
  font-size: $font-size-xs;
  border: 1px solid var(--border-light);
  border-radius: $border-radius-sm;
  background: var(--bg-hover);
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.15s, background-color 0.15s, border-color 0.15s;
}

.rs-lines button:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.rs-lines button.active {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: var(--color-accent-light);
  font-weight: 600;
}

.rs-footer {
  border-top: 1px solid var(--border-light);
  padding-top: $spacing-3;
  text-align: right;
}

.rs-reset {
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: $font-size-xs;
  cursor: pointer;
  padding: 2px 4px;
  transition: color 0.15s;
}

.rs-reset:hover {
  color: var(--color-accent);
}

.rs-drop-enter-active,
.rs-drop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.rs-drop-enter-from,
.rs-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
  pointer-events: none;
}
</style>
