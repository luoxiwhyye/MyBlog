<template>
  <div class="article-editor">
    <el-card>
      <template #header>
        <div class="header-actions">
          <el-button @click="goBack">返回列表</el-button>
          <h3>{{ isEdit ? '编辑文章' : '写文章' }}</h3>
          <div class="header-right">
            <el-tag v-if="draftSaved" type="info" size="small" effect="plain">
              草稿已自动保存 {{ draftSavedTime }}
            </el-tag>
            <el-button :icon="View" @click="previewVisible = true">预览</el-button>
          </div>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="标题" prop="title">
          <el-input
            v-model="form.title"
            placeholder="请输入文章标题"
          />
        </el-form-item>

        <el-form-item label="分类" prop="typeId">
          <!-- filterable 为**纯客户端过滤**：分类/标签选项早已由 fetchAllPagedOptions
               全量拉取到本地，故不要改成 remote + remote-method（会多一次无收益的请求）。
               Element Plus 的默认过滤是转义后的「大小写不敏感子串」匹配，中文无需额外处理。 -->
          <el-select
            v-model="form.typeId"
            placeholder="搜索或选择分类"
            class="article-type-select"
            filterable
            no-match-text="无匹配分类，请先在「分类管理」创建"
          >
            <el-option
              v-for="type in typeList"
              :key="type.id"
              :label="type.typeName"
              :value="type.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="标签" prop="labelIds">
          <!-- 同上：本地过滤；另加 clearable 以便一次性清空已选标签
               （分类是必填项，给它加 clearable 会在清空瞬间弹出校验错误，故分类不加）。
               Enter 的接管靠 onMounted 里的**原生捕获监听**（不能写成 @keydown.enter.capture：
               该 attrs 落不到含内部 input 的根节点上，实测不触发），详见 handleLabelEnter 注释。 -->
          <el-select
            ref="labelSelectRef"
            v-model="form.labelIds"
            multiple
            filterable
            clearable
            placeholder="搜索或选择标签"
            class="article-label-select"
            no-match-text="无匹配标签，请先在「标签管理」创建"
            :style="{ width: `${labelSelectWidth}px` }"
            @visible-change="handleLabelVisibleChange"
          >
            <el-option
              v-for="label in labelList"
              :key="label.id"
              :label="label.labelName"
              :value="label.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="封面">
          <el-upload
            ref="uploadRef"
            :action="''"
            :auto-upload="false"
            :show-file-list="false"
            :on-change="handleCoverChange"
            accept="image/*"
          >
            <div v-if="form.coverImage" class="cover-preview">
              <el-image
                :src="form.coverImage"
                fit="cover"
                style="width: 200px; height: 120px;"
              />
              <div class="cover-actions">
                <el-button type="danger" size="small" @click.stop="removeCover">删除</el-button>
              </div>
            </div>
            <el-button v-else type="primary">上传封面</el-button>
          </el-upload>
        </el-form-item>

        <el-form-item label="摘要">
          <div class="summary-field">
            <el-input
              v-model="form.summary"
              type="textarea"
              :rows="3"
              placeholder="请输入文章摘要，或点击右侧按钮自动生成"
            />
            <el-button :loading="generatingSummary" @click="autoGenerateSummary">
              自动生成
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="内容" prop="content">
          <div class="editor-mode-bar">
            <el-radio-group v-model="editorMode" size="small" @change="handleModeChange">
              <el-radio-button value="richtext">富文本</el-radio-button>
              <el-radio-button value="markdown">Markdown</el-radio-button>
            </el-radio-group>
            <span class="editor-mode-tip">
              {{ editorMode === 'markdown' ? '左侧编写 Markdown，右侧实时预览' : '使用工具栏格式化，所见即所得' }}
            </span>
          </div>

          <div v-if="editorMode === 'richtext'" class="quill-wrapper">
            <QuillEditor
              ref="quillRef"
              v-model:content="form.content"
              content-type="html"
              :options="editorOptions"
              class="quill-editor"
            />
          </div>

          <div v-else class="md-editor">
            <div class="md-editor-left">
              <div class="md-toolbar" role="toolbar" aria-label="Markdown 工具栏">
                <button type="button" class="md-tool-btn" title="加粗" @click="mdWrap('**', '**', '加粗文本')">B</button>
                <button type="button" class="md-tool-btn" title="斜体" @click="mdWrap('*', '*', '斜体文本')">I</button>
                <button type="button" class="md-tool-btn" title="标题" @click="mdLinePrefix('## ')">H</button>
                <button type="button" class="md-tool-btn" title="行内代码" @click="mdWrap('`', '`', 'code')">`</button>
                <button type="button" class="md-tool-btn" title="代码块" @click="mdWrap('\n```\n', '\n```\n', '代码块')">```</button>
                <button type="button" class="md-tool-btn" title="链接" @click="mdWrap('[', '](https://example.com)', '链接文本')">🔗</button>
                <button type="button" class="md-tool-btn" title="插入图片" @click="mdInsertImage">🖼</button>
                <button type="button" class="md-tool-btn" title="无序列表" @click="mdLinePrefix('- ')">•</button>
                <button type="button" class="md-tool-btn" title="有序列表" @click="mdLinePrefix('1. ')">1.</button>
                <button type="button" class="md-tool-btn" title="引用" @click="mdLinePrefix('> ')">❝</button>
                <button type="button" class="md-tool-btn" title="分隔线" @click="mdInsert('\n\n---\n\n')">—</button>
              </div>
              <el-input
                ref="mdInputRef"
                v-model="form.content"
                type="textarea"
                class="md-editor-input"
                :rows="18"
                placeholder="使用 Markdown 语法编写内容...&#10;&#10;### 标题&#10;**加粗** *斜体*&#10;- 列表项&#10;&#96;&#96;&#96;代码块&#96;&#96;&#96;&#10;&#10;![图片](URL)"
              />
            </div>
            <div class="md-editor-preview">
              <!-- 内容放在内层：绝对定位后其高度不再影响容器/行高（见 .md-editor-preview-body 注释） -->
              <div class="md-editor-preview-body" v-html="markdownPreview"></div>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="draft">草稿</el-radio>
            <el-radio value="published">发布</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            :loading="submitting"
            @click="submitArticle"
          >
            提交文章
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 预览面板 -->
    <el-dialog
      v-model="previewVisible"
      title="文章预览"
      width="min(760px, 94vw)"
      top="6vh"
      class="preview-dialog"
    >
      <div class="preview-body">
        <h1 class="preview-title">{{ form.title || '（未填写标题）' }}</h1>
        <div
          class="preview-content"
          :class="{ 'preview-markdown': editorMode === 'markdown' }"
          v-html="editorMode === 'markdown'
            ? (markdownPreview || '<p>暂无内容</p>')
            : (form.content || '<p>暂无内容</p>')"
        ></div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { View } from '@element-plus/icons-vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import MarkdownIt from 'markdown-it'
