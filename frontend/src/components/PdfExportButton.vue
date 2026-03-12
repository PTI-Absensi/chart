<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  title?: string
  year?: number
  periodType?: string
  sumberDana?: string
  kategoriPlant?: string
  reportType?: 'dashboard' | 'chart'
}

const props = withDefaults(defineProps<Props>(), {
  title: 'Laporan Pengadaan SGN',
  year: 2025,
  periodType: 'calendar',
  sumberDana: '',
  kategoriPlant: '',
  reportType: 'dashboard'
})

const isGenerating = ref(false)
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

// Close dropdown when clicking outside
onMounted(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
      isOpen.value = false
    }
  }
  document.addEventListener('click', handleClickOutside)
  onUnmounted(() => document.removeEventListener('click', handleClickOutside))
})

async function generatePDF() {
  isGenerating.value = true
  isOpen.value = false
  
  try {
    const response = await fetch('/api/pdf/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: props.title,
        period: { year: props.year, type: props.periodType },
        filters: {
          sumberDana: props.sumberDana || undefined,
          kategoriPlant: props.kategoriPlant || undefined
        },
        reportType: props.reportType
      })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const blob = await response.blob()
    if (blob.type.includes('html') || blob.size < 100) {
      throw new Error('Invalid PDF')
    }
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Laporan_Pengadaan_${props.year}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

  } catch (error) {
    console.error('PDF error:', error)
    alert('Gagal export PDF: ' + (error as Error).message)
  } finally {
    isGenerating.value = false
  }
}

async function captureDashboard() {
  isGenerating.value = true
  isOpen.value = false
  
  try {
    const response = await fetch('/api/pdf/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: window.location.origin,
        filters: {
          year: props.year,
          periodType: props.periodType,
          sumberDana: props.sumberDana,
          kategoriPlant: props.kategoriPlant
        },
        title: 'Dashboard Procurement Report'
      })
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const blob = await response.blob()
    if (blob.type.includes('html') || blob.size < 100) {
      throw new Error('Invalid PDF')
    }
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Dashboard_Procurement_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

  } catch (error) {
    console.error('Capture error:', error)
    alert('Gagal capture: ' + (error as Error).message)
  } finally {
    isGenerating.value = false
  }
}
</script>

<template>
  <div class="export-dropdown" ref="dropdownRef">
    <button 
      class="export-btn"
      @click="isOpen = !isOpen"
      :disabled="isGenerating"
    >
      <span v-if="isGenerating" class="spinner"></span>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    </button>

    <div v-if="isOpen" class="dropdown-menu">
      <button class="dropdown-item" @click="generatePDF">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>Export Report PDF</span>
      </button>
      <button class="dropdown-item" @click="captureDashboard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span>Capture Dashboard</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.export-dropdown {
  position: relative;
  display: inline-flex;
}

.export-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  background: var(--surface-alt);
  border: 1px solid var(--stroke);
  color: var(--muted);
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover:not(:disabled) {
  background: var(--hover);
  color: var(--ink);
}

.export-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-btn svg {
  width: 14px;
  height: 14px;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 180px;
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 8px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--ink);
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  text-align: left;
  white-space: nowrap;
}

.dropdown-item:hover {
  background: var(--hover);
}

.dropdown-item svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.dropdown-item span {
  flex: 1;
}
</style>
