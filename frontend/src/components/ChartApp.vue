<template>
  <!-- Compact TradingView-style Header -->
  <header class="tv-header">
    <div class="tv-header-left">
      <div class="tv-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 17L9 11L13 15L21 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M17 7H21V11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="tv-title">Procurement</span>
      </div>
      
      <!-- Symbol Search -->
      <div class="tv-symbol-search" @click="openSearchModal">
        <span class="tv-symbol-name">{{ selectedSymbols.length > 0 ? selectedSymbols[0] : 'Kode Data' }}</span>
        <span v-if="selectedSymbols.length > 1" class="tv-symbol-more">+{{ selectedSymbols.length - 1 }}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2"/></svg>
      </div>
    </div>
    
    <div class="tv-header-center">
      <!-- Period Type -->
      <div class="tv-btn-group">
        <button :class="['tv-btn', { active: periodType === 'calendar' }]" @click="periodType = 'calendar'">Kalender</button>
        <button :class="['tv-btn', { active: periodType === 'fiscal' }]" @click="periodType = 'fiscal'">Anggaran</button>
      </div>
      
      <!-- Year -->
      <select v-model="year" class="tv-select">
        <option :value="2024">2024</option>
        <option :value="2025">2025</option>
        <option :value="2026">2026</option>
      </select>
      
      <!-- Filters -->
      <select v-model="sumberDana" class="tv-select">
        <option value="">Semua Dana</option>
        <option value="eksploitasi">Eksploitasi</option>
        <option value="investasi">Investasi</option>
      </select>
      
      <select v-model="kategoriPlant" class="tv-select">
        <option value="">Semua Plant</option>
        <option value="PG">PG</option>
        <option value="MKSO">MKSO</option>
        <option value="HO">HO</option>
      </select>
      
      <!-- Max Series Limit -->
      <select v-model="maxSeries" class="tv-select" title="Maximum series to display">
        <option :value="3">Max 3</option>
        <option :value="5">Max 5</option>
        <option :value="10">Max 10</option>
      </select>
      
      <!-- Mode Buttons -->
      <button :class="['tv-btn', { active: rawMode }]" @click="rawMode = !rawMode" title="Raw data">Raw</button>
      <button :class="['tv-btn', { active: cumulative }]" @click="cumulative = !cumulative" title="Kumulatif">Σ</button>
      <button :class="['tv-btn', { active: singleScale }]" @click="singleScale = !singleScale" title="Single Y scale">1Y</button>
      
      <!-- Chart Type (tanpa candlestick) -->
      <div class="tv-btn-group">
        <button v-for="type in chartTypesFiltered" :key="type.value" :class="['tv-btn', { active: chartType === type.value }]" @click="chartType = type.value" :title="type.label">
          {{ type.label }}
        </button>
      </div>
    </div>
    
    <div class="tv-header-right">
      <button class="tv-btn icon" title="Zoom In" @click="chartRef?.zoomIn()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M11 8v6M8 11h6M20 20l-4-4" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="tv-btn icon" title="Zoom Out" @click="chartRef?.zoomOut()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M8 11h6M20 20l-4-4" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="tv-btn icon" title="Fit" @click="chartRef?.refresh()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="2"/></svg>
      </button>
      <button class="tv-btn icon" title="Export" @click="chartRef?.exportPng()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v12M8 7l4-4 4 4M5 14v6h14v-6" stroke="currentColor" stroke-width="2"/></svg>
      </button>
    </div>
  </header>

  <!-- Main Layout: Drawing Sidebar + Chart Area -->
  <main class="tv-main">
    <!-- Left Sidebar: Hamburger + Theme + Drawing Tools -->
    <aside class="tv-sidebar">
      <!-- Hamburger Menu Button -->
      <button class="tv-sidebar-btn" @click="navMenuOpen = !navMenuOpen" title="Navigation">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      
      <!-- Theme Toggle -->
      <button class="tv-sidebar-btn" @click="toggleTheme" :title="theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'">
        <svg v-if="theme === 'dark'" width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
          <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      
      <div class="tv-sidebar-divider"></div>
      
      <!-- Drawing Tools -->
      <button 
        v-for="tool in drawingTools" 
        :key="tool.id"
        class="tv-sidebar-btn" 
        :class="{ active: activeDrawingTool === tool.id }"
        :title="tool.label"
        @click="setDrawingTool(tool.id)"
      >
        <span v-html="tool.icon"></span>
      </button>
      
      <div class="tv-sidebar-divider"></div>
      
      <!-- Clear drawings -->
      <button class="tv-sidebar-btn danger" title="Clear drawings" @click="clearDrawings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M8 7V5h8v2M7 7l1 12h8l1-12" stroke="currentColor" stroke-width="2"/>
        </svg>
      </button>
      
      <!-- Navigation Popup -->
      <div v-if="navMenuOpen" class="tv-nav-popup">
        <div class="tv-nav-header">
          <span>Apps</span>
          <button @click="navMenuOpen = false">×</button>
        </div>
        <div class="tv-nav-items">
          <a class="tv-nav-item" href="/" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3.5 4 3.5 14 0 18M12 3c-3.5 4-3.5 14 0 18" stroke="currentColor" stroke-width="2"/></svg>
            <span>Procurement Charting</span>
          </a>
          <a class="tv-nav-item" href="/sources" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2"/><path d="M8 9h8M8 13h6" stroke="currentColor" stroke-width="2"/></svg>
            <span>Data Sources</span>
          </a>
          <a class="tv-nav-item" href="/builder" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 5h14v14H5z" stroke="currentColor" stroke-width="2"/><path d="M8 9h8M8 12h5M8 15h6" stroke="currentColor" stroke-width="2"/></svg>
            <span>Chart Builder</span>
          </a>
          <a class="tv-nav-item" href="/dashboards" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" stroke="currentColor" stroke-width="2"/></svg>
            <span>Dashboards</span>
          </a>
          <a class="tv-nav-item" href="/templates" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 4h9l3 3v13H6z" stroke="currentColor" stroke-width="2"/><path d="M9 10h6M9 13h6M9 16h4" stroke="currentColor" stroke-width="2"/></svg>
            <span>Templates</span>
          </a>
          <a class="tv-nav-item" href="/admin" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" stroke="currentColor" stroke-width="2"/><path d="M4 20c1.5-3.5 6-5 8-5s6.5 1.5 8 5" stroke="currentColor" stroke-width="2"/></svg>
            <span>Admin</span>
          </a>
          <a class="tv-nav-item" href="/dfg" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M6 17V9M12 17V5M18 17v-6" stroke="currentColor" stroke-width="2"/></svg>
            <span>DFG</span>
          </a>
          <a class="tv-nav-item" href="/process-time" target="_blank" @click="navMenuOpen = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13" r="7" stroke="currentColor" stroke-width="2"/><path d="M12 13l3-2M9 4h6M12 4V2" stroke="currentColor" stroke-width="2"/></svg>
            <span>Process Time</span>
          </a>
        </div>
      </div>
    </aside>
    
    <!-- Chart Area -->
    <div class="tv-chart-area">
      <!-- Chart Canvas with Drawing Overlay -->
      <div class="tv-chart-canvas">
        <ProcurementChart
          ref="chartRef"
          :chart-type="chartType"
          :period-type="periodType"
          :year="year"
          :symbols="selectedSymbols"
          :normalize="normalize"
          :log-scale="logScale"
          :raw-mode="rawMode"
          :cumulative="cumulative"
          :single-scale="singleScale"
          :sumber-dana="sumberDana"
          :kategori-plant="kategoriPlant"
          :theme="theme"
          :height="chartHeight"
          @data-loaded="onDataLoaded"
          @error="onChartError"
        />
        <!-- Drawing Layer Overlay (canvas only, no toolbar) -->
        <DrawingLayer 
          ref="drawingRef" 
          :height="chartHeight" 
          :show-toolbar="false"
          :active-tool="activeDrawingTool"
          class="tv-drawing-overlay"
          :class="{ 'is-drawing': activeDrawingTool !== 'select' }"
        />
      </div>
      
      <!-- Bottom-right floating buttons -->
      <div class="tv-float-btns">
        <button class="tv-float-btn" :class="{ active: logScale }" @click="logScale = !logScale" title="Log Scale">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 19h16M6 16c2-3 4-4 6-4s4 1 6 4" stroke="currentColor" stroke-width="2"/></svg>
        </button>
        <button class="tv-float-btn" :class="{ active: normalize }" @click="normalize = !normalize" title="Normalize">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 17h16M7 4v16" stroke="currentColor" stroke-width="2"/></svg>
        </button>
        <div class="tv-float-divider"></div>
        <!-- Object Tree Button -->
        <button class="tv-float-btn" :class="{ active: showObjectTree }" @click="showObjectTree = !showObjectTree" title="Object Tree">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 3h18v18H3z" stroke="currentColor" stroke-width="2"/>
            <path d="M7 12h10M7 8h6M7 16h8" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
        <!-- Layers Button -->
        <button class="tv-float-btn" :class="{ active: showLayersPanel }" @click="showLayersPanel = !showLayersPanel" title="Layers">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2"/>
            <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2"/>
            <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>

      <!-- Object Tree Panel -->
      <div class="tv-panel tv-object-tree" v-if="showObjectTree">
        <div class="tv-panel-header">
          <span>Drawing Objects</span>
          <button class="tv-panel-close" @click="showObjectTree = false">×</button>
        </div>
        <div class="tv-panel-body">
          <div v-if="drawingRef" class="tv-object-list">
            <div class="tv-object-empty" v-if="!drawingRef.drawings?.length">
              No drawings yet
            </div>
            <template v-else>
              <div 
                v-for="(drawing, idx) in drawingRef.drawings" 
                :key="idx"
                class="tv-object-item"
              >
                <span class="tv-object-color" :style="{ backgroundColor: drawing.color }"></span>
                <span class="tv-object-name">{{ drawing.type }}</span>
                <button class="tv-object-delete" @click="deleteDrawing(idx)">×</button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Layers Panel -->
      <div class="tv-panel tv-layers-panel" :class="{ 'is-shifted': showObjectTree }" v-if="showLayersPanel">
        <div class="tv-panel-header">
          <span>Layers</span>
          <button class="tv-panel-close" @click="showLayersPanel = false">×</button>
        </div>
        <div class="tv-panel-body">
          <div class="tv-layer-section">
            <div class="tv-layer-title">Data Series</div>
            <div class="tv-layer-empty" v-if="!selectedSymbols.length">No series selected</div>
            <div 
              v-for="symbol in selectedSymbols" 
              :key="symbol"
              class="tv-layer-item tv-layer-item-interactive"
            >
              <span class="tv-layer-icon">📊</span>
              <span class="tv-layer-name">{{ symbol }}</span>
              <button class="tv-layer-delete" @click="removeSymbol(symbol)" title="Remove series">×</button>
            </div>
          </div>
          <div class="tv-layer-section">
            <div class="tv-layer-title">Drawings</div>
            <div 
              class="tv-layer-item tv-layer-item-interactive" 
              v-if="drawingRef?.drawings?.length"
              @click="clearDrawings"
            >
              <span class="tv-layer-icon">✏️</span>
              <span class="tv-layer-name">Drawing Layer ({{ drawingRef.drawings.length }} objects)</span>
              <span class="tv-layer-action">Clear</span>
            </div>
            <div class="tv-layer-empty" v-else>No drawings</div>
          </div>
        </div>
      </div>
      
      <!-- Compact Summary Bar - Always visible -->
      <div class="tv-summary-bar">
        <template v-if="summaryData">
          <div class="tv-summary-item">
            <span class="tv-summary-label">Total (Gabungan):</span>
            <span class="tv-summary-value">{{ formatNumber(summaryData.totalAll) }}</span>
          </div>
          <div class="tv-summary-series">
            <div
              v-for="series in summaryData.series"
              :key="series.symbol"
              class="tv-summary-series-item"
            >
              <span class="tv-summary-dot" :style="{ backgroundColor: series.color }"></span>
              <span class="tv-summary-series-name">{{ series.symbol }}</span>
              <span class="tv-summary-series-metric">Σ {{ formatNumber(series.total) }}</span>
              <span class="tv-summary-series-metric">Terakhir {{ formatNumber(series.latest) }}</span>
              <span class="tv-summary-date">{{ series.latestDate || '' }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="tv-summary-item">
            <span class="tv-summary-label">Data tidak tersedia untuk filter ini</span>
          </div>
        </template>
      </div>
    </div>
  </main>

  <!-- Search Modal -->
  <div class="search-modal" :class="{ 'is-open': searchModalOpen }" :aria-hidden="!searchModalOpen">
    <div class="search-modal-backdrop" @click="closeSearchModal"></div>
    <div class="search-modal-panel" role="dialog" aria-modal="true" aria-label="Kode Data Search">
      <div class="search-modal-header">
        <div class="search-modal-title">Kode Data Search</div>
        <button type="button" class="search-modal-close" @click="closeSearchModal" aria-label="Close">×</button>
      </div>
      <div class="search-modal-input">
        <input 
          ref="searchInput"
          v-model="searchQuery" 
          type="text" 
          class="search-input" 
          placeholder="Cari kode data..." 
          @input="filterSymbols"
        />
      </div>
      <div class="search-dropdown search-results">
        <div v-if="loadingSymbols" class="search-loading">Loading...</div>
        <div v-else-if="filteredSymbols.length === 0" class="search-empty">Tidak ada hasil.</div>
          <button 
          v-for="sym in filteredSymbols" 
          :key="sym.symbol"
          type="button"
          class="search-item"
          :class="{ 'is-selected': selectedSymbols.includes(sym.symbol) }"
          @click="toggleSymbol(sym.symbol)"
        >
          <span class="search-item-code">{{ sym.symbol }}</span>
          <span class="search-item-name">{{ sym.name }}</span>
          <span v-if="sym.description && sym.description !== sym.name" class="search-item-desc">{{ sym.description }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { authFetch } from '../utils/auth'
import ProcurementChart from './ProcurementChart.vue'
import DrawingLayer from './DrawingLayer.vue'

// Types
interface SymbolItem {
  symbol: string
  name: string
  category: string
  description: string
  unit: string
}

interface SummarySeries {
  symbol: string
  total: number
  latest: number
  latestDate?: string
  color: string
}

interface SummaryData {
  totalAll: number
  series: SummarySeries[]
}

// Chart types
const chartTypes = [
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'bar', label: 'Bar' }
] as const

// Filtered chart types (tanpa candlestick) untuk header
const chartTypesFiltered = computed(() => chartTypes)

// Colors for series
const colors = [
  '#2962ff', '#26a69a', '#ef5350', '#ab47bc', '#ff9800',
  '#00bcd4', '#8bc34a', '#e91e63', '#3f51b5', '#009688'
]

// Theme state
type Theme = 'light' | 'dark'
const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'dark')

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.body.dataset.theme = theme.value
  localStorage.setItem('theme', theme.value)
}

