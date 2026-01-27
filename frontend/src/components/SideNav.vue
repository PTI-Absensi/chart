<template>
  <aside class="side-nav" :class="{ 'is-collapsed': collapsed }">
    <div class="side-nav-header">
      <button class="side-nav-toggle" type="button" title="Toggle" @click="$emit('toggle')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 6h14M5 12h14M5 18h14" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
      </button>
      <div class="side-nav-title">Project Management</div>
      <button class="theme-toggle" type="button" title="Toggle theme" @click="$emit('theme')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm0 14a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1zm9-5a1 1 0 0 1-1 1h-2a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1zM6 12a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1zm11.66-5.66a1 1 0 0 1 0 1.41l-1.42 1.42a1 1 0 0 1-1.41-1.42l1.41-1.41a1 1 0 0 1 1.42 0zm-9.9 9.9a1 1 0 0 1 0 1.41l-1.42 1.42a1 1 0 1 1-1.41-1.42l1.41-1.41a1 1 0 0 1 1.42 0zm9.9 1.41a1 1 0 0 1-1.42 0l-1.41-1.41a1 1 0 0 1 1.41-1.42l1.42 1.42a1 1 0 0 1 0 1.41zM7.76 7.76a1 1 0 0 1-1.42 0L4.93 6.34a1 1 0 1 1 1.41-1.41l1.42 1.42a1 1 0 0 1 0 1.41zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
            fill="currentColor"
          />
        </svg>
        <span>{{ theme === 'dark' ? 'Dark' : 'Light' }}</span>
      </button>
    </div>
    <div class="side-nav-section">
      <div class="side-nav-label">Apps</div>
      <RouterLink class="side-nav-item" to="/" exact-active-class="is-active">
        <span class="side-nav-icon">🌐</span>
        <span class="side-nav-text">Procurement Charting</span>
      </RouterLink>
      <RouterLink class="side-nav-item" to="/dfg" exact-active-class="is-active">
        <span class="side-nav-icon">📊</span>
        <span class="side-nav-text">DFG</span>
      </RouterLink>
      <RouterLink class="side-nav-item" to="/process-time" exact-active-class="is-active">
        <span class="side-nav-icon">⏱️</span>
        <span class="side-nav-text">Process Time</span>
      </RouterLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ collapsed: boolean; theme: 'light' | 'dark' }>()
defineEmits<{
  (e: 'toggle'): void
  (e: 'theme'): void
}>()
</script>
