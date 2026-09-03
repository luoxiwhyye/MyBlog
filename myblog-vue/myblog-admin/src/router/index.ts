import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    children: [
      {
        path: '',
        redirect: '/admin/dashboard',
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
      },
      {
        path: 'articles',
        name: 'ArticleList',
        component: () => import('@/views/article/ArticleList.vue'),
      },
      {
        path: 'articles/edit/:id?',
        name: 'ArticleEditor',
        component: () => import('@/views/article/ArticleEditor.vue'),
      },
      {
        path: 'types',
        name: 'TypeManage',
        component: () => import('@/views/TypeManage.vue'),
      },
      {
        path: 'labels',
        name: 'LabelManage',
        component: () => import('@/views/LabelManage.vue'),
      },
      {
        path: 'friend-links',
        name: 'FriendLinkManage',
        component: () => import('@/views/FriendLinkManage.vue'),
      },
      {
        path: 'comments',
        name: 'CommentManage',
        component: () => import('@/views/CommentManage.vue'),
      },
      {
        path: 'message-board',
        name: 'MessageBoardManage',
        component: () => import('@/views/MessageBoardManage.vue'),
      },
      {
        path: 'cache',
        name: 'CacheManage',
        component: () => import('@/views/CacheManage.vue'),
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings.vue'),
      },
    ],
  },
  {
    path: '/',
    redirect: '/admin/dashboard',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 全局前置守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  // 检查是否是需要登录的路由
  const requiresAuth = to.path.startsWith('/admin')

  if (requiresAuth) {
    if (userStore.token) {
      // 如果有 token 但没有 userInfo，获取用户信息
      if (!userStore.userInfo) {
        const gotInfo = await userStore.fetchUserInfo()
        if (!gotInfo) {
          next({
            path: '/login',
            query: { redirect: to.fullPath },
          })
          return
        }
      }
      next()
    } else {
      // 重定向到登录页，并携带 redirect 参数
      next({
        path: '/login',
        query: { redirect: to.fullPath },
      })
    }
  } else {
    // 如果已登录且访问登录页，重定向到 dashboard
    if (to.path === '/login' && userStore.token) {
      next('/admin/dashboard')
    } else {
      next()
    }
  }
})

export default router