import TurndownService from 'turndown'
// 代码高亮（与前台正文渲染一致）：markdown-it highlight 渲染阶段生成
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { article, type as typeApi, label as labelApi, upload } from '@/api'

const route = useRoute()
const router = useRouter()

// 编辑模式：richtext（富文本，默认） | markdown（Markdown）
const editorMode = ref<'richtext' | 'markdown'>('richtext')
// 记录切换前的模式，用于取消时回退与转换方向判断
const prevEditorMode = ref<'richtext' | 'markdown'>('richtext')
// 防止确认对话框未决时重复触发
const modeChangePending = ref(false)

// markdown-it 单例 + highlight 代码高亮（与前台正文渲染一致）
// highlight 在渲染阶段生成完整代码块结构：高亮 + 语言标签 + 行号 + 复制按钮，
// 使"后台预览 = 前台所得"（前台 markdown-it 无 highlight 选项，改由挂载后 DOM 增强；
// 此处预览与前台观感一致，且不受 v-html 重渲染影响）。
const highlightCode = (str: string, lang?: string): string => {
  let highlighted = str
  let langLabel = 'code'
  let langClass = ''
  if (lang) {
    try {
      const result = hljs.highlight(str, { language: lang, ignoreIllegals: true })
      highlighted = result.value
      langLabel = lang
      langClass = `language-${lang}`
    } catch {
      // 未知语言：按纯文本高亮
      const result = hljs.highlightAuto(str)
      highlighted = result.value
      langLabel = lang
      langClass = `language-${lang}`
    }
  } else {
    const result = hljs.highlightAuto(str)
    highlighted = result.value
  }
  const lineCount = str.split('\n').length
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n')
  // 返回完整结构（markdown-it 检测到含 <pre> 不会重复包裹）
  return `<div class="code-block"><div class="code-block-header"><span class="code-lang">${langLabel}</span><button type="button" class="code-copy" aria-label="复制代码" data-code="${encodeURIComponent(str)}">复制</button></div><div class="code-block-body"><span class="code-lines" aria-hidden="true">${lineNumbers}</span><pre class="code-pre"><code class="${langClass} hljs">${highlighted}</code></pre></div></div>`
}

// markdown-it 单例（html 关闭以规避 XSS；linkify 开启）
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

// 覆盖默认 fence 渲染：只对代码块使用 highlight（fence 是 ``` 围栏代码块）
const defaultFence = md.renderer.rules.fence
md.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  if (!token || typeof token.content !== 'string') {
    return defaultFence ? defaultFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
  }
  const info = token.info ? token.info.trim().split(/\s+/g)[0] : ''
  const highlighted = highlightCode(token.content, info)
  if (highlighted.startsWith('<')) {
    return highlighted + '\n'
  }
  // 回退：交给默认渲染器
  return defaultFence ? defaultFence(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options)
}

