<template>
  <div class="login-container">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="login-header">
          <img v-if="siteLogo" :src="siteLogo" :alt="siteName" class="login-logo" />
          <div v-else class="login-logo-fallback">MB</div>
          <div>
            <div class="login-title">{{ siteName }}</div>
            <div class="login-subtitle">后台管理系统</div>
          </div>
        </div>
      </template>

      <!-- 初始化账号 / 登录 切换 -->
      <el-alert
        v-if="!accountExists"
        type="warning"
        :closable="false"
        show-icon
        class="init-tip"
        title="尚未初始化管理员账号，请先输入账号信息完成初始化"
      />

      <el-tabs v-model="activeTab" class="login-tabs">
        <!-- 初始化账号（仅当无账号时显示） -->
        <el-tab-pane
          v-if="!accountExists"
          label="初始化账号"
          name="init"
        >
          <el-form
            ref="initFormRef"
            :model="initForm"
            :rules="initRules"
            label-width="0px"
            class="login-form"
          >
            <el-form-item prop="username">
              <el-input
                v-model="initForm.username"
                placeholder="用户名（3-50 位）"
                size="large"
                :prefix-icon="User"
              />
            </el-form-item>
            <el-form-item prop="nickname">
              <el-input
                v-model="initForm.nickname"
                placeholder="昵称（可选）"
                size="large"
                :prefix-icon="User"
              />
            </el-form-item>
            <el-form-item prop="email">
              <el-input
                v-model="initForm.email"
                placeholder="邮箱（可选）"
                size="large"
                :prefix-icon="Message"
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="initForm.password"
                type="password"
                placeholder="密码（至少 6 位）"
                size="large"
                :prefix-icon="Lock"
              />
            </el-form-item>
            <el-form-item prop="confirmPassword">
              <el-input
                v-model="initForm.confirmPassword"
                type="password"
                placeholder="确认密码"
                size="large"
                :prefix-icon="Lock"
                @keyup.enter="handleInit"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                class="login-btn"
                :loading="initLoading"
                @click="handleInit"
              >
                初始化并创建管理员
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 登录 -->
        <el-tab-pane label="登录" name="login">
          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="rules"
            label-width="0px"
            class="login-form"
          >
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="用户名"
                size="large"
                :prefix-icon="User"
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="密码"
                size="large"
                :prefix-icon="Lock"
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <el-form-item>
              <el-checkbox v-model="rememberMe">记住我</el-checkbox>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                class="login-btn"
                :loading="loading"
                @click="handleLogin"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Message } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { blogger } from '@/api'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const loginFormRef = ref()
const initFormRef = ref()
const loading = ref(false)
const initLoading = ref(false)
const rememberMe = ref(false)
const activeTab = ref('login')
const accountExists = ref(true) // 默认假设已初始化，避免误闪初始化表单
const siteName = computed(() => settingsStore.getSetting('site_name') || 'MyBlog')
const siteLogo = computed(() => settingsStore.getSetting('site_logo'))

const loginForm = reactive({
  username: '',
  password: ''
})

const initForm = reactive({
  username: '',
  nickname: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const initRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度需为 3-50 位', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value !== initForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  email: [
    {
      validator: (_rule: any, value: string, callback: any) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          callback(new Error('邮箱格式不正确'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const fetchExists = async (silent = false) => {
  try {
    const response = await blogger.exists()
    if (response.code === 200) {
      accountExists.value = !!response.data?.exists
      // 无账号时默认切到初始化 Tab
      if (!accountExists.value) {
        activeTab.value = 'init'
      }
      return true
    }
  } catch (_) {
    // 接口失败时保持默认（视为已初始化，回退为登录）
  }
  if (!silent) {
    accountExists.value = true
  }
  return false
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      loading.value = true
      const success = await userStore.login(loginForm)
      loading.value = false

      if (success) {
        if (rememberMe.value) {
          localStorage.setItem('rememberedUsername', loginForm.username)
        } else {
          localStorage.removeItem('rememberedUsername')
        }

        // 获取重定向参数
        const redirect = route.query.redirect as string || '/admin/dashboard'
        router.push(redirect)
      }
    }
  })
}

const handleInit = async () => {
  if (!initFormRef.value) return

  await initFormRef.value.validate(async (valid: boolean) => {
    if (!valid) return
    initLoading.value = true
    try {
      const response = await blogger.init({
        username: initForm.username,
        password: initForm.password,
        nickname: initForm.nickname,
        email: initForm.email
      })
      if (response.code === 200) {
        ElMessage.success('管理员账号初始化成功，请登录')
        // 切回登录并预填用户名
        accountExists.value = true
        activeTab.value = 'login'
        loginForm.username = initForm.username
        await fetchExists(true)
      } else {
        ElMessage.error(response.message || '初始化失败')
      }
    } catch (error: any) {
      ElMessage.error(error?.response?.data?.message || '初始化失败')
    } finally {
      initLoading.value = false
    }
  })
}

onMounted(() => {
  if (!settingsStore.settings.site_name && !settingsStore.settings.site_logo) {
    settingsStore.fetchSettings()
  }

  // 如果有记住的用户名，从 localStorage 恢复
  const rememberedUsername = localStorage.getItem('rememberedUsername')
  if (rememberedUsername) {
    loginForm.username = rememberedUsername
    rememberMe.value = true
  }

  // 检测是否已初始化账号
  fetchExists()
})
</script>

<style lang="scss" scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
  padding: 20px;
}

.login-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.login-logo,
.login-logo-fallback {
  width: 48px;
  height: 48px;
  border-radius: 14px;
}

.login-logo {
  object-fit: cover;
  background: #fff;
}

.login-logo-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #18233E, #F8FAFC);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.login-title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.login-subtitle {
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.login-form {
  margin-top: 20px;
}

.login-btn {
  width: 100%;
}

.init-tip {
  margin-bottom: 8px;
}

.login-tabs {
  margin-top: 8px;

  :deep(.el-tabs__nav) {
    display: flex;
    justify-content: center;
    width: 100%;
  }
}
</style>