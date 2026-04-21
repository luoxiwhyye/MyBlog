<template>
  <div class="settings">
    <el-card>
      <template #header>
        <h3>网站配置</h3>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        label-width="150px"
      >
        <el-form-item
          v-for="(config, key) in settings"
          :key="key"
          :label="config.description || key"
        >
          <!-- 文本类型 -->
          <el-input
            v-if="config.type === 'text'"
            v-model="formData[key]"
            :placeholder="`请输入${config.description || key}`"
          />

          <!-- 图片类型 -->
          <div v-else-if="config.type === 'image'">
            <el-upload
              :ref="(el: any) => setUploadRef(key, el)"
              :action="''"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="(file: any) => handleImageChange(key, file)"
              accept="image/*"
            >
              <div v-if="formData[key]" class="image-preview">
                <el-image
                  :src="formData[key]"
                  style="width: 200px; height: 120px; object-fit: cover;"
                />
                <div class="image-actions">
                  <el-button type="primary" size="small">更换图片</el-button>
                  <el-button type="danger" size="small" @click.stop="removeImage(key)">删除</el-button>
                </div>
              </div>
              <el-button v-else type="primary">上传图片</el-button>
            </el-upload>
          </div>

          <!-- 其他类型可以扩展 -->
          <span v-else>{{ config.value }}</span>
        </el-form-item>
      </el-form>

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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { setting, upload } from '@/api'

const formRef = ref()
const saving = ref(false)
const settings = ref<Record<string, any>>({})
const formData = reactive<Record<string, any>>({})
const uploadRefs = ref<Record<string, any>>({})

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

.image-preview {
  position: relative;
  display: inline-block;
}

.image-actions {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  gap: 5px;
}

.actions {
  margin-top: 20px;
  text-align: center;
}
</style>