// Drawing tools definition - MUST match DrawingLayer tool IDs
const drawingTools = [
  { id: 'select', label: 'Select', icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 4l7 18 2-7 7-2z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
  { id: 'hline', label: 'Horizontal Line', icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 12h16" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
  { id: 'vline', label: 'Vertical Line', icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 4v16" fill="none" stroke="currentColor" stroke-width="2"/></svg>' },
  { id: 'trendline', label: 'Trendline', icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M4 20L20 4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="4" cy="20" r="2" fill="currentColor"/><circle cx="20" cy="4" r="2" fill="currentColor"/></svg>' },
  { id: 'freedraw', label: 'Free Draw', icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 17c3-3 6-2 9-5s3-6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>' }
]

const activeDrawingTool = ref('select')

function setDrawingTool(toolId: string) {
  activeDrawingTool.value = toolId
  // TODO: Communicate with DrawingLayer if needed
}

function clearDrawings() {
  if (drawingRef.value) {
    drawingRef.value.clearAll()
  }
}

// Chart ref
const chartRef = ref<InstanceType<typeof ProcurementChart> | null>(null)
const drawingRef = ref<InstanceType<typeof DrawingLayer> | null>(null)

// Panel visibility state
const showObjectTree = ref(false)
const showLayersPanel = ref(false)

// Delete drawing by index
function deleteDrawing(idx: number) {
  if (drawingRef.value?.drawings) {
    drawingRef.value.drawings.splice(idx, 1)
    drawingRef.value.redraw?.()
  }
}

// Chart state
const chartType = ref<'line' | 'area' | 'bar'>('line')
const periodType = ref<'calendar' | 'fiscal'>('calendar')
const year = ref(2025)
const normalize = ref(false)
const logScale = ref(false)
const rawMode = ref(false)
const cumulative = ref(false)
const singleScale = ref(false)
const sumberDana = ref('')
const kategoriPlant = ref('')
const maxSeries = ref(5) // Default max 5 series
const selectedSymbols = ref<string[]>([])
const hiddenSeries = ref<Set<string>>(new Set())

// Navigation menu state
const navMenuOpen = ref(false)

// Dynamic chart height - calculate based on viewport
const windowHeight = ref(window.innerHeight)
const chartHeight = computed(() => windowHeight.value - 80) // header(40) + summary(40)

// Search modal state
const searchModalOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const allSymbols = ref<SymbolItem[]>([])
const loadingSymbols = ref(false)

// Go to page (for navigation menu)
function goToPage(page: string) {
  navMenuOpen.value = false
  // For now, just log - in future this could use router
  console.log('Navigate to:', page)
  alert(`Navigasi ke: ${page} (belum diimplementasikan)`)
}

// Summary data
const summaryData = ref<SummaryData | null>(null)

// Toggle series visibility
function toggleSeriesVisibility(symbol: string) {
  if (hiddenSeries.value.has(symbol)) {
    hiddenSeries.value.delete(symbol)
  } else {
    hiddenSeries.value.add(symbol)
  }
  
  // Toggle series visibility on ApexCharts
  if (chartRef.value) {
    chartRef.value.toggleSeries(symbol)
  }
}

// Filtered symbols for search
const filteredSymbols = computed(() => {
  if (!searchQuery.value) return allSymbols.value
  const q = searchQuery.value.toLowerCase()
  return allSymbols.value
    .filter(s => 
      s.symbol.toLowerCase().includes(q) || 
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q))
    )
})

// Load available symbols
async function loadSymbols() {
  loadingSymbols.value = true
  try {
    const res = await authFetch('/api/procurement/symbols')
    const json = await res.json()
    if (json.status === 'success') {
      allSymbols.value = json.data || []
    }
  } catch (err) {
    console.error('Failed to load symbols:', err)
  } finally {
    loadingSymbols.value = false
  }
}

// Toggle symbol selection
function toggleSymbol(symbol: string) {
  const idx = selectedSymbols.value.indexOf(symbol)
  if (idx >= 0) {
    selectedSymbols.value.splice(idx, 1)
  } else {
    // Check max series limit
    if (selectedSymbols.value.length >= maxSeries.value) {
      alert(`Maximum ${maxSeries.value} series sudah terpilih. Hapus salah satu series atau ubah max series di dropdown.`)
      return
    }
    selectedSymbols.value.push(symbol)
  }
}

// Remove symbol
function removeSymbol(symbol: string) {
  const idx = selectedSymbols.value.indexOf(symbol)
  if (idx >= 0) {
    selectedSymbols.value.splice(idx, 1)
  }
}

// Open search modal
function openSearchModal() {
  console.log('[DEBUG] openSearchModal called')  // Debug log
  searchModalOpen.value = true
  searchQuery.value = ''
  nextTick(() => {
    searchInput.value?.focus()
  })
}

// Close search modal
function closeSearchModal() {
  searchModalOpen.value = false
}

// Filter symbols (no-op, computed handles it)
function filterSymbols() {}

// Handle data loaded
function onDataLoaded(data: Record<string, any[]>) {
  if (!selectedSymbols.value.length) {
    summaryData.value = null
    return
  }

  const seriesSummaries: SummarySeries[] = []
  let totalAll = 0

  selectedSymbols.value.forEach((symbol, index) => {
    const values = data[symbol] || []
    if (!values.length) return

    const closes = values.map((d: any) => d.close)
    const total = closes.reduce((a: number, b: number) => a + b, 0)
    totalAll += total

    let latestIdx = closes.length - 1
    while (latestIdx >= 0 && closes[latestIdx] === 0) {
      latestIdx -= 1
    }
    if (latestIdx < 0) latestIdx = closes.length - 1

    const latest = closes[latestIdx]
    const latestDate = new Date(values[latestIdx].time * 1000).toLocaleDateString('id-ID')

    seriesSummaries.push({
      symbol,
      total,
      latest,
      latestDate,
      color: colors[index % colors.length]
    })
  })

  summaryData.value = seriesSummaries.length ? { totalAll, series: seriesSummaries } : null
}

// Handle chart error
function onChartError(msg: string) {
  console.error('Chart error:', msg)
}

// Format number
function formatNumber(val: number | undefined): string {
  if (val === undefined || val === null) return '--'
  if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
  if (val >= 1000) return (val / 1000).toFixed(1) + 'K'
  return val.toFixed(0)
}

// Handle resize
function handleResize() {
  windowHeight.value = window.innerHeight
}

// ===== PERSIST STATE TO LOCALSTORAGE =====
const STORAGE_KEY = 'chartApp_state'

// Save state to localStorage
function saveState() {
  const state = {
    selectedSymbols: selectedSymbols.value,
    chartType: chartType.value,
    periodType: periodType.value,
    year: year.value,
    normalize: normalize.value,
    logScale: logScale.value,
    rawMode: rawMode.value,
    cumulative: cumulative.value,
    singleScale: singleScale.value,
    sumberDana: sumberDana.value,
    kategoriPlant: kategoriPlant.value
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// Restore state from localStorage
function restoreState() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const state = JSON.parse(saved)
      // DO NOT restore selectedSymbols to prevent auto-loading data
      // if (state.selectedSymbols) selectedSymbols.value = state.selectedSymbols
      if (state.chartType) chartType.value = state.chartType
      if (state.periodType) periodType.value = state.periodType
      if (state.year) year.value = state.year
      if (state.normalize !== undefined) normalize.value = state.normalize
      if (state.logScale !== undefined) logScale.value = state.logScale
      if (state.rawMode !== undefined) rawMode.value = state.rawMode
      if (state.cumulative !== undefined) cumulative.value = state.cumulative
      if (state.singleScale !== undefined) singleScale.value = state.singleScale
      if (state.sumberDana !== undefined) sumberDana.value = state.sumberDana
      if (state.kategoriPlant !== undefined) kategoriPlant.value = state.kategoriPlant
    } catch (e) {
      console.warn('Failed to restore chart state:', e)
    }
  }
}

// Watch for state changes and save
watch([selectedSymbols, chartType, periodType, year, normalize, logScale, rawMode, cumulative, singleScale, sumberDana, kategoriPlant], saveState, { deep: true })

// Init
onMounted(() => {
  restoreState() // Restore saved state first
  loadSymbols()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
/* ============ TradingView-style Layout ============ */

/* Header */
.tv-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--stroke);
  position: relative;
  z-index: 1000;  /* Very high z-index to ensure clickability above ALL chart elements */
}

.tv-header-left,
.tv-header-center,
.tv-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tv-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ink);
}

