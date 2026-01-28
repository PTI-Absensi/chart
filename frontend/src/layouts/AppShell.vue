<template>
  <div class="app-shell">
    <SideNav
      v-if="showNav"
      :collapsed="isCollapsed"
      :theme="theme"
      @toggle="toggleNav"
      @theme="toggleTheme"
    />
    <div class="page">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import SideNav from '../components/SideNav.vue'

type Theme = 'light' | 'dark'

const isCollapsed = ref(false)
const theme = ref<Theme>('light')
const route = useRoute()
const showNav = computed(() => route.path !== '/login')

const applyTheme = (value: Theme, persist = true) => {
  document.body.dataset.theme = value
  theme.value = value
  if (persist) {
    localStorage.setItem('theme', value)
  }
}

const toggleTheme = () => {
  const next: Theme = theme.value === 'dark' ? 'light' : 'dark'
  applyTheme(next)
}

const toggleNav = () => {
  isCollapsed.value = !isCollapsed.value
}

onMounted(() => {
  const saved = localStorage.getItem('theme') as Theme | null
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(saved ?? (prefersDark ? 'dark' : 'light'), false)
})
</script>