// turndown 单例：富文本 HTML -> Markdown
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})

// Markdown 模式实时预览
const markdownPreview = computed(() => {
  const content = form.content || ''
  // Markdown 模式但内容看起来像富文本（如粘贴了 HTML）时，仍按 Markdown 处理
  return md.render(content) || '<p style="color:#94a3b8">暂无内容</p>'
})

// 保持 contentFormat 与当前编辑模式一致（草稿恢复/提交时使用）
// editorMode: richtext/markdown；content_format 入库值为 html/markdown
watch(editorMode, (mode) => {
  form.contentFormat = mode === 'richtext' ? 'html' : 'markdown'
})

/**
 * 切换编辑模式：富文本 <-> Markdown。
 * 富文本内容为 HTML，Markdown 内容为 MD 语法。
 * 切换时二次确认，并做一次可选转换（HTML→MD 用 turndown，MD→HTML 用 markdown-it）。
 */
const handleModeChange = (newMode: 'richtext' | 'markdown') => {
  const fromMode = prevEditorMode.value
  if (fromMode === newMode) return
  if (modeChangePending.value) {
    editorMode.value = fromMode
    return
  }

  const content = form.content || ''
  if (!content.trim()) {
    prevEditorMode.value = newMode
    return
  }

  modeChangePending.value = true
  const isToMarkdown = fromMode === 'richtext' && newMode === 'markdown'
  const message = isToMarkdown
    ? '当前为富文本内容，切换到 Markdown 将尝试把 HTML 转换为 Markdown 语法（可能存在格式损耗）。是否转换？'
    : '当前为 Markdown 内容，切换到富文本将尝试渲染为 HTML（可能存在格式损耗）。是否转换？'

  ElMessageBox.confirm(message, '切换编辑器模式', {
    type: 'warning',
    confirmButtonText: '转换并切换',
    cancelButtonText: '取消（返回原模式）',
  })
    .then(() => {
      if (isToMarkdown) {
        form.content = turndown.turndown(content)
      } else {
        // markdown -> richtext：把 MD 渲染为 HTML 供 Quill 展示
        form.content = md.render(content)
      }
      prevEditorMode.value = newMode
    })
    .catch(() => {
      // 取消：回退到原模式，内容保持不变
      editorMode.value = fromMode
    })
    .finally(() => {
      modeChangePending.value = false
    })
}

const formRef = ref()
const uploadRef = ref()

// Markdown 模式的原生 textarea 引用（用于光标插入）
const mdInputRef = ref<any>(null)

/** 获取 Markdown 编辑区原生 textarea 元素（Element Plus el-input 暴露 .textarea） */
const getMdTextarea = (): HTMLTextAreaElement | null => {
  const el = mdInputRef.value
  if (!el) return null
  return (
    (el.textarea as HTMLTextAreaElement) ||
    (el.$el?.querySelector('textarea') as HTMLTextAreaElement) ||
    null
  )
}

/** 在光标处插入原始文本（如分隔线） */
const mdInsert = (raw: string) => {
  const ta = getMdTextarea()
  if (!ta) {
    form.content += raw
    return
  }
  const start = ta.selectionStart ?? form.content.length
  const newValue = form.content.slice(0, start) + raw + form.content.slice(start)
  form.content = newValue
  nextTick(() => {
    const caret = start + raw.length
    ta.focus()
    ta.setSelectionRange(caret, caret)
  })
}

/** 包裹选中文本：before + selected + after（未选中则用 placeholder） */
const mdWrap = (before: string, after: string, placeholder: string) => {
  const ta = getMdTextarea()
  if (!ta) {
    form.content += before + placeholder + after
    return
  }
  const start = ta.selectionStart ?? form.content.length
  const end = ta.selectionEnd ?? start
  const selected = form.content.slice(start, end) || placeholder
  const insert = before + selected + after
  const newValue = form.content.slice(0, start) + insert + form.content.slice(end)
  form.content = newValue
  nextTick(() => {
    const caret = start + before.length + selected.length
    ta.focus()
    ta.setSelectionRange(caret, caret)
  })
}

/** 在当前行首添加前缀（标题/列表/引用） */
const mdLinePrefix = (prefix: string) => {
  const ta = getMdTextarea()
  if (!ta) {
    form.content = prefix + form.content
    return
  }
  const start = ta.selectionStart ?? 0
  const content = form.content
  const lineStart = content.lastIndexOf('\n', start - 1) + 1
  const newValue = content.slice(0, lineStart) + prefix + content.slice(lineStart)
  form.content = newValue
  nextTick(() => {
    const caret = lineStart + prefix.length
    ta.focus()
    ta.setSelectionRange(caret, caret)
  })
}