.tv-title {
  font-size: 0.85rem;
  font-weight: 600;
}

.tv-symbol-search {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--surface-alt);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.tv-symbol-search:hover {
  background: var(--hover);
}

.tv-symbol-name {
  font-weight: 600;
}

.tv-symbol-more {
  font-size: 0.75rem;
  opacity: 0.7;
}

/* Buttons & Controls */
.tv-btn {
  padding: 4px 10px;
  background: transparent;
  border: none;
  color: var(--muted);
  font-size: 0.8rem;
  cursor: pointer;
  border-radius: 4px;
}

.tv-btn:hover {
  background: var(--hover);
  color: var(--ink);
}

.tv-btn.active {
  background: rgba(41, 98, 255, 0.15);
  color: var(--accent);
}

.tv-btn.icon {
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tv-btn-group {
  display: flex;
  background: var(--surface-alt);
  border-radius: 4px;
  overflow: hidden;
}

.tv-btn-group .tv-btn {
  border-radius: 0;
}

.tv-select {
  padding: 4px 8px;
  background: var(--surface-alt);
  border: none;
  color: var(--ink);
  font-size: 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23787b86' stroke-width='2'%3e%3cpath d='M6 9l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 4px center;
  background-size: 14px;
  padding-right: 22px;
}

.tv-select:hover {
  background-color: var(--hover);
}

.tv-select:focus {
  outline: 1px solid var(--accent);
  outline-offset: 0;
}

.tv-select option {
  background: var(--surface);
  color: var(--ink);
  padding: 8px;
}

/* Main Layout */
.tv-main {
  display: flex;
  height: calc(100vh - 40px);
  overflow: hidden;
}

.tv-sidebar {
  width: 48px;
  background: var(--surface);
  border-right: 1px solid var(--stroke);
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 4px 0;
  gap: 2px;
}

/* Sidebar Buttons */
.tv-sidebar-btn {
  width: 40px;
  height: 36px;
  margin: 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--muted);
  cursor: pointer;
}

