import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

// 创建 axios 实例
// 开发环境 baseURL 为相对路径 /api/v1，由 vite.config.ts 代理到本机后端；
// 生产环境由 VITE_API_BASE 注入绝对地址（如 http://myblog-backend:3000/api/v1）。
const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'

const request: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    const token = userStore?.token || localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    // 直接返回 response.data，即 { code, message, data }
    return response.data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      const userStore = useUserStore()
      if (status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        if (userStore?.token) {
          userStore.logout()
        }
        ElMessage.error('登录已过期，请重新登录')
      } else if (status === 403) {
        ElMessage.error(data?.message || '权限不足')
      } else {
        ElMessage.error(data?.message || '请求失败')
      }
    } else {
      ElMessage.error('网络错误')
    }
    return Promise.reject(error)
  },
)

export default request
