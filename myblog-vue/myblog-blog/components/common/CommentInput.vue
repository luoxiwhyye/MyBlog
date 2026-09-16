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
import {
  docToMarkup,
  isEmojiImage,
  markupToDoc,
  normalizeMarkup,
} from "~/utils/commentRender";

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

// 计数按「收敛后的标记文本」算：空段落残留的 `\n` 不算字（历史缺陷：1 个字显示 2/1000）
const count = computed(() => normalizeMarkup(props.modelValue).length);
const overLimit = computed(() => count.value > props.maxLength);

// 兼容 @tiptap/vue-3 与 @tiptap/core 两处 Editor 类型（二者结构等价但名义不同）
const serialize = (instance: { getJSON: () => unknown }) =>
  docToMarkup(instance.getJSON());

/**
 * 把编辑器当前内容上报给父层（序列化 → 收敛 → emit）。
 *
 * ⚠️ 只上报「刚序列化出来的值」，不要上报缓存值：父层 watch 会用 modelValue
 * 回灌 `setContent()`，一旦上报了与当前文档不一致的值，回灌会把输入冲掉。
 */
const syncFromEditor = () => {
  const instance = editor.value;
  if (!instance) return;
  const value = serialize(instance);
  if (value === props.modelValue) return;
  emit("update:modelValue", value);
};

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
      handleDOMEvents: {
        // 合成结束后补一次同步：合成期间的 update 被主动跳过，这里兜底
        // （延到下一轮任务，此时 ProseMirror 已把提交的文本解析进文档）
        compositionend: () => {
          setTimeout(syncFromEditor, 0);
          return false;
        },
      },
    },
    onUpdate: ({ editor: instance }) => {
      // 输入法合成期间不上报：合成中的拼音还没定字，上报会让父层把
      // 「半成品」回灌进编辑器，并把原始拼音落成真实文本（历史缺陷 "w我看"）
      if (instance.view.composing) return;
      syncFromEditor();
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
    // 合成中不覆盖 DOM：写入会打断输入法，并把合成中的拼音固化成正文
    if (instance.view.composing) return;
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
  /* 与 EP 输入框同源走控件令牌（见 design-system.md §6.1）：
     底用不透明档 --control-bg、描边用装饰档 --control-border ——
     原先的 --bg-card + --border-color 与卡底同色，1px 浅灰边在玻璃卡上只有
     1.2~2.0:1，用户定位不到输入区。 */
  border: 1px solid var(--control-border);
  border-radius: 8px;
  background: var(--control-bg);
  transition: border-color 0.2s, box-shadow 0.2s;

  /* 默认边已是 accent，focus 若只换色就与默认态一样 → 改加外环（与 el-input
     的「加粗实边 + 外环」同一套语义）。 */
  &:focus-within {
    box-shadow: 0 0 0 3px var(--color-accent-light);
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

/* ⚠️ 不要给 .ProseMirror-trailingBreak 加 display:none（历史上踩过）。
   ProseMirror 靠这个 <br> 给空段落提供「行盒」；隐藏它之后空段落在排版上没有任何
   可见内容 → Chrome 找不到段内的可见插入点，会把插入点提升到 contenteditable 根层，
   于是第一个字符被插成根节点的裸文本节点，PM 按 DOM 重建后就多出一个空段落。
   实测症状：① 计数器永远比实际字数多 1（输入 1 个字显示 2 / 1000）；
   ② Backspace 删完所有可见字符后仍残留 "\n"，再也删不掉；
   ③ 输入法合成中的原始拼音被当真实文本落进正文（显示成 "w我看"）。
   要压低空段落高度请改 .comment-input__body 的 min-height，别隐藏这个 <br>。 */
.comment-input :deep(.comment-input__body p) {
  /* 双保险：空段落始终保有一个行盒（1.7 与 .comment-input__body 的 line-height 一致） */
  min-height: 1.7em;
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
  outline: 2px solid var(--color-accent-deep);
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
