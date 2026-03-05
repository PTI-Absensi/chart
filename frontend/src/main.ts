import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'
import App from './App.vue'
import routes from './router'
import './styles/app.css'
import './styles/dashboard-modern.css'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

createApp(App).use(router).use(VueApexCharts).mount('#app')