.tv-sidebar-btn:hover {
  background: var(--hover);
  color: var(--ink);
}

.tv-sidebar-btn.active {
  background: rgba(41, 98, 255, 0.15);
  color: var(--accent);
}

.tv-sidebar-btn.danger:hover {
  background: rgba(239, 83, 80, 0.15);
  color: #ef5350;
}

.tv-sidebar-divider {
  height: 1px;
  background: var(--stroke);
  margin: 6px 8px;
}

/* Navigation Popup */
.tv-nav-popup {
  position: absolute;
  top: 0;
  left: 48px;
  width: 200px;
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 4px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  z-index: 100;
}

.tv-nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  font-size: 0.85rem;
  font-weight: 600;
  border-bottom: 1px solid var(--stroke);
}

.tv-nav-header button {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 1.2rem;
}

.tv-nav-items {
  display: flex;
  flex-direction: column;
}

.tv-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: var(--ink);
  font-size: 0.85rem;
  cursor: pointer;
  text-align: left;
}

.tv-nav-item:hover {
  background: var(--hover);
}

.tv-nav-item.active,
.tv-nav-item.router-link-active,
.tv-nav-item.router-link-exact-active {
  background: rgba(41, 98, 255, 0.15);
  color: var(--accent);
}

.tv-chart-area {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  overflow: hidden;
}

