import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import routes from './router'
import './styles/app.css'
import { getToken } from './utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to) => {
  if (to.path === '/login' || to.path === '/dashboard/login') return true
  const token = getToken()
  if (!token) {
    return { path: '/login' }
  }
  return true
})

createApp(App).use(router).mount('#app')
