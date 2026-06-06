<template>
  <div class="settings">
    <el-card>
      <template #header>
        <h3>网站配置</h3>
      </template>

      <el-table
        :data="settingRows"
        stripe
        style="width: 100%"
      >
        <el-table-column label="配置键名" prop="key" width="200" />
        <el-table-column label="配置值" min-width="280">
          <template #default="scope">
            <!-- 文本类型 -->
            <el-input
              v-if="scope.row.type === 'text'"
              v-model="formData[scope.row.key]"
              :placeholder="`请输入${scope.row.description || scope.row.key}`"
              clearable
            />

            <!-- 图片类型 -->
            <div v-else-if="scope.row.type === 'image'" class="image-cell">
              <div v-if="formData[scope.row.key]" class="image-preview">
                <el-image
                  :src="formData[scope.row.key]"
                  style="width: 160px; height: 96px; object-fit: cover;"
                />
                <div class="image-actions">
                  <el-upload
                    :ref="(el: any) => setUploadRef(scope.row.key, el)"
                    :action="''"
                    :auto-upload="false"
                    :show-file-list="false"
                    :on-change="(file: any) => handleImageChange(scope.row.key, file)"
                    accept="image/*"
                  >
                    <el-button type="primary" size="small">更换</el-button>
                  </el-upload>
                  <el-button type="danger" size="small" @click="removeImage(scope.row.key)">清除</el-button>
                </div>
              </div>
              <el-upload
                v-else
                :ref="(el: any) => setUploadRef(scope.row.key, el)"
                :action="''"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="(file: any) => handleImageChange(scope.row.key, file)"
                accept="image/*"
              >
                <el-button type="primary">上传图片</el-button>
              </el-upload>
            </div>

            <!-- 其他类型 -->
            <span v-else>{{ formData[scope.row.key] }}</span>
          </template>
        </el-table-column>
        <el-table-column label="说明" prop="description" min-width="180" show-overflow-tooltip />
      </el-table>

      <div class="actions">
        <el-button
          type="primary"
          :loading="saving"
          @click="saveSettings"
        >
          保存所有配置
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { setting, upload } from '@/api'

const saving = ref(false)
const settings = ref<Record<string, any>>({})
const formData = reactive<Record<string, any>>({})
const uploadRefs = ref<Record<string, any>>({})

// 将 settings 字典转为表格行数组
const settingRows = computed(() =>
  Object.entries(settings.value).map(([key, config]) => ({
    key,
    type: config.type || 'text',
    description: config.description || key,
  })),
)

// 设置上传引用
const setUploadRef = (key: string, el: any) => {
  if (el) {
    uploadRefs.value[key] = el
  }
}

// 获取配置列表
const fetchSettings = async () => {
  try {
    const response = await setting.getList()
    if (response.code === 200 || response.code === 201) {
      settings.value = response.data
      // 初始化表单数据
      Object.keys(settings.value).forEach(key => {
        formData[key] = settings.value[key].value
      })
    }
  } catch (error) {
    ElMessage.error('获取配置失败')
  }
}

// 处理图片上传
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

// 删除图片
const removeImage = (key: string) => {
  formData[key] = ''
}

// 保存配置
const saveSettings = async () => {
  saving.value = true
  try {
    const formDataObj = new FormData()

    // 处理文本配置
    Object.keys(settings.value).forEach(key => {
      const config = settings.value[key]
      if (config.type === 'text') {
        formDataObj.append(`settings[${key}]`, formData[key] || '')
      } else if (config.type === 'image') {
        formDataObj.append(key, formData[key] || '')
      }
    })

    const response = await setting.update(formDataObj)
    if (response.code === 200 || response.code === 201) {
      ElMessage.success('保存成功')
      fetchSettings() // 重新获取配置
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchSettings()
})
</script>

<style scoped>
.settings {
  padding: 20px;
}

.image-cell {
  display: flex;
  align-items: center;
}

.image-preview {
  display: flex;
  align-items: center;
  gap: 10px;
}

.image-actions {
  display: flex;
  gap: 5px;
}

.actions {
  margin-top: 20px;
  text-align: center;
}
</style>