.tv-chart-canvas {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
}

.tv-chart-canvas :deep(.chart-wrapper) {
  width: 100% !important;
  height: 100% !important;
}

.tv-chart-canvas :deep(.apexcharts-canvas) {
  width: 100% !important;
}

/* Drawing Layer Overlay */
.tv-drawing-overlay {
  position: absolute;
  top: 40px;  /* Start below header (header height is 40px) */
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  pointer-events: none;
}

/* Only enable pointer events on canvas when drawing tool is active (not select) */
.tv-drawing-overlay.is-drawing :deep(canvas) {
  pointer-events: auto;
  cursor: crosshair;
}

.tv-drawing-overlay :deep(.drawing-toolbar) {
  display: none;
}

/* ApexCharts Legend Styling - Vertical with Eye Icon */
.tv-chart-canvas :deep(.apexcharts-legend) {
  flex-direction: column !important;
  align-items: flex-start !important;
  padding: 8px !important;
  gap: 4px !important;
  z-index: 20 !important; /* Above drawing overlay (z-index: 10) */
  pointer-events: auto !important;
  max-width: 150px !important; /* Limit width so it doesn't cover chart */
  width: auto !important;
}

.tv-chart-canvas :deep(.apexcharts-legend-series) {
  cursor: pointer !important;
  padding: 2px 4px !important;
  border-radius: 4px !important;
  transition: background 0.15s !important;
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

.tv-chart-canvas :deep(.apexcharts-legend-series:hover) {
  background: rgba(255,255,255,0.15) !important;
}

/* Hidden series style - faded */
.tv-chart-canvas :deep(.apexcharts-legend-series.apexcharts-inactive-legend) {
  opacity: 0.4 !important;
}

/* Legend Overlay */
.tv-legend {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tv-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(0,0,0,0.6);
  border-radius: 4px;
  font-size: 0.8rem;
}

.tv-legend-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
}