/** Markdown 模式插入图片：上传后在光标处插入 ![alt](url) */
const mdInsertImage = async () => {
  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.setAttribute('accept', 'image/*')
  input.click()
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const response = await upload.image(file, 'article-content')
      if (response.code !== 200 && response.code !== 201) {
        ElMessage.error(response.message || '图片上传失败')
        return
      }
      const imageUrl = response.data?.url
      if (!imageUrl) {
        ElMessage.error('上传结果缺少图片地址')
        return
      }
      // 在光标处插入 Markdown 图片语法
      mdWrap('![', `](${imageUrl})`, '图片描述')
      ElMessage.success('图片上传成功')
    } catch (err) {
      console.error('Markdown 图片上传失败', err)
      ElMessage.error('图片上传失败')
    } finally {
      input.value = ''
    }
  }
}

const isEdit = ref(false)
const submitting = ref(false)
const previewVisible = ref(false)
const draftSaved = ref(false)
const draftSavedTime = ref('')
const generatingSummary = ref(false)
const typeList = ref<any[]>([])
const labelList = ref<any[]>([])
const baseSelectWidth = 240

// localStorage 草稿自动保存
const DRAFT_KEY = 'myblog:article-draft'
let saveTimer: ReturnType<typeof setTimeout> | null = null
let savedAtTimer: ReturnType<typeof setTimeout> | null = null

const quillRef = ref<any>(null)

const form = reactive({
  title: '',
  typeId: null as number | null,
  labelIds: [] as number[],
  coverImage: '',
  summary: '',
  content: '',
  contentFormat: 'html' as 'html' | 'markdown',
  status: 'draft'
})

// 防抖自动保存草稿到 localStorage（仅"写文章"未提交场景；编辑已有文章不写，避免污染草稿恢复）
const scheduleDraftSave = () => {
  if (isEdit.value) return
  draftSaved.value = false
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form }))
      draftSaved.value = true
      const now = new Date()
      draftSavedTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
    } catch {
      // localStorage 不可用则忽略
    }
  }, 800)
}

// 恢复本地草稿（仅新建文章时）
const restoreDraft = () => {
  if (isEdit.value) return
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const saved = JSON.parse(raw)
    if (saved?.title || saved?.content) {
      const isMarkdown = saved.contentFormat === 'markdown'
      Object.assign(form, {
        title: saved.title || '',
        typeId: saved.typeId ?? null,
        labelIds: Array.isArray(saved.labelIds) ? saved.labelIds : [],
        coverImage: saved.coverImage || '',
        summary: saved.summary || '',
        content: saved.content || '',
        contentFormat: isMarkdown ? 'markdown' : 'html',
        status: saved.status || 'draft',
      })
      editorMode.value = isMarkdown ? 'markdown' : 'richtext'
      prevEditorMode.value = isMarkdown ? 'markdown' : 'richtext'
    }
  } catch {
    // 忽略损坏的草稿
  }
}

// 清除本地草稿（发布成功后调用）
const clearDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

// 自动生成摘要（截取正文前 N 字）
const autoGenerateSummary = () => {
  const plainText = (form.content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plainText) {
    ElMessage.warning('请先填写文章内容')
    return
  }
  generatingSummary.value = true
  savedAtTimer = setTimeout(() => {
    form.summary = plainText.slice(0, 120) + (plainText.length > 120 ? '…' : '')
    generatingSummary.value = false
    ElMessage.success('摘要已自动生成')
  }, 200)
}

// 监听表单变化触发自动保存
watch(
  () => ({ ...form }),
  () => scheduleDraftSave(),
  { deep: false },
)

const labelSelectWidth = computed(() => {
  const extraCount = Math.max(0, form.labelIds.length - 2)
  return Math.min(720, baseSelectWidth + extraCount * 46)
})

