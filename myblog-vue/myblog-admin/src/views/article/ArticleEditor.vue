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
          <el-select
            v-model="form.typeId"
            placeholder="请选择分类"
            class="article-type-select"
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
          <el-select
            v-model="form.labelIds"
            multiple
            placeholder="请选择标签"
            class="article-label-select"
            :style="{ width: `${labelSelectWidth}px` }"
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
            <div class="md-editor-preview" v-html="markdownPreview"></div>
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
          v-html="form.content || '<p style=\'color:#94a3b8\'>暂无内容</p>'"
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
import { article, type as typeApi, label as labelApi, upload } from '@/api'

const route = useRoute()
const router = useRouter()

// 编辑模式：richtext（富文本，默认） | markdown（Markdown）
const editorMode = ref<'richtext' | 'markdown'>('richtext')
// 记录切换前的模式，用于取消时回退与转换方向判断
const prevEditorMode = ref<'richtext' | 'markdown'>('richtext')
// 防止确认对话框未决时重复触发
const modeChangePending = ref(false)

// markdown-it 单例（html 关闭以规避 XSS；linkify 开启）
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

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

// 防抖自动保存草稿到 localStorage
const scheduleDraftSave = () => {
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

onMounted(async () => {
  await fetchOptions()

  const id = route.params.id
  if (id) {
    isEdit.value = true
    await fetchArticle(Number(id))
  } else {
    restoreDraft()
  }
})

onBeforeUnmount(() => {
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

/* Markdown 左右分屏编辑 */
.md-editor {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
  align-items: start;
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
  height: 440px !important;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', Consolas, monospace;
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  word-break: break-word;
}

.md-editor-preview {
  height: 440px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 12px 14px;
  background: #fff;
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

.md-editor-preview img {
  max-width: 100%;
  height: auto;
}

.md-editor-preview a {
  color: #0969da;
}

@media (max-width: 768px) {
  .md-editor {
    grid-template-columns: 1fr;
  }

  .md-editor-preview {
    height: auto;
    max-height: 300px;
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
  height: 420px !important;
  max-width: 100%;
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-y: auto;
}

.quill-wrapper :deep(.ql-editor) {
  min-height: 340px;
  height: 340px;
}

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