.tv-legend-eye {
  width: 12px;
  height: 12px;
  opacity: 0;
  color: #fff;
  transition: opacity 0.15s;
}

.tv-legend-item:hover .tv-legend-eye {
  opacity: 1;
}

.tv-legend-item.is-hidden {
  opacity: 0.4;
}

.tv-legend-item.is-hidden .tv-legend-eye {
  opacity: 1;
}

.tv-legend-text {
  font-weight: 500;
  color: #fff;
}

.tv-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.tv-legend-name {
  font-weight: 500;
  color: #fff;
}

.tv-legend-btn {
  padding: 2px;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
}

.tv-legend-btn:hover {
  color: #fff;
}

/* Floating Buttons (bottom-right) */
.tv-float-btns {
  position: absolute;
  bottom: 40px;
  right: 60px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.tv-float-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 4px;
  color: var(--muted);
  cursor: pointer;
}

.tv-float-btn:hover {
  background: var(--hover);
  color: var(--ink);
}

.tv-float-btn.active {
  background: rgba(41, 98, 255, 0.15);
  color: var(--accent);
  border-color: var(--accent);
}

/* Summary Bar (bottom) */
.tv-summary-bar {
  display: flex;
  align-items: center;
  gap: 10px;  /* Reduced from 16px */
  padding: 4px 8px;  /* Reduced from 6px 12px */
  background: var(--surface);
  border-top: 1px solid var(--stroke);
  font-size: 0.75rem;
  overflow-x: auto;
}

