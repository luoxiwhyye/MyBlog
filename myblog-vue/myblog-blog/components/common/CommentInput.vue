<template>
  <div class="comment-input">
    <ClientOnly>
      <div class="comment-input__box">
        <EditorContent v-if="editor" :editor="editor" />
        <div class="comment-input__tools">
          <span class="comment-input__count" :class="{ 'is-over': overLimit }">
            {{ count }} / {{ maxLength }}
          </span>
          <button
            type="button"
            class="emoji-btn"
            title="插入表情"
            @click.stop="pickerOpen = !pickerOpen"
          >
            😊
          </button>
        </div>
      </div>
    </ClientOnly>

    <!-- 表情面板：只做分组切换 + 表情展示 -->
    <EmojiPicker
      v-if="pickerOpen"
      :placement="placement"
      @select="handleSelect"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
} from "vue";
import { Editor, EditorContent } from "@tiptap/vue-3";
import Document from "@tiptap/extension-document";import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Image from "@tiptap/extension-image";
import { Placeholder, UndoRedo } from "@tiptap/extensions";
import EmojiPicker from "~/components/common/EmojiPicker.vue";
import { docToMarkup, isEmojiImage, markupToDoc } from "~/utils/commentRender";

/**
 * 简易富文本输入框（tiptap 最小集）
 *
 * - 只有「插入表情」一项额外能力，无格式化工具栏
 * - 保留 Ctrl/Cmd+Z 撤销（UndoRedo 扩展，不占 UI）
 * - 对外契约：v-model 为「标记文本」（图片 → `[img:url]`，段落 → `\n`），**不存 HTML**
 * - 图片节点限制显示尺寸（CSS max-width/height），不提供缩放/对齐
 * - 依赖 DOM，故编辑器仅在客户端挂载（ClientOnly + onMounted）
 */

const props = withDefaults(
  defineProps<{
    modelValue: string;
    placeholder?: string;
    /** 字数上限（按标记文本长度计，与后端 isLength 同为 UTF-16 码元） */
    maxLength?: number;
    /** 表情面板弹出方向 */
    placement?: "top" | "bottom";
  }>(),
  {
    placeholder: "写下您的想法...",
    maxLength: 1000,
    placement: "top",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  submit: [];
}>();

const editor = shallowRef<Editor | null>(null);
const pickerOpen = ref(false);

const count = computed(() => (props.modelValue || "").length);
const overLimit = computed(() => count.value > props.maxLength);

// 兼容 @tiptap/vue-3 与 @tiptap/core 两处 Editor 类型（二者结构等价但名义不同）
const serialize = (instance: { getJSON: () => unknown }) =>
  docToMarkup(instance.getJSON());

onMounted(() => {
  editor.value = new Editor({
    content: markupToDoc(props.modelValue),
    extensions: [
      Document,
      Paragraph,
      Text,
      Image.configure({ inline: true, allowBase64: false }),
      Placeholder.configure({ placeholder: props.placeholder }),
      UndoRedo,
    ],
    editorProps: {
      attributes: {
        class: "comment-input__body",
        "aria-label": props.placeholder,
      },
    },
    onUpdate: ({ editor: instance }) => {
      emit("update:modelValue", serialize(instance));
    },
  });
});

onBeforeUnmount(() => {
  editor.value?.destroy();
  editor.value = null;
});

// 父层程序化改值时同步进编辑器（如重置/回填）；避免与自身 emit 形成回环
watch(
  () => props.modelValue,
  (value) => {
    const instance = editor.value;
    if (!instance) return;
    if (serialize(instance) === value) return;
    instance.commands.setContent(markupToDoc(value), { emitUpdate: false });
  },
);

const focus = () => editor.value?.commands.focus("end");

/** 插入表情：图片 URL 插图片节点，其余按文本插入 */
const insertEmoji = (content: string) => {
  const instance = editor.value;
  if (!instance || !content) return;
  if (isEmojiImage(content)) {
    instance.chain().focus("end").setImage({ src: content }).run();
  } else {
    instance.chain().focus("end").insertContent(content).run();
  }
};

const handleSelect = (content: string) => {
  insertEmoji(content);
  pickerOpen.value = false;
};

const clear = () => {
  editor.value?.commands.clearContent(true);
  pickerOpen.value = false;
};

defineExpose({
  insertEmoji,
  clear,
  focus,
  getEditor: () => editor.value,
});
</script>

<style lang="scss" scoped>
.comment-input {
  position: relative;
}

.comment-input__box {
  position: relative;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  transition: border-color 0.2s;

  &:focus-within {
    border-color: var(--color-accent);
  }
}

/* ProseMirror 内容区（scoped 不穿透子组件，需 :deep） */
.comment-input :deep(.comment-input__body) {
  min-height: 68px;
  max-height: 260px;
  overflow-y: auto;
  padding: 8px 100px 8px 11px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  outline: none;
  /* ProseMirror 依赖 pre-wrap 处理换行与光标 */
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* ProseMirror 会为内联图片插入一个无 src 的占位 <img>，须按官方规则归零，
   否则它会被上面的 img 规则命中、也可能撑出多余高度 */
.comment-input :deep(img.ProseMirror-separator) {
  display: inline !important;
  border: none !important;
  margin: 0 !important;
  width: 1px !important;
  height: 1px !important;
}

.comment-input :deep(.ProseMirror-trailingBreak) {
  display: none;
}

/* 占位提示（Placeholder 扩展只加 data-placeholder，样式需自行提供） */
.comment-input :deep(.comment-input__body p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  color: var(--text-muted);
  pointer-events: none;
}

/* 图片节点：限制尺寸，避免大表情撑破输入框 */
.comment-input :deep(.comment-input__body img:not(.ProseMirror-separator)) {
  max-width: 120px;
  max-height: 120px;
  margin: 0 2px;
  border-radius: 4px;
  object-fit: contain;
  vertical-align: middle;
}

.comment-input :deep(.comment-input__body img.ProseMirror-selectednode) {
  outline: 2px solid var(--color-accent);
}

.comment-input__tools {
  position: absolute;
  right: 8px;
  bottom: 6px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-input__count {
  font-size: 12px;
  color: var(--text-muted);

  &.is-over {
    color: var(--color-danger, #e5484d);
    font-weight: 600;
  }
}

.emoji-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: var(--bg-hover);
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;

  &:hover {
    background: var(--border-light);
  }
}

@media (max-width: 768px) {
  .comment-input :deep(.comment-input__body) {
    padding-right: 110px;
  }

  .comment-input__tools {
    right: 6px;
    bottom: 6px;
  }

  /* 移动端 emoji 按钮提升到 44px 触摸目标 */
  .emoji-btn {
    width: 44px;
    height: 44px;
    font-size: 18px;
  }
}
</style>
