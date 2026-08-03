<template>
  <div class="settings">
    <el-card shadow="never" class="panel-card">
      <template #header>
        <div class="page-header">
          <div>
            <h3>系统设置</h3>
            <p class="page-desc">分组管理站点配置，保存后即时生效（缓存自动失效）。支持一键导出 / 导入 JSON。</p>
          </div>
          <div class="header-actions">
            <el-button @click="exportJson" :icon="Download">导出配置</el-button>
            <el-upload
              :show-file-list="false"
              accept="application/json"
              :auto-upload="false"
              :on-change="handleImportFile"
            >
              <el-button :icon="Upload">导入配置</el-button>
            </el-upload>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab" class="settings-tabs">
        <el-tab-pane
          v-for="group in groups"
          :key="group.key"
          :name="group.key"
          :label="group.label"
        >
          <el-form
            ref="formRef"
            :model="formData"
            :rules="formRules"
            label-width="140px"
            label-position="right"
            class="settings-form"
          >
            <el-form-item
              v-for="field in group.fields"
              :key="field.key"
              :label="field.label"
              :prop="field.key"
            >
              <!-- 文本类型 -->
              <el-input
                v-if="field.type === 'text'"
                v-model="formData[field.key]"
                :placeholder="field.placeholder"
                clearable
              />

              <!-- 多行文本 -->
              <el-input
                v-else-if="field.type === 'textarea'"
                v-model="formData[field.key]"
                type="textarea"
                :rows="3"
                :placeholder="field.placeholder"
              />

              <!-- 图片类型 -->
              <div v-else-if="field.type === 'image'" class="image-field">
                <div class="image-preview" v-if="formData[field.key]">
                  <el-image
                    :src="formData[field.key]"
                    fit="cover"
                    class="preview-img"
                  />
                  <div class="image-actions">
                    <el-upload
                      :ref="(el: any) => setUploadRef(field.key, el)"
                      :action="''"
                      :auto-upload="false"
                      :show-file-list="false"
                      :on-change="(file: any) => handleImageChange(field.key, file)"
                      accept="image/*"
                    >
                      <el-button size="small" type="primary">更换</el-button>
                    </el-upload>
                    <el-button size="small" type="danger" plain @click="removeImage(field.key)">清除</el-button>
                  </div>
                </div>
                <el-upload
                  v-else
                  :ref="(el: any) => setUploadRef(field.key, el)"
                  :action="''"
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="(file: any) => handleImageChange(field.key, file)"
                  accept="image/*"
                  drag
                >
                  <div class="upload-placeholder">
                    <el-icon :size="24"><UploadFilled /></el-icon>
                    <span>点击或拖拽上传图片</span>
                  </div>
                </el-upload>
              </div>

              <!-- 布尔类型 -->
              <el-switch
                v-else-if="field.type === 'boolean'"
                v-model="formData[field.key]"
                :active-value="'true'"
                :inactive-value="'false'"
              />

              <!-- 说明 -->
              <div v-if="field.description" class="field-desc">{{ field.description }}</div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div class="actions">
        <el-button
          type="primary"
          :loading="saving"
          :icon="Check"
          @click="saveSettings"
        >
          保存所有配置
        </el-button>
        <el-button @click="resetForm">重置未保存修改</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Download, Upload, UploadFilled, Check } from '@element-plus/icons-vue'
import { setting, upload } from '@/api'

interface FieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'image' | 'boolean'
  placeholder?: string
  description?: string
  required?: boolean
}

interface GroupConfig {
  key: string
  label: string
  fields: FieldConfig[]
}

// 配置分组 Schema（前端声明式驱动，与后端 setting 表 key 一一对应）
const groups: GroupConfig[] = [
  {
    key: 'basic',
    label: '基本设置',
    fields: [
      {
        key: 'site_name',
        label: '网站名称',
        type: 'text',
        placeholder: '请输入网站名称',
        required: true,
      },
      {
        key: 'site_description',
        label: '网站描述',
        type: 'textarea',
        placeholder: '一句话介绍你的博客',
      },
      {
        key: 'site_icp',
        label: 'ICP 备案号',
        type: 'text',
        placeholder: '如：京ICP备XXXXXXXX号',
        description: '显示在页脚，为空则不显示。',
      },
    ],
  },
  {
    key: 'appearance',
    label: '外观与品牌',
    fields: [
      {
        key: 'site_logo',
        label: '网站 Logo',
        type: 'image',
        description: '用于页头与 Open Graph 分享卡片。',
      },
      {
        key: 'site_favicon',
        label: 'Favicon',
        type: 'image',
        description: '浏览器标签页图标，建议 32x32。',
      },
      {
        key: 'site_bg_light',
        label: '亮色背景图',
        type: 'image',
        description: '亮色模式下博客背景图片。',
      },
      {
        key: 'site_bg_dark',
        label: '暗色背景图',
        type: 'image',
        description: '暗色模式下博客背景图片。',
      },
    ],
  },
  {
    key: 'social',
    label: '社交与友链',
    fields: [
      {
        key: 'friend_links',
        label: '友情链接',
        type: 'textarea',
        placeholder: '[{"name":"站点名称","url":"https://..."}]',
        description: 'JSON 数组格式：{"name":"名称","url":"链接"}，保存在首页侧边栏展示。',
      },
    ],
  },
]