/* ===== 标签下拉的 Enter 键接管（必须用捕获阶段，见模板注释） =====
 * 背景：Element Plus 在 multiple 模式下的 Enter = selectOption() → 对「当前高亮项」做 toggle：
 *     const optionIndex = getValueIndex(value, option)
 *     if (optionIndex > -1) value.splice(optionIndex, 1)   // ← 已选 → 取消选中（删除！）
 *     else value.push(option.value)
 * 而高亮项通常恰好是「刚选中的那一个」：reserveKeyword 默认 true（选中后关键词保留、列表不变），
 * 且 updateHoveringIndex 会主动把 hoveringIndex 指向最后一个已选项。
 * → 结果：点选一个标签后再按 Enter（含盲按）会把它「取消掉」，属破坏性行为，而非简单的无响应。
 *
 * 规则：
 *   1) 高亮项是「匹配关键词且未选中」→ 交回 Element Plus 原生处理（鼠标悬停 / ↓ 后回车的正常路径）
 *   2) 其余情况一律拦下，改为「加入第一个匹配且未选中的标签」
 *   3) 没有候选就什么都不做 —— 绝不出现「按 Enter 反而删标签」
 *
 * 未动：Backspace 在输入框为空时删除末尾标签是原生行为（仍是正常的删除方式）；
 *      分类是单选，Enter 在 Element Plus 里只是「重新确认高亮项」、不会删除，
 *      为避免破坏「↓ + 回车」的原生路径，未对它做同样的接管。
 *
 * ⚠️ 监听必须用**原生捕获阶段**（见下方 onMounted 的 addEventListener(..., true)）：
 *   Element Plus 把 Enter 处理绑在内部 input 上，并且在处理完会 preventDefault + stopPropagation，
 *   所以冒泡阶段（挂在根元素上的 @keydown）根本没机会执行；
 *   而写成 @keydown.enter.capture 也不行 —— 该 attrs 落不到含 input 的根节点上（实测不触发）。
 */
const labelSelectRef = ref<any>(null)
const labelDropdownOpen = ref(false)

const handleLabelVisibleChange = (visible: boolean) => {
  labelDropdownOpen.value = visible
}

/** 与 Element Plus 默认过滤保持一致：转义后的「大小写不敏感子串」匹配 */
const labelMatchesKeyword = (name: unknown, keyword: string) =>
  String(name).toLowerCase().includes(keyword.toLowerCase())

/** 取当前下拉里被高亮（鼠标悬停或 ↓ 选中）的那一项文案；取不到返回 undefined */
const getHoveredOptionLabel = (input: HTMLElement | null) => {
  const listId = input?.getAttribute("aria-controls")
  const list = listId ? document.getElementById(listId) : null
  return list?.querySelector(".el-select-dropdown__item.is-hovering")?.textContent?.trim()
}

const handleLabelEnter = (event: KeyboardEvent) => {
  // 只接管 Enter；方向键 / Backspace / 输入等一律放行（⌨️ 捕获阶段若吞掉方向键会让下拉无法用键盘导航）
  if (event.key !== "Enter") return
  if (!labelDropdownOpen.value) return
  const input = event.target as HTMLInputElement | null
  const keyword = (input?.value ?? "").trim()
  const hovered = getHoveredOptionLabel(input)
  const hoveredIsUnselectedMatch =
    !!keyword &&
    !!hovered &&
    labelMatchesKeyword(hovered, keyword) &&
    !labelList.value.some(
      (l) => String(l.labelName) === hovered && form.labelIds.includes(l.id),
    )
  // 高亮的正是「未选中的匹配项」→ 交回原生逻辑，不干预
  if (hoveredIsUnselectedMatch) return
  event.preventDefault()
  event.stopPropagation()
  if (!keyword) return
  const next = labelList.value.find(
    (l) => labelMatchesKeyword(l.labelName, keyword) && !form.labelIds.includes(l.id),
  )
  if (next) form.labelIds = [...form.labelIds, next.id]
}

const fetchAllPagedOptions = async <T>(
  fetchPage: (params: { page: number; pageSize: number }) => Promise<any>
) => {
  const pageSize = 100
  let page = 1
  let total = 0
  const allItems: T[] = []

  do {
    const response = await fetchPage({ page, pageSize })
    const list = (response.data?.list || []) as T[]
    total = response.data?.total || 0
    allItems.push(...list)
    page += 1
  } while (allItems.length < total)

  return allItems
}

const rules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  typeId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

const editorOptions = {
  theme: 'snow',
  placeholder: '请输入文章内容...',
  modules: {
    toolbar: {
      container: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean'],
      ],
      handlers: {
        image: () => {
          const input = document.createElement('input')
          input.setAttribute('type', 'file')
          input.setAttribute('accept', 'image/*')
          input.click()
          input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) return
            try {
              const response = await upload.image(file, 'article-content')
              if (response.code !== 200 && response.code !== 201) {
                ElMessage.error(response.message || '图片上传失败')
                return
              }

              const imageUrl = response.data?.url
              if (!imageUrl) {
                ElMessage.error('上传结果缺少图片地址')
                return
              }

              const quill = quillRef.value?.getQuill?.() as any
              if (!quill) {
                ElMessage.error('富文本编辑器实例获取失败')
                return
              }

              let range = null
              if (quill.getSelection) {
                range = quill.getSelection()
              }
              let insertIndex = 0
              if (range && typeof range.index === 'number') {
                insertIndex = range.index
              } else if (quill.getLength) {
                insertIndex = quill.getLength()
              }

              quill.insertEmbed(insertIndex, 'image', imageUrl)
              quill.setSelection(insertIndex + 1)
              ElMessage.success('图片上传成功')
            } catch (err) {
              console.error('富文本图片上传失败', err)
              ElMessage.error('图片上传失败')
            } finally {
              input.value = ''
            }
          }
        },
      },
    },
  },
}

