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
    <div class="page" :class="{ 'page-fullwidth': isFullWidth }">
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

// Only hide sidebar for the main charting page (has its own embedded tools)
const isChartingPage = computed(() => route.path === '/')
// Remove outer page gutter for pages that manage their own padding
const isFullWidth = computed(() => route.path === '/' || route.path === '/dashboard-report')

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