const activeTab = ref('basic')
const saving = ref(false)
const formRef = ref<FormInstance>()
const settings = ref<Record<string, any>>({})
const formData = reactive<Record<string, any>>({})
const uploadRefs = ref<Record<string, any>>({})

const allFields = computed(() => groups.flatMap((group) => group.fields))

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {}
  allFields.value.forEach((field) => {
    if (field.required) {
      rules[field.key] = [{ required: true, message: `请填写${field.label}`, trigger: 'blur' }]
    }
    if (field.key === 'friend_links') {
      rules[field.key] = [
        {
          validator: (_rule, value: string, callback) => {
            if (!value) {
              callback()
              return
            }
            try {
              const parsed = JSON.parse(value)
              if (!Array.isArray(parsed)) {
                callback(new Error('必须为 JSON 数组'))
                return
              }
              callback()
            } catch {
              callback(new Error('JSON 格式不正确'))
            }
          },
          trigger: 'blur',
        },
      ]
    }
  })
  return rules
})

const setUploadRef = (key: string, el: any) => {
  if (el) {
    uploadRefs.value[key] = el
  }
}

const fetchSettings = async () => {
  try {
    const response = await setting.getList()
    if (response.code === 200 || response.code === 201) {
      settings.value = response.data
      Object.keys(settings.value).forEach((key) => {
        formData[key] = settings.value[key].value
      })
    }
  } catch (error) {
    ElMessage.error('获取配置失败')
  }
}

const handleImageChange = async (key: string, file: any) => {
  try {
    const response = await upload.image(file.raw, 'setting-image', { settingKey: key })
    if (response.code === 200 || response.code === 201) {
      formData[key] = response.data.url
      ElMessage.success('图片上传成功')
    }
  } catch (error) {
    ElMessage.error('图片上传失败')
  }
}

const removeImage = (key: string) => {
  formData[key] = ''
}

const saveSettings = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请先修正表单中的错误项')
    return
  }

  saving.value = true
  try {
    const formDataObj = new FormData()

    // 仅提交当前 schema 中的字段，避免误提交未知键
    allFields.value.forEach((field) => {
      const config = settings.value[field.key]
      const value = formData[field.key] ?? ''
      if (config?.type === 'image') {
        formDataObj.append(field.key, value)
      } else {
        formDataObj.append(`settings[${field.key}]`, value)
      }
    })

    const response = await setting.update(formDataObj)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('保存成功，配置已生效')
      fetchSettings()
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  Object.keys(settings.value).forEach((key) => {
    formData[key] = settings.value[key].value
  })
  formRef.value?.clearValidate()
  ElMessage.info('已恢复为已保存的配置')
}

// 导出 JSON
const exportJson = () => {
  const payload: Record<string, { value: string; type: string; description: string }> = {}
  allFields.value.forEach((field) => {
    const config = settings.value[field.key]
    if (config) {
      payload[field.key] = {
        value: formData[field.key] ?? '',
        type: config.type,
        description: config.description || field.label,
      }
    }
  })

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `myblog-settings-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('配置已导出')
}

// 导入 JSON
const handleImportFile = async (file: any) => {
  const raw = file.raw as File
  try {
    const text = await raw.text()
    const parsed = JSON.parse(text)

    // 校验结构：对象，且值含 value/type
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      ElMessage.error('导入失败：JSON 结构不正确')
      return
    }

    const knownKeys = new Set(allFields.value.map((f) => f.key))
    const validEntries = Object.entries(parsed).filter(
      ([key, val]: [string, any]) => knownKeys.has(key) && val && typeof val.value === 'string',
    )

    if (!validEntries.length) {
      ElMessage.error('导入失败：未找到有效的配置项')
      return
    }

    await ElMessageBox.confirm(
      `即将导入 ${validEntries.length} 项配置，覆盖当前值。是否继续？`,
      '确认导入',
      { type: 'warning', confirmButtonText: '导入', cancelButtonText: '取消' },
    )

    validEntries.forEach(([key, val]: [string, any]) => {
      formData[key] = val.value
    })
    ElMessage.success('已导入，请点击"保存所有配置"使其生效')
  } catch (error: any) {
    ElMessage.error(error?.message?.includes('JSON') ? '导入失败：JSON 格式不正确' : '导入失败')
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<style lang="scss" scoped>
.settings {
  .panel-card {
    border-radius: 12px;
    border: 1px solid var(--border-light);
    box-shadow: var(--shadow-card);

    :deep(.el-card__header) {
      border-bottom: 1px solid var(--border-light);
      padding: 16px 20px;
    }
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;

  h3 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
  }
}

.page-desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.settings-tabs {
  :deep(.el-tabs__item) {
    color: var(--text-secondary);
  }

  :deep(.el-tabs__item.is-active) {
    color: var(--color-accent);
  }

  :deep(.el-tabs__active-bar) {
    background-color: var(--color-accent);
  }
}

.settings-form {
  max-width: 640px;
  padding: 8px 0;
}

.field-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-top: 4px;
  width: 100%;
}

.image-field {
  width: 100%;
}

.image-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-img {
  width: 160px;
  height: 96px;
  border-radius: 8px;
  border: 1px solid var(--border-light);
}

.image-actions {
  display: flex;
  gap: 6px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
  padding: 20px 0;
}

.actions {
  margin-top: 8px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 12px;
}
</style>