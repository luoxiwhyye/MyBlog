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
    userInfo: null as UserInfo | null,
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
      if (!this.token) return
      try {
        const response = await blogger.getProfile()
        if (response.code === 200) {
          this.userInfo = response.data
          localStorage.setItem('userInfo', JSON.stringify(this.userInfo))
        }
      } catch (error) {
        // 如果获取失败，可能是 token 过期
        this.logout()
      }
    },
  },
})
