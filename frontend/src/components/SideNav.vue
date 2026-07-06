<template>
  <aside class="side-nav">
    <!-- Theme toggle at top -->
    <button class="sn-theme-btn" type="button" title="Toggle theme" @click="$emit('theme')">
      <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="18" height="18">
        <path d="M12 3a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm0 14a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1zm9-5a1 1 0 0 1-1 1h-2a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1zM6 12a1 1 0 0 1-1 1H3a1 1 0 1 1 0-2h2a1 1 0 0 1 1 1zm11.66-5.66a1 1 0 0 1 0 1.41l-1.42 1.42a1 1 0 0 1-1.41-1.42l1.41-1.41a1 1 0 0 1 1.42 0zm-9.9 9.9a1 1 0 0 1 0 1.41l-1.42 1.42a1 1 0 1 1-1.41-1.42l1.41-1.41a1 1 0 0 1 1.42 0zm9.9 1.41a1 1 0 0 1-1.42 0l-1.41-1.41a1 1 0 0 1 1.41-1.42l1.42 1.42a1 1 0 0 1 0 1.41zM7.76 7.76a1 1 0 0 1-1.42 0L4.93 6.34a1 1 0 1 1 1.41-1.41l1.42 1.42a1 1 0 0 1 0 1.41zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" fill="currentColor"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" width="18" height="18">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <!-- Icon-only nav links in pill container -->
    <nav class="sn-links">
      <RouterLink class="sn-link" to="/" exact-active-class="is-active" title="Charting">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M12 3c3.5 4 3.5 14 0 18M12 3c-3.5 4-3.5 14 0 18" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      </RouterLink>
      <RouterLink class="sn-link" to="/sources" exact-active-class="is-active" title="Data Sources">
        <svg viewBox="0 0 24 24"><path d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 9h8M8 13h6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      </RouterLink>
      <RouterLink class="sn-link" to="/builder" exact-active-class="is-active" title="Chart Builder">
        <svg viewBox="0 0 24 24"><path d="M4 19h16M6 17V9M12 17V5M18 17v-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </RouterLink>
      <RouterLink class="sn-link" to="/dashboards" exact-active-class="is-active" title="Dashboards">
        <svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      </RouterLink>
      <RouterLink class="sn-link" to="/dashboard-report" exact-active-class="is-active" title="Laporan">
        <svg viewBox="0 0 24 24"><path d="M3 5h18v16H3z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 10h8M8 14h6M8 18h4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      </RouterLink>
      <RouterLink class="sn-link" to="/templates" exact-active-class="is-active" title="Templates">
        <svg viewBox="0 0 24 24"><path d="M6 4h9l3 3v13H6z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 10h6M9 13h6M9 16h4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      </RouterLink>
      <RouterLink class="sn-link" to="/admin" exact-active-class="is-active" title="Admin">
        <svg viewBox="0 0 24 24"><path d="M12 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M4 20c1.5-3.5 6-5 8-5s6.5 1.5 8 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      </RouterLink>

      <!-- Divider -->
      <div class="sn-divider"></div>

      <RouterLink class="sn-link" to="/research" exact-active-class="is-active" title="Research">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3h18v4H3zM3 9h8v12H3zM13 9h8v5h-8zM13 16h8v5h-8z"/></svg>
      </RouterLink>
      <RouterLink class="sn-link" to="/dfg" exact-active-class="is-active" title="DFG">
        <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </RouterLink>
      <RouterLink class="sn-link" to="/process-time" exact-active-class="is-active" title="Process Time">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 13l3-2M9 4h6M12 4V2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
      </RouterLink>
    </nav>

    <!-- Bottom: settings + avatar -->
    <div class="sn-bottom">
      <button class="sn-link" type="button" title="Settings">
        <svg viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>
      </button>
      <button class="sn-link" type="button" title="Help">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="17" r="0.5" fill="currentColor"/></svg>
      </button>
      <div class="sn-divider"></div>
      <button class="sn-link sn-logout" type="button" title="Logout">
        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke="currentColor" stroke-width="1.8"/><polyline points="16 17 21 12 16 7" fill="none" stroke="currentColor" stroke-width="1.8"/><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" stroke-width="1.8"/></svg>
      </button>
      <!-- Avatar -->
      <div class="sn-avatar">
        <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 20c1.5-3.5 6-5 8-5s6.5 1.5 8 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
      </div>
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