// 获取分类和标签列表
const fetchOptions = async () => {
  try {
    const [allTypes, allLabels] = await Promise.all([
      fetchAllPagedOptions(typeApi.getList),
      fetchAllPagedOptions(labelApi.getList)
    ])

    typeList.value = allTypes
    labelList.value = allLabels
  } catch (error) {
    console.error('获取选项失败:', error)
  }
}

// 获取文章详情
const fetchArticle = async (id: number) => {
  try {
    const response = await article.getDetail(id)
    if (response.code === 200) {
      const data = response.data
      Object.assign(form, {
        title: data.title,
        typeId: data.typeId,
        labelIds: data.labelIds,
        coverImage: data.coverImage,
        summary: data.summary,
        content: data.content,
        contentFormat: data.contentFormat === 'markdown' ? 'markdown' : 'html',
        status: data.status
      })
      const fmt = data.contentFormat === 'markdown' ? 'markdown' : 'richtext'
      editorMode.value = fmt
      prevEditorMode.value = fmt
    }
  } catch (error) {
    ElMessage.error('获取文章详情失败')
  }
}

// 处理封面上传
const handleCoverChange = async (file: any) => {
  try {
    const response = await upload.image(file.raw, 'article-cover')
    if (response.code === 200) {
      form.coverImage = response.data.url
      console.log(form.coverImage)
      ElMessage.success('封面上传成功')
    }
  } catch (error) {
    ElMessage.error('封面上传失败')
  }
}

// 删除封面
const removeCover = () => {
  form.coverImage = ''
}

// 提交文章
const submitArticle = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid: boolean) => {
    if (valid) {
      submitting.value = true
      try {
        const formData = new FormData()
        formData.append('title', form.title)
        formData.append('typeId', (form.typeId || 0).toString())
        formData.append('content', form.content)
        formData.append('contentFormat', form.contentFormat)
        formData.append('summary', form.summary || '')
        formData.append('status', form.status)
        formData.append('labelIds', form.labelIds.join(','))

        if (form.coverImage) {
          formData.append('coverImageUrl', form.coverImage)
        }

        let response
        if (isEdit.value) {
          response = await article.update(Number(route.params.id), formData)
        } else {
          response = await article.create(formData)
        }

        if (response.code === 200 || response.code === 201) {
          ElMessage.success(form.status === 'draft' ? '保存草稿成功' : '发布成功')
          if (form.status === 'published') {
            clearDraft()
          }
          router.push('/admin/articles')
        } else {
          ElMessage.error(response.message || '操作失败')
        }
      } catch (error) {
        ElMessage.error('操作失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

// 返回列表
const goBack = () => {
  router.push('/admin/articles')
}

// 重置表单为初始（写文章）状态
const resetForm = () => {
  form.title = ''
  form.typeId = null
  form.labelIds = []
  form.coverImage = ''
  form.summary = ''
  form.content = ''
  form.contentFormat = 'html'
  form.status = 'draft'
  editorMode.value = 'richtext'
  prevEditorMode.value = 'richtext'
}

// 初始化编辑器：根据当前路由是否有 id 决定「编辑」或「写文章」
const initEditor = async () => {
  const id = route.params.id
  if (id) {
    isEdit.value = true
    await fetchArticle(Number(id))
  } else {
    isEdit.value = false
    // 写文章：清掉上一篇残留（表单 + 前一篇文章的草稿），再恢复本地草稿（仅新建时）
    resetForm()
    restoreDraft()
  }
}

// 代码块「复制」事件委托（与前台一致）：点击 .code-copy 复制 data-code 内容
const handlePreviewCopy = async (e: Event) => {
  const target = e.target as HTMLElement
  const btn = target.closest<HTMLButtonElement>('.code-copy')
  if (!btn) return
  const encoded = btn.dataset.code
  if (!encoded) return
  try {
    const text = decodeURIComponent(encoded)
    await navigator.clipboard.writeText(text)
    const original = btn.textContent || '复制'
    btn.textContent = '已复制'
    setTimeout(() => { btn.textContent = original }, 1500)
  } catch {
    // 复制失败静默
  }
}

/** el-select 的根元素（含内部 input），用于在捕获阶段挂 keydown（详见 handleLabelEnter 注释） */
const labelSelectRoot = () => labelSelectRef.value?.$el as HTMLElement | undefined

onMounted(async () => {
  await fetchOptions()
  await initEditor()
  document.addEventListener('click', handlePreviewCopy)
  labelSelectRoot()?.addEventListener('keydown', handleLabelEnter, true)
})

// 关键：编辑/写文章共用同一组件实例（articles/edit/:id?），
// 从「编辑」切到「写文章」(id 消失) 时组件复用不复位，必须监听路由参数变化重置表单。
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId === oldId) return
    // 从编辑（有 id）切到写文章（无 id）：先清旧草稿，避免把上一篇内容带进来
    if (!newId && oldId !== undefined) {
      clearDraft()
    }
    void initEditor()
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('click', handlePreviewCopy)
  labelSelectRoot()?.removeEventListener('keydown', handleLabelEnter, true)
  if (saveTimer) clearTimeout(saveTimer)
  if (savedAtTimer) clearTimeout(savedAtTimer)
})
</script>

<style lang="scss" scoped>
.article-editor {
  padding: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-field {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  width: 100%;

  .el-textarea {
    flex: 1;
  }

  .el-button {
    flex-shrink: 0;
    margin-top: 2px;
  }
}

.article-type-select {
  width: 240px;
}

.article-label-select {
  min-width: 240px;
  max-width: 100%;
}

.cover-preview {
  position: relative;
  display: inline-block;
}

.cover-actions {
  position: absolute;
  top: 5px;
  right: 5px;
}

.cover-preview .el-image__inner {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}

/* 编辑模式切换栏 */
.editor-mode-bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
}

.editor-mode-tip {
  font-size: 12px;
  color: #94a3b8;
}

/* Markdown 左右分屏编辑
   ---------------------------------------------------------------
   等高规则（本项修复的核心）：
   · 左列 = 自绘工具栏 + 间距 + 文本域；右列只有预览内容，**没有**工具栏那一截。
   · 所以行高必须由左列驱动，右列只负责「填满行高」。
   · 若让右列自己定高（height: auto），预览内容会反过来撑高整行
     —— 实测灌入 200 段文本可把整行顶到 12826px、且预览失去内部滚动（scrollHeight == clientHeight），
     比原来「矮 52px」严重得多。故预览内容必须与容器高度解耦（见 .md-editor-preview-body）。
   --------------------------------------------------------------- */
$md-pane-height: 440px; /* 三处「内容区」的共用高度：MD 文本域 / MD 预览 / 富文本容器 */

.md-editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
  /* 默认值就是 stretch：两列等高。
     原先写死的 align-items: start 会阻止拉伸 → 预览永远矮「工具栏 + 间距」一截
     （实测 44 + 8 = 52px，正是本项要修的落差）。 */
  align-items: stretch;
}

