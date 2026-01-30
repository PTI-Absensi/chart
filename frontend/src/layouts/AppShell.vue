<template>
  <div class="app-shell">
    <!-- SideNav only shows for non-charting pages -->
    <SideNav 
      v-if="!isChartingPage" 
      :collapsed="navCollapsed" 
      :theme="theme"
      @toggle="navCollapsed = !navCollapsed"
      @theme="toggleTheme"
    />
    <div class="page" :class="{ 'page-fullwidth': isChartingPage }">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import SideNav from '../components/SideNav.vue'

type Theme = 'light' | 'dark'

const route = useRoute()
const theme = ref<Theme>('dark')
const navCollapsed = ref(false)

// Check if current route is the charting page
const isChartingPage = computed(() => route.path === '/')

const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.body.dataset.theme = theme.value
  localStorage.setItem('theme', theme.value)
}

const applyTheme = (value: Theme, persist = true) => {
  document.body.dataset.theme = value
  theme.value = value
  if (persist) {
    localStorage.setItem('theme', value)
  }
}

onMounted(() => {
  const saved = localStorage.getItem('theme') as Theme | null
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(saved ?? (prefersDark ? 'dark' : 'light'), false)
})
</script>

<style scoped>
.page-fullwidth {
  padding: 0 !important;
}
</style>