.tv-summary-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.tv-summary-label {
  color: var(--muted);
}

.tv-summary-value {
  font-weight: 600;
  color: var(--ink);
}

.tv-summary-date {
  color: var(--muted);
  font-size: 0.7rem;
}

.tv-summary-series {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.tv-summary-series-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: var(--surface-alt);
  border: 1px solid var(--stroke);
  font-size: 0.72rem;
}

.tv-summary-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tv-summary-series-name {
  font-weight: 600;
  color: var(--ink);
}

.tv-summary-series-metric {
  color: var(--muted);
}

/* ============ Legacy Styles (Search Modal, etc.) ============ */
.series-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.series-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--surface);
  border: 2px solid;
  border-radius: 16px;
  font-size: 0.85rem;
}

.chip-remove {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.chip-remove:hover {
  color: var(--ink);
}

.search-modal.is-open {
  display: flex;
}

.search-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--stroke);
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.search-item:hover {
  background: var(--surface-alt);
}

.search-item.is-selected {
  background: rgba(41, 98, 255, 0.1);
}

.search-item-code {
  font-weight: 600;
}

.search-item-name {
  font-size: 0.85rem;
  color: var(--muted);
}

.search-item-desc {
  font-size: 0.78rem;
  color: var(--muted);
}

.search-loading,
.search-empty {
  padding: 20px;
  text-align: center;
  color: var(--muted);
}

