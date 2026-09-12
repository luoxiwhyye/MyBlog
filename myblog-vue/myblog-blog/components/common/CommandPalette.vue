<template>
  <Teleport to="body">
    <Transition name="cmdk">
      <div
        v-if="isOpen"
        class="cmdk-overlay"
        role="presentation"
        @click.self="close"
      >
        <div
          class="cmdk"
          role="dialog"
          aria-modal="true"
          :aria-label="t('commandPalette.title')"
        >
          <!-- 输入行 -->
          <div class="cmdk-input-row">
            <svg
              class="cmdk-search-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref="inputRef"
              v-model="keyword"
              class="cmdk-input"
              type="text"
              role="combobox"
              autocomplete="off"
              autocorrect="off"
              spellcheck="false"
              aria-controls="cmdk-list"
              :aria-expanded="items.length > 0"
              :aria-activedescendant="activeIndex >= 0 ? `cmdk-item-${activeIndex}` : undefined"
              :placeholder="t('commandPalette.placeholder')"
              :aria-label="t('commandPalette.placeholder')"
              @keydown.down.prevent="move(1)"
              @keydown.up.prevent="move(-1)"
              @keydown.enter.prevent="selectActive"
              @keydown.tab.prevent
              @keydown.esc.prevent.stop="close"
            />
            <button
              type="button"
              class="cmdk-close"
              :aria-label="t('commandPalette.close')"
              @click="close"
            >
              <kbd>esc</kbd>
            </button>
          </div>

          <p v-if="degraded" class="cmdk-notice">
            {{ t("commandPalette.degraded") }}
          </p>

          <!-- 结果区 -->
          <div class="cmdk-body">
            <p v-if="keyword.trim() && pending && items.length === 0" class="cmdk-status">
              {{ t("commandPalette.searching") }}
            </p>
            <p v-else-if="loadError" class="cmdk-status cmdk-status--error">
              {{ t("commandPalette.error") }}
            </p>
            <p v-else-if="items.length === 0" class="cmdk-status">
              {{ t("commandPalette.empty") }}
              <span class="cmdk-status-hint">
                {{ t("commandPalette.emptyHint") }}
              </span>
            </p>
            <template v-else>
              <p v-if="!keyword.trim()" class="cmdk-group">
                {{ t("commandPalette.quickNav") }}
              </p>
              <ul
                id="cmdk-list"
                class="cmdk-list"
                role="listbox"
                :aria-label="t('commandPalette.title')"
              >
                <li
                  v-for="(item, index) in items"
                  :id="`cmdk-item-${index}`"
                  :key="item.key"
                  class="cmdk-item"
                  :class="{ 'cmdk-item--active': index === activeIndex }"
                  role="option"
                  :aria-selected="index === activeIndex"
                  @mouseenter="activeIndex = index"
                  @click="selectItem(item)"
                >
                  <span class="cmdk-item-main">
                    <span class="cmdk-item-title" v-html="item.html" />
                    <span v-if="item.meta" class="cmdk-item-meta">
                      {{ item.meta }}
                    </span>
                  </span>
                  <svg
                    class="cmdk-item-arrow"
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </li>
              </ul>
            </template>
          </div>

          <!-- 底部提示 -->
          <div class="cmdk-footer">
            <span class="cmdk-hint"><kbd>↑</kbd><kbd>↓</kbd>{{ t("commandPalette.hints.select") }}</span>
            <span class="cmdk-hint"><kbd>↵</kbd>{{ t("commandPalette.hints.open") }}</span>
            <NuxtLink
              v-if="keyword.trim()"
              class="cmdk-archive"
              :to="archiveLink"
              @click="close"
            >
              {{ t("commandPalette.searchInArchive") }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { searchApi } from "~/api";
import { formatDate } from "~/utils/format";
import { escapeHtml, highlightKeyword } from "~/utils/searchHighlight";
import type { SearchItem } from "~/types";

interface PaletteItem {
  key: string;
  title: string;
  /** 已转义并高亮好的标题 HTML */
  html: string;
  meta?: string;
  to: string;
}

const SEARCH_DEBOUNCE = 220;
const RESULT_LIMIT = 8;

const { isOpen, close, toggle } = useCommandPalette();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const settingsStore = useSettingsStore();

const keyword = ref("");
const results = ref<PaletteItem[]>([]);
const activeIndex = ref(0);
const pending = ref(false);
const loadError = ref(false);
const degraded = ref(false);
const inputRef = ref<HTMLInputElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
/** 递增序号用于丢弃过期响应（输入快时的乱序返回） */
let fetchSeq = 0;
/** 记录是否由本组件锁了 body 滚动，避免误清掉别的组件（如灯箱）的设置 */
let bodyLocked = false;

/** 空关键词时的快速跳转（与 Header 导航同一套，并遵循功能开关） */
const quickCommands = computed<PaletteItem[]>(() => {
  const featureEnabled = (key: string) =>
    settingsStore.getSetting(key) !== "false";

  const base = [
    { to: "/home", label: t("nav.home") },
    { to: "/category", label: t("nav.category") },
    { to: "/tag", label: t("nav.tag") },
    { to: "/archive", label: t("nav.archive") },
    { to: "/tools", label: t("nav.tools") },
    { to: "/friends", label: t("nav.friends") },
    { to: "/message-board", label: t("nav.messageBoard") },
    { to: "/about", label: t("nav.about") },
  ].filter((item) => {
    if (item.to === "/tools") return featureEnabled("enable_tools");
    if (item.to === "/message-board") return featureEnabled("enable_message_board");
    return true;
  });

  return base.map((item) => ({
    key: `nav-${item.to}`,
    title: item.label,
    html: escapeHtml(item.label),
    to: item.to,
  }));
});

const items = computed<PaletteItem[]>(() =>
  keyword.value.trim() ? results.value : quickCommands.value,
);

const archiveLink = computed(
  () => `/archive?q=${encodeURIComponent(keyword.value.trim())}`,
);

/** dayjs 对非法日期会给出 "Invalid Date"，这里统一收敛为空串 */
const formatMetaDate = (value?: string) => {
  if (!value) return "";
  const text = formatDate(value);
  return text.includes("Invalid") ? "" : text;
};

const toPaletteItem = (item: SearchItem, kw: string): PaletteItem => ({
  key: `article-${item.id}`,
  title: item.title,
  html: highlightKeyword(item.title, kw),
  meta: [item.typeName, formatMetaDate(item.createdAt)]
    .filter(Boolean)
    .join(" · "),
  to: `/article/${item.id}`,
});

const runSearch = async (kw: string) => {
  const seq = ++fetchSeq;
  try {
    const res = await searchApi.search(kw, RESULT_LIMIT);
    if (seq !== fetchSeq) return;
    const data = res.data;
    results.value = (data?.list || []).map((item) => toPaletteItem(item, kw));
    degraded.value = data?.engine === "like";
    loadError.value = false;
  } catch {
    if (seq !== fetchSeq) return;
    results.value = [];
    degraded.value = false;
    loadError.value = true;
  } finally {
    if (seq === fetchSeq) pending.value = false;
  }
};

watch(keyword, (value) => {
  if (debounceTimer) clearTimeout(debounceTimer);

  const kw = value.trim();
  if (!kw) {
    // 取消进行中的请求标记，避免清空后又被旧响应填回来
    fetchSeq += 1;
    results.value = [];
    pending.value = false;
    loadError.value = false;
    degraded.value = false;
    return;
  }

  pending.value = true;
  loadError.value = false;
  debounceTimer = setTimeout(() => runSearch(kw), SEARCH_DEBOUNCE);
});

// 列表变化（关键词首输 / 结果返回 / 切换快速跳转）时把高亮拉回第一项
watch(items, () => {
  activeIndex.value = items.value.length ? 0 : -1;
  scrollActiveIntoView();
});

const scrollActiveIntoView = () => {
  if (!import.meta.client) return;
  nextTick(() => {
    const el = document.getElementById(`cmdk-item-${activeIndex.value}`);
    el?.scrollIntoView({ block: "nearest" });
  });
};

const move = (delta: number) => {
  const total = items.value.length;
  if (!total) return;
  activeIndex.value = (activeIndex.value + delta + total) % total;
  scrollActiveIntoView();
};

const selectItem = (item: PaletteItem) => {
  close();
  if (item.to !== route.path) {
    router.push(item.to);
  }
};

const selectActive = () => {
  const item = items.value[activeIndex.value];
  if (item) selectItem(item);
};

/** 全局快捷键：Cmd / Ctrl + K 开关面板，Esc 关闭 */
const onGlobalKeydown = (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    toggle();
    return;
  }
  if (event.key === "Escape" && isOpen.value) {
    close();
  }
};

