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
            :ref="(el: any) => setFormRef(group.key, el)"
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

        <el-tab-pane label="自定义配置" name="custom">
          <div class="custom-config">
            <div class="custom-toolbar">
              <el-button type="primary" :icon="Plus" @click="openAddCustom">添加配置</el-button>
              <el-button :icon="Refresh" @click="fetchSettings">刷新</el-button>
              <el-button
                :icon="Check"
                :loading="savingCustomBatch"
                :disabled="!customConfigs.length"
                @click="saveCustomBatch"
              >
                保存自定义配置列表
              </el-button>
            </div>

            <el-alert
              v-if="customConfigs.length"
              type="info"
              :closable="false"
              show-icon
              class="custom-tip"
              title="自定义配置为 Key-Value 形式，保存后前台 settings store 会自动合并读取；删除请使用列表中“删除”按钮。"
            />

            <el-table v-if="customConfigs.length" :data="customConfigs" class="custom-table">
              <el-table-column prop="key" label="配置键" min-width="180" />
              <el-table-column prop="type" label="类型" width="110" />
              <el-table-column prop="value" label="配置值" min-width="220" show-overflow-tooltip />
              <el-table-column prop="description" label="备注描述" min-width="200" show-overflow-tooltip />
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" :icon="Edit" @click="openEditCustom(row)">编辑</el-button>
                  <el-button link type="danger" :icon="Delete" @click="handleCustomDelete(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-empty v-else description="暂无自定义配置，点击“添加配置”新增一个 Key-Value 配置项。" />
          </div>
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

    <el-dialog
      v-model="customDialogVisible"
      :title="customEditingKey ? '编辑配置' : '添加配置'"
      width="560px"
      @closed="resetCustomForm"
    >
      <el-form
        ref="customFormRef"
        :model="customForm"
        :rules="customRules"
        label-width="90px"
      >
        <el-form-item label="配置键" prop="key">
          <el-input
            v-model="customForm.key"
            :disabled="!!customEditingKey"
            placeholder="如 notice / custom_nav"
          />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="customForm.type" placeholder="选择类型">
            <el-option label="文本" value="text" />
            <el-option label="富文本 HTML" value="html" />
            <el-option label="布尔" value="boolean" />
            <el-option label="图片(URL)" value="image" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置值" prop="value">
          <el-switch
            v-if="customForm.type === 'boolean'"
            v-model="customForm.value"
            active-value="true"
            inactive-value="false"
          />
          <el-input
            v-else-if="customForm.type === 'html'"
            v-model="customForm.value"
            type="textarea"
            :rows="4"
            placeholder="请输入内容"
          />
          <el-input
            v-else
            v-model="customForm.value"
            :type="customForm.type === 'text' ? 'textarea' : 'text'"
            :rows="customForm.type === 'text' ? 3 : 1"
            placeholder="请输入配置值"
          />
        </el-form-item>
        <el-form-item label="备注描述" prop="description">
          <el-input
            v-model="customForm.description"
            placeholder="可选，说明该配置的用途"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="customDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingCustom" @click="saveCustomConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Download, Upload, UploadFilled, Check, Plus, Edit, Delete, Refresh } from '@element-plus/icons-vue'
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
    key: 'home',
    label: '首页内容',
    fields: [
      {
        key: 'announcement',
        label: '首页公告',
        type: 'textarea',
        placeholder: '请输入公告内容',
        description: '显示在首页顶部的公告栏，为空则不显示。',
      },
      {
        key: 'social_links',
        label: '社交链接',
        type: 'textarea',
        placeholder: '[{"name":"GitHub","url":"https://github.com/"}]',
        description: '首页展示的社交链接，JSON 数组格式：[{"name":"名称","url":"链接"}]，推荐 3 个以内。',
      },
    ],
  },
]

const activeTab = ref('basic')
const saving = ref(false)
const formRefs = ref<Record<string, FormInstance>>({})
const setFormRef = (key: string, el: any) => {
  if (el) formRefs.value[key] = el
}
const settings = ref<Record<string, any>>({})
const formData = reactive<Record<string, any>>({})
const uploadRefs = ref<Record<string, any>>({})

const allFields = computed(() => groups.flatMap((group) => group.fields))

// ===== 自定义配置（Key-Value）管理 =====
const customDialogVisible = ref(false)
const customEditingKey = ref('')
const customFormRef = ref<FormInstance>()
const customForm = reactive({ key: '', value: '', type: 'text', description: '' })
const savingCustom = ref(false)
const savingCustomBatch = ref(false)

