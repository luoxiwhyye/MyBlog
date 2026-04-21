<template>
  <div class="article-editor">
    <el-card>
      <template #header>
        <div class="header-actions">
          <el-button @click="goBack">返回列表</el-button>
          <h3>{{ isEdit ? '编辑文章' : '写文章' }}</h3>
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
            style="width: 200px"
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
            style="width: 300px"
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
          <el-input
            v-model="form.summary"
            type="textarea"
            :rows="3"
            placeholder="请输入文章摘要"
          />
        </el-form-item>

        <el-form-item label="内容" prop="content">
          <div class="quill-wrapper">
            <QuillEditor
              ref="quillRef"
              v-model:content="form.content"
              content-type="html"
              :options="editorOptions"
              class="quill-editor"
            />
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { article, type as typeApi, label as labelApi, upload } from '@/api'

const route = useRoute()
const router = useRouter()

const formRef = ref()
const uploadRef = ref()

const isEdit = ref(false)
const submitting = ref(false)
const typeList = ref<any[]>([])
const labelList = ref<any[]>([])

const quillRef = ref<any>(null)

const form = reactive({
  title: '',
  typeId: null,
  labelIds: [],
  coverImage: '',
  summary: '',
  content: '',
  status: 'draft'
})

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
    const [typeRes, labelRes] = await Promise.all([
      typeApi.getList(),
      labelApi.getList()
    ])
    if (typeRes.code === 200) {
      typeList.value = typeRes.data.list
    }
    if (labelRes.code === 200) {
      labelList.value = labelRes.data.list
    }
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
        status: data.status
      })
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
  }
})
</script>

<style scoped>
.article-editor {
  padding: 20px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
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
</style>