watch(isOpen, (value) => {
  if (!import.meta.client) return;

  if (value) {
    keyword.value = "";
    results.value = [];
    activeIndex.value = 0;
    pending.value = false;
    loadError.value = false;
    degraded.value = false;
    nextTick(() => inputRef.value?.focus());
    if (!bodyLocked) {
      document.body.style.overflow = "hidden";
      bodyLocked = true;
    }
  } else {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (bodyLocked) {
      document.body.style.overflow = "";
      bodyLocked = false;
    }
  }
});

onMounted(() => {
  window.addEventListener("keydown", onGlobalKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onGlobalKeydown);
  if (debounceTimer) clearTimeout(debounceTimer);
  if (bodyLocked) {
    document.body.style.overflow = "";
    bodyLocked = false;
  }
});
</script>

<style lang="scss" scoped>
.cmdk-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: clamp(56px, 12vh, 120px) 16px 16px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.cmdk {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card-lg);
  box-shadow: var(--shadow-elevated);
  backdrop-filter: blur(var(--glass-blur)) saturate(130%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(130%);
}

/* ===== 输入行 ===== */
.cmdk-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--glass-border);
}

.cmdk-search-icon {
  flex: 0 0 auto;
  color: var(--text-muted);
}

.cmdk-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.5;

  &::placeholder {
    color: var(--text-muted);
  }
}