.md-editor-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

/* Markdown 最小工具栏 */
.md-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #fafafa;
}

.md-tool-btn {
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: #475569;
  font-size: 13px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.md-tool-btn:hover {
  background: #eef2f7;
  border-color: #d1d5db;
  color: #0f172a;
}

.md-tool-btn:active {
  background: #e2e8f0;
}

.md-tool-btn--code {
  font-size: 12px;
}

.md-editor-input :deep(.el-textarea__inner) {
  /* 用 min-height 而非 height（原为 height: 440px !important）：
     ① 恢复被 !important 顶死的 resize: vertical；
     ② 拖动改高 → 左列变高 → 行高变高 → 预览自动跟随，等高关系不破。
     ⚠️ 这里必须带 !important：Element Plus 对 textarea **始终**写行内 min-height
        （input.vue 的 resizeTextarea：非 autosize 分支 = calcTextareaHeight(el).minHeight，
         默认 minRows=1 → 34px 的防塌陷保护），而行内样式优先于样式表。
         不带 !important 的话本行会被忽略、高度退回 :rows="18" 的自然高（438px，非整数）。 */
  min-height: $md-pane-height !important;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  word-break: break-word;
}

.md-editor-preview {
  position: relative;
  /* 不设 height：高度由 grid 行高（= 左列）拉伸得到，因此不参与行高竞争；
     滚动交给内层 body，容器只负责裁剪。 */
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background: #fff;
  box-sizing: border-box;
}

/* 预览内容层：绝对定位 → 高度不再影响容器，只负责「填满容器 + 自己滚动」。
   内边距从容器移到这一层，视觉与改动前一致（border 1px + padding 12px）。 */
.md-editor-preview-body {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  padding: 12px 14px;
  box-sizing: border-box;
  word-break: break-word;
}

.md-editor-preview h1,
.md-editor-preview h2,
.md-editor-preview h3 {
  margin: 0.6em 0 0.4em;
  line-height: 1.3;
}

.md-editor-preview p {
  margin: 0.4em 0;
}

.md-editor-preview pre {
  background: #f5f5f5;
  padding: 10px 12px;
  border-radius: 4px;
  overflow-x: auto;
}

.md-editor-preview code {
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
}

.md-editor-preview pre code {
  background: transparent;
  padding: 0;
}

.md-editor-preview blockquote {
  border-left: 3px solid #d0d7de;
  margin: 0.6em 0;
  padding-left: 12px;
  color: #57606a;
}

/* ===== 代码块（高亮/行号/语言/复制）—— 与前台 .article-body 观感一致 =====
   注：v-html 注入的 DOM 不带 scoped data-v，须用 :deep 命中 */
.md-editor-preview :deep(.code-block),
.preview-content :deep(.code-block) {
  margin: 1em 0;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  position: relative;
}

.md-editor-preview :deep(.code-block-header),
.preview-content :deep(.code-block-header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #f6f8fa;
  border-bottom: 1px solid #e5e7eb;
}

.md-editor-preview :deep(.code-lang),
.preview-content :deep(.code-lang) {
  color: #57606a;
  font-size: 12px;
  font-weight: 600;
  text-transform: lowercase;
}

.md-editor-preview :deep(.code-copy),
.preview-content :deep(.code-copy) {
  border: none;
  background: transparent;
  color: #57606a;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}

.md-editor-preview :deep(.code-copy:hover),
.preview-content :deep(.code-copy:hover) {
  color: #0969da;
  background: rgba(9, 105, 218, 0.08);
}

.md-editor-preview :deep(.code-block-body),
.preview-content :deep(.code-block-body) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
}

.md-editor-preview :deep(.code-lines),
.preview-content :deep(.code-lines) {
  padding: 10px 0;
  min-width: 40px;
  text-align: right;
  color: #94a3b8;
  background: #f6f8fa;
  border-right: 1px solid #e5e7eb;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
  user-select: none;
  padding-right: 10px;
  /* 关键：span 默认 white-space:normal 会把 1\n2\n3 折叠成空格横向排列，须保留换行使其每行一个 */
  white-space: pre;
}

.md-editor-preview :deep(.code-pre),
.preview-content :deep(.code-pre) {
  margin: 0;
  padding: 10px 14px;
  background: transparent;
  overflow-x: auto;
  border-radius: 0;
  /* 确保代码原样保留换行，与行号逐行对齐 */
  white-space: pre;
}

.md-editor-preview :deep(.code-pre code),
.preview-content :deep(.code-pre code) {
  background: transparent;
  padding: 0;
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
}

/* 代码块高亮主题（github）全局生效，覆盖 .hljs 默认 */
.md-editor-preview :deep(.hljs),
.preview-content :deep(.hljs) {
  background: transparent;
  padding: 0;
}

.md-editor-preview a {
  color: #0969da;
}

@media (max-width: 768px) {
  .md-editor {
    grid-template-columns: 1fr;
  }

  /* 单列时预览自成一行，行高不再由左列提供 → 必须给确定高度，
     否则容器里只剩绝对定位内容、会塌成 0 高。
     （原为 height: auto + max-height: 300px，在解耦后 height: auto 会变成 0。） */
  .md-editor-preview {
    height: 300px;
  }
}

.quill-wrapper {
  width: 100%;
}

.quill-wrapper :deep(.ql-toolbar),
.quill-wrapper :deep(.ql-container) {
  width: 100% !important;
}

.quill-wrapper :deep(.ql-container) {
  /* 与 Markdown 的内容区同高：切换编辑模式时高度不跳（原为 420px，比 MD 少 20px）。
     总高：MD = 工具栏 44 + 间距 8 + 440 = 492；富文本 = Quill 工具栏 50 + 440 = 490，
     二者相差 2px，来自两个工具栏本身的高度差，不再用魔法数字去硬凑。 */
  height: $md-pane-height;
  max-width: 100%;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-y: auto;
}

/* 不再给 .ql-editor 写死高度：Quill 自带 .ql-editor { height: 100%; overflow-y: auto }，
   写死 340px 会在大一点的容器里留下空白（原 420px 容器里正好空 80px）。 */

.quill-wrapper :deep(.ql-editor img) {
  max-width: 100%;
  object-fit: cover;
  display: block;
}

/* 预览面板 */
.preview-dialog {
  :deep(.el-dialog__body) {
    max-height: 70vh;
    overflow-y: auto;
  }
}

.preview-body {
  padding: 8px 4px;
}

.preview-title {
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
}

.preview-content {
  color: var(--text-secondary);
  line-height: 1.9;
  font-size: 15px;
  word-break: break-word;

  :deep(img) {
    max-width: 100%;
    border-radius: 8px;
  }

  :deep(blockquote) {
    border-left: 4px solid var(--color-accent);
    padding: 8px 16px;
    margin: 12px 0;
    background: var(--bg-hover);
    border-radius: 0 8px 8px 0;
  }

  :deep(pre) {
    background: var(--bg-code);
    padding: 14px;
    border-radius: 8px;
    overflow-x: auto;
  }

  :deep(a) {
    color: var(--color-accent);
  }
}
</style>