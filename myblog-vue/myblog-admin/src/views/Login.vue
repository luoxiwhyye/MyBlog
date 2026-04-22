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
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const settingsStore = useSettingsStore()

const loginFormRef = ref()
const loading = ref(false)
const rememberMe = ref(false)
const siteName = computed(() => settingsStore.getSetting('site_name') || 'MyBlog')
const siteLogo = computed(() => settingsStore.getSetting('site_logo'))

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
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
})
</script>

<style scoped>
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
  background: linear-gradient(135deg, #0f766e, #14b8a6);
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
</style>