.cmdk-close {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  padding: 4px 6px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;

  &:hover {
    color: var(--text-primary);
    border-color: var(--color-category);
  }
}

.cmdk-close kbd {
  font-family: inherit;
}

/* ===== 降级提示 ===== */
.cmdk-notice {
  margin: 0;
  padding: 8px 16px;
  border-bottom: 1px solid var(--glass-border);
  background: var(--color-category-soft);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

/* ===== 结果区 ===== */
.cmdk-body {
  max-height: min(52vh, 380px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px;
}

.cmdk-status {
  margin: 0;
  padding: 28px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.7;
}

.cmdk-status--error {
  color: var(--color-danger, #dc2626);
}

.cmdk-status-hint {
  display: block;
  font-size: 12px;
  opacity: 0.8;
}

.cmdk-group {
  margin: 4px 0 6px;
  padding: 0 10px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.cmdk-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.cmdk-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.cmdk-item--active {
  background: var(--color-category-soft);
}

.cmdk-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cmdk-item-title {
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow-wrap: anywhere;
}

.cmdk-item-title :deep(mark) {
  background: transparent;
  color: var(--color-category);
  font-weight: 700;
}

.cmdk-item-meta {
  color: var(--text-muted);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cmdk-item-arrow {
  flex: 0 0 auto;
  color: var(--text-muted);
  opacity: 0;
  transition: opacity 0.15s, transform 0.15s;
}

.cmdk-item--active .cmdk-item-arrow {
  opacity: 1;
  transform: translateX(1px);
}

/* ===== 底部提示 ===== */
.cmdk-footer {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  border-top: 1px solid var(--glass-border);
  color: var(--text-muted);
  font-size: 12px;
}

.cmdk-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.cmdk-hint kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-hover);
  font-family: inherit;
  font-size: 11px;
}

.cmdk-archive {
  margin-left: auto;
  color: var(--color-category);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

/* ===== 过渡 ===== */
.cmdk-enter-active,
.cmdk-leave-active {
  transition: opacity 0.18s ease;
}

.cmdk-enter-active .cmdk,
.cmdk-leave-active .cmdk {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.cmdk-enter-from,
.cmdk-leave-to {
  opacity: 0;
}

.cmdk-enter-from .cmdk,
.cmdk-leave-to .cmdk {
  transform: translateY(-8px) scale(0.98);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .cmdk-enter-active,
  .cmdk-leave-active,
  .cmdk-enter-active .cmdk,
  .cmdk-leave-active .cmdk {
    transition: none;
  }
}

/* ===== 移动端 ===== */
@media (max-width: 640px) {
  .cmdk-overlay {
    padding: 12px;
    align-items: flex-start;
  }

  .cmdk-body {
    max-height: 60vh;
  }

  .cmdk-footer .cmdk-hint {
    display: none;
  }

  .cmdk-archive {
    margin-left: 0;
  }
}
</style>