.trend.up {
  color: #26a69a;
}

.trend.down {
  color: #ef5350;
}

/* ===== Floating Button Divider ===== */
.tv-float-divider {
  width: 1px;
  height: 16px;
  background: rgba(255,255,255,0.2);
  margin: 0 4px;
}

/* ===== Object Tree & Layers Panels ===== */
.tv-panel {
  position: absolute;
  right: 60px;
  bottom: 40px;
  width: 200px;  /* Reduced from 220px */
  transform: translateY(calc(-100% - 8px));  /* Reduced from 12px */
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: 1px solid var(--stroke);
  border-radius: 8px;
  z-index: 25;
  box-shadow: var(--shadow);
}

.tv-layers-panel {
  right: 60px;
}

.tv-layers-panel.is-shifted {
  right: 288px;
}

.tv-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--stroke);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--ink);
}

.tv-panel-close {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0 4px;
}

.tv-panel-close:hover {
  color: var(--ink);
}

.tv-panel-body {
  padding: 8px;
  max-height: 250px;
  overflow-y: auto;
}

/* Object Tree Items */
.tv-object-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tv-object-empty,
.tv-layer-empty {
  padding: 12px;
  text-align: center;
  color: var(--muted);
  font-size: 0.8rem;
}

.tv-object-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: var(--surface-alt);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--ink);
}

.tv-object-item:hover {
  background: var(--hover);
}

.tv-object-color {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tv-object-name {
  flex: 1;
  text-transform: capitalize;
}

.tv-object-delete {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.tv-object-item:hover .tv-object-delete {
  opacity: 1;
}

.tv-object-delete:hover {
  color: #ef5350;
}

/* Layer Items */
.tv-layer-section {
  margin-bottom: 8px;
}

.tv-layer-title {
  font-size: 0.7rem;
  text-transform: uppercase;
  color: var(--muted);
  padding: 4px 8px;
  letter-spacing: 0.5px;
}

.tv-layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  font-size: 0.8rem;
  color: var(--ink);
  border-radius: 4px;
}

.tv-layer-item:hover {
  background: var(--surface-alt);
}

.tv-layer-item-interactive {
  cursor: pointer;
}

.tv-layer-item-interactive:hover {
  background: var(--hover);
}

.tv-layer-icon {
  font-size: 0.9rem;
}

.tv-layer-name {
  flex: 1;
}

.tv-layer-delete {
  background: none;
  border: none;
  color: var(--muted);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.tv-layer-item:hover .tv-layer-delete {
  opacity: 1;
}

.tv-layer-delete:hover {
  color: #ef5350;
}

.tv-layer-action {
  font-size: 0.7rem;
  color: var(--muted);
  opacity: 0;
  transition: opacity 0.15s;
}

.tv-layer-item:hover .tv-layer-action {
  opacity: 1;
  color: #ef5350;
}
</style>
