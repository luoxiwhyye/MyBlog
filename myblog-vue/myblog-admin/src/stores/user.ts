import { defineStore } from 'pinia'
import { blogger } from '@/api'
import { ElMessage } from 'element-plus'
import router from '@/router'

interface UserInfo {
  id: number
  username: string
  email: string
  avatar: string
  bio: string
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    userInfo: (() => {
      const stored = localStorage.getItem('userInfo')
      if (stored) {
        try {
          return JSON.parse(stored) as UserInfo
        } catch (error) {
          localStorage.removeItem('userInfo')
          return null
        }
      }
      return null
    })(),
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
  },

  actions: {
    async login(userData: { username: string; password: string }) {
      try {
        const response = await blogger.login(userData)
        if (response.code === 200) {
          this.token = response.data.token
          this.userInfo = response.data.blogger
          localStorage.setItem('token', this.token!)
          localStorage.setItem('userInfo', JSON.stringify(this.userInfo))
          ElMessage.success('登录成功')
          return true
        } else {
          ElMessage.error(response.message || '登录失败')
          return false
        }
      } catch (error) {
        ElMessage.error('登录失败')
        return false
      }
    },

    logout() {
      this.token = null
      this.userInfo = null
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      router.push('/login')
    },

    async fetchUserInfo() {
      if (!this.token) {
        return false
      }

      try {
        const response = await blogger.getProfile()
        if (response.code === 200) {
          this.userInfo = response.data
          localStorage.setItem('userInfo', JSON.stringify(this.userInfo))
          return true
        }

        // 非 200 的情况可以考虑 token 异常
        if (response.code === 401 || response.code === 403) {
          this.logout()
          return false
        }

        return false
      } catch (error: any) {
        const status = error?.response?.status
        if (status === 401 || status === 403) {
          this.logout()
          return false
        }

        // 网络或暂时性服务器错误，暂不强制登出
        console.warn('fetchUserInfo error', error)
        return false
      }
    },
  },
})