// 预设 schema 之外的键即为自定义配置
const customConfigs = computed(() => {
  const presetSet = new Set(allFields.value.map((f) => f.key))
  return Object.entries(settings.value)
    .filter(([key]) => !presetSet.has(key))
    .map(([key, item]) => ({
      key,
      value: item.value,
      type: item.type,
      description: item.description || '',
    }))
})

const customRules = computed<FormRules>(() => {
  const rules: FormRules = {}
  if (!customEditingKey.value) {
    rules.key = [
      { required: true, message: '请输入配置键', trigger: 'blur' },
      {
        validator: (_rule, value: string, callback) => {
          if (!value) {
            callback()
            return
          }
          if (!/^[\p{L}\p{N}_.-]{1,100}$/u.test(value)) {
            callback(new Error('配置键只能包含字母、数字、下划线、点、连字符'))
            return
          }
          if (allFields.value.some((f) => f.key === value)) {
            callback(new Error('该配置键已被预设字段占用'))
            return
          }
          if (customConfigs.value.some((c) => c.key === value)) {
            callback(new Error('该配置键已存在'))
            return
          }
          callback()
        },
        trigger: 'blur',
      },
    ]
  }
  return rules
})

const openAddCustom = () => {
  customEditingKey.value = ''
  resetCustomForm()
  customDialogVisible.value = true
}

const openEditCustom = (row: any) => {
  customEditingKey.value = row.key
  customForm.key = row.key
  customForm.value = row.value
  customForm.type = row.type
  customForm.description = row.description
  customDialogVisible.value = true
}

const resetCustomForm = () => {
  customEditingKey.value = ''
  customForm.key = ''
  customForm.value = ''
  customForm.type = 'text'
  customForm.description = ''
  customFormRef.value?.clearValidate()
}

const saveCustomConfig = async () => {
  try {
    await customFormRef.value?.validate()
  } catch {
    return
  }

  savingCustom.value = true
  try {
    if (customEditingKey.value) {
      await setting.updateByKey(customEditingKey.value, {
        value: customForm.value,
        type: customForm.type,
        description: customForm.description,
      })
      ElMessage.success('配置已更新')
    } else {
      await setting.create({
        key: customForm.key,
        value: customForm.value,
        type: customForm.type,
        description: customForm.description,
      })
      ElMessage.success('配置已添加')
    }
    customDialogVisible.value = false
    await fetchSettings()
  } finally {
    savingCustom.value = false
  }
}

const saveCustomBatch = async () => {
  savingCustomBatch.value = true
  try {
    const payload: Record<string, { value: string; type: string; description: string }> = {}
    customConfigs.value.forEach((c) => {
      payload[c.key] = { value: c.value, type: c.type, description: c.description }
    })
    await setting.updateBatch(payload)
    ElMessage.success('自定义配置列表已保存')
    await fetchSettings()
  } finally {
    savingCustomBatch.value = false
  }
}

const handleCustomDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定删除配置 “${row.key}” 吗？`, '确认删除', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  try {
    await setting.remove(row.key)
    ElMessage.success('配置已删除')
    await fetchSettings()
  } catch {
    /* 拦截器已提示 */
  }
}

const formRules = computed<FormRules>(() => {
  const rules: FormRules = {}
  allFields.value.forEach((field) => {
    if (field.required) {
      rules[field.key] = [{ required: true, message: `请填写${field.label}`, trigger: 'blur' }]
    }
    if (field.key === 'social_links') {
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
  // 每个 tab 是独立 el-form，需逐组校验；首个出错项自动切换到对应 tab 并聚焦
  for (const group of groups) {
    const form = formRefs.value[group.key]
    if (!form) continue
    try {
      await form.validate()
    } catch (invalidFields: any) {
      const firstKey = Object.keys(invalidFields || {})[0]
      const firstField = allFields.value.find((f) => f.key === firstKey)
      if (firstKey && firstField) {
        activeTab.value = group.key
        nextTick(() => form.scrollToField(firstKey))
        ElMessage.warning(invalidFields[firstKey]?.[0]?.message || '请先修正表单中的错误项')
      } else {
        ElMessage.warning('请先修正表单中的错误项')
      }
      return
    }
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
  Object.values(formRefs.value).forEach((form) => form?.clearValidate())
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

/* 常驻保存栏：滚动时始终吸附在视口底部，避免配置项多时找不到保存入口 */
.actions {
  position: sticky;
  bottom: 0;
  z-index: 10;
  margin: 16px -20px -8px;
  padding: 16px 20px 8px;
  border-top: 1px solid var(--border-light);
  display: flex;
  gap: 12px;
  background: var(--bg-card);
}

.custom-config {
  padding: 8px 0;
}

.custom-toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.custom-tip {
  margin-bottom: 16px;
}

.custom-table {
  width: 100%;
}
</style>