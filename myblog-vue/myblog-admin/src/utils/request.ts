import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  timeout: 10000,
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
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
      if (status === 401) {
        // 清除 token 并跳转到登录页
        localStorage.removeItem('token')
        const userStore = useUserStore()
        userStore.logout()
        // 这里可能需要使用 router，但为了避免循环依赖，可以在组件中处理
        // 或者使用 window.location.href = '/login'
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
