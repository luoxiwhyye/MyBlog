<template>
  <div class="profile">
    <el-card>
      <template #header>
        <h3>个人资料</h3>
      </template>

      <el-tabs v-model="activeTab">
        <!-- 博主信息 -->
        <el-tab-pane label="基本信息" name="info">
          <el-form
            ref="infoFormRef"
            :model="infoForm"
            :rules="infoRules"
            label-width="80px"
          >
            <el-form-item label="头像">
              <el-upload
                ref="avatarUploadRef"
                :action="''"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="handleAvatarChange"
                accept="image/*"
              >
                <div v-if="infoForm.avatar" class="avatar-preview">
                  <el-image
                    :src="infoForm.avatar"
                    style="width: 100px; height: 100px; border-radius: 50%;"
                  />
                  <div class="avatar-actions">
                    <el-button type="primary" size="small">更换头像</el-button>
                  </div>
                </div>
                <el-button v-else type="primary">上传头像</el-button>
              </el-upload>
            </el-form-item>

            <el-form-item label="邮箱" prop="email">
              <el-input
                v-model="infoForm.email"
                placeholder="请输入邮箱"
              />
            </el-form-item>

            <el-form-item label="简介">
              <el-input
                v-model="infoForm.bio"
                type="textarea"
                :rows="4"
                placeholder="请输入个人简介"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :loading="updatingInfo"
                @click="updateProfile"
              >
                更新资料
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 修改密码 -->
        <el-tab-pane label="修改密码" name="password">
          <el-form
            ref="passwordFormRef"
            :model="passwordForm"
            :rules="passwordRules"
            label-width="100px"
          >
            <el-form-item label="旧密码" prop="oldPassword">
              <el-input
                v-model="passwordForm.oldPassword"
                type="password"
                placeholder="请输入旧密码"
              />
            </el-form-item>

            <el-form-item label="新密码" prop="newPassword">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                placeholder="请输入新密码"
              />
            </el-form-item>

            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                :loading="updatingPassword"
                @click="changePassword"
              >
                修改密码
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { blogger, upload } from '@/api'
import { useUserStore } from '@/stores/user'

const activeTab = ref('info')
const updatingInfo = ref(false)
const updatingPassword = ref(false)

const infoFormRef = ref()
const passwordFormRef = ref()
const avatarUploadRef = ref()

const infoForm = reactive({
  email: '',
  bio: '',
  avatar: ''
})

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const infoRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: any) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const userStore = useUserStore()

// 获取用户信息
const fetchUserInfo = async () => {
  if (userStore.userInfo) {
    const data = userStore.userInfo
    infoForm.email = data.email
    infoForm.bio = data.bio || ''
    infoForm.avatar = data.avatar || ''
    return
  }

  try {
    const response = await blogger.getProfile()
    if (response.code === 200) {
      const data = response.data
      infoForm.email = data.email
      infoForm.bio = data.bio || ''
      infoForm.avatar = data.avatar || ''
      userStore.userInfo = data
      localStorage.setItem('userInfo', JSON.stringify(data))
    } else if (response.code === 401 || response.code === 403) {
      ElMessage.warning('暂无权限访问用户信息，请重新登录')
    } else {
      ElMessage.error(response.message || '获取用户信息失败')
    }
  } catch (error: any) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      ElMessage.warning('权限不足或登录过期，请重新登录')
    } else {
      ElMessage.error('获取用户信息失败，请稍后重试')
    }
  }
}

// 处理头像上传
const handleAvatarChange = async (file: any) => {
  try {
    const response = await upload.image(file.raw, 'avatar')
    if (response.code === 200) {
      infoForm.avatar = response.data.url
      ElMessage.success('头像上传成功')
    }
  } catch (error) {
    ElMessage.error('头像上传失败')
  }
}

// 更新资料
const updateProfile = async () => {
  if (!infoFormRef.value) return

  await infoFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      updatingInfo.value = true
      try {
        const formData = new FormData()
        formData.append('email', infoForm.email)
        formData.append('bio', infoForm.bio)
        if (infoForm.avatar) {
          formData.append('avatarUrl', infoForm.avatar)
        }

        const response = await blogger.updateProfile(formData)
        if (response.code === 200) {
          ElMessage.success('更新成功')
          // 更新 store 中的用户信息
          userStore.userInfo = {
            ...userStore.userInfo!,
            email: infoForm.email,
            bio: infoForm.bio,
            avatar: infoForm.avatar
          }
          localStorage.setItem('userInfo', JSON.stringify(userStore.userInfo))
        } else {
          ElMessage.error(response.message || '更新失败')
        }
      } catch (error) {
        ElMessage.error('更新失败')
      } finally {
        updatingInfo.value = false
      }
    }
  })
}

// 修改密码
const changePassword = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      updatingPassword.value = true
      try {
        const response = await blogger.changePassword({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword
        })
        if (response.code === 200) {
          ElMessage.success('密码修改成功')
          passwordForm.oldPassword = ''
          passwordForm.newPassword = ''
          passwordForm.confirmPassword = ''
        } else {
          ElMessage.error(response.message || '密码修改失败')
        }
      } catch (error) {
        ElMessage.error('密码修改失败')
      } finally {
        updatingPassword.value = false
      }
    }
  })
}

onMounted(() => {
  fetchUserInfo()
})
</script>

<style scoped>
.profile {
  padding: 20px;
}

.avatar-preview {
  position: relative;
  display: inline-block;
}

.avatar-actions {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
}
</style>