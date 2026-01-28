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
        <span class="side-nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M3 12h18M12 3c3.5 4 3.5 14 0 18M12 3c-3.5 4-3.5 14 0 18" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        </span>
        <span class="side-nav-text">Procurement Charting</span>
      </RouterLink>
      <RouterLink class="side-nav-item" to="/sources" exact-active-class="is-active">
        <span class="side-nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
            <path d="M8 9h8M8 13h6" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        </span>
        <span class="side-nav-text">Data Sources</span>
      </RouterLink>
      <RouterLink class="side-nav-item" to="/builder" exact-active-class="is-active">
        <span class="side-nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 5h14v14H5z" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M8 9h8M8 12h5M8 15h6" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        </span>
        <span class="side-nav-text">Chart Builder</span>
      </RouterLink>
      <RouterLink class="side-nav-item" to="/dashboards" exact-active-class="is-active">
        <span class="side-nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        </span>
        <span class="side-nav-text">Dashboards</span>
      </RouterLink>
      <RouterLink class="side-nav-item" to="/templates" exact-active-class="is-active">
        <span class="side-nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M6 4h9l3 3v13H6z" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M9 10h6M9 13h6M9 16h4" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        </span>
        <span class="side-nav-text">Templates</span>
      </RouterLink>
      <RouterLink class="side-nav-item" to="/admin" exact-active-class="is-active">
        <span class="side-nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M4 20c1.5-3.5 6-5 8-5s6.5 1.5 8 5" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        </span>
        <span class="side-nav-text">Admin</span>
      </RouterLink>
      <RouterLink class="side-nav-item" to="/dfg" exact-active-class="is-active">
        <span class="side-nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M4 19h16M6 17V9M12 17V5M18 17v-6" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        </span>
        <span class="side-nav-text">DFG</span>
      </RouterLink>
      <RouterLink class="side-nav-item" to="/process-time" exact-active-class="is-active">
        <span class="side-nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="13" r="7" fill="none" stroke="currentColor" stroke-width="2" />
            <path d="M12 13l3-2M9 4h6M12 4V2" fill="none" stroke="currentColor" stroke-width="2" />
          </svg>
        </span>
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
