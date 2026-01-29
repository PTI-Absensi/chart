<template>
  <header class="hero animate-in">
    <div class="hero-inner">
      <div class="eyebrow">Procurement Analytics</div>
      <h1>Procurement Charting</h1>
      <p class="lead">Grafik time series untuk data procurement perusahaan manufaktur.</p>
      <div class="hero-tags">
        <span class="tag">Olahproc Database</span>
        <span class="tag">Kode Data</span>
        <span class="tag">Procurement Series</span>
      </div>
    </div>
  </header>

  <main class="layout layout-single">
    <section class="chart-panel animate-in" aria-label="Grafik time series">
      <div class="chart-header">
        <div>
          <h2>Procurement Chart</h2>
          <p class="chart-subtitle">{{ selectedSymbols.length > 0 ? selectedSymbols.join(', ') : 'Pilih kode data untuk melihat data' }}</p>
        </div>
        <div class="chart-meta">
          <span class="badge">{{ periodType === 'calendar' ? 'Kalender' : 'Anggaran' }}</span>
          <span class="badge">{{ year }}</span>
          <span class="badge">Weekly</span>
        </div>
      </div>

      <div class="chart-toolbar" aria-label="Chart toolbar">
        <div class="toolbar-row toolbar-filters">
          <div class="toolbar-left">
            <div class="toolbar-group toolbar-search">
              <input 
                type="text" 
                class="search-trigger" 
                placeholder="Cari kode data..." 
                readonly 
                @click="openSearchModal"
              />
              <button type="button" class="series-add-btn inline-add" title="Tambah series" @click="openSearchModal">+</button>
            </div>
          </div>
          <div class="toolbar-right">
            <div class="toolbar-group">
              <div class="segmented compact" role="group" aria-label="Tipe periode">
                <button 
                  type="button" 
                  :class="{ 'is-active': periodType === 'calendar' }"
                  @click="periodType = 'calendar'"
                >Kalender</button>
                <button 
                  type="button" 
                  :class="{ 'is-active': periodType === 'fiscal' }"
                  @click="periodType = 'fiscal'"
                >Anggaran</button>
              </div>
            </div>
            <div class="toolbar-group">
              <select v-model="year" class="tool-select compact" aria-label="Tahun">
                <option :value="2024">2024</option>
                <option :value="2025">2025</option>
                <option :value="2026">2026</option>
              </select>
            </div>
            <div class="toolbar-group">
              <div class="segmented compact" role="group" aria-label="Gaya grafik">
                <button 
                  v-for="type in chartTypes" 
                  :key="type.value"
                  type="button" 
                  :class="{ 'is-active': chartType === type.value }"
                  @click="chartType = type.value"
                >{{ type.label }}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected series row -->
        <div class="selected-series-row" aria-label="Series terpilih">
          <div v-if="selectedSymbols.length === 0" class="selected-series-placeholder">
            Pilih kode data untuk mulai.
          </div>
          <div v-else class="series-chips">
            <span 
              v-for="(symbol, index) in selectedSymbols" 
              :key="symbol" 
              class="series-chip"
              :style="{ borderColor: colors[index % colors.length] }"
            >
              {{ symbol }}
              <button type="button" class="chip-remove" @click="removeSymbol(symbol)">×</button>
            </span>
          </div>
        </div>

        <!-- Chart tools -->
        <div class="chart-tools" role="toolbar" aria-label="Chart tools">
          <div class="tool-row">
            <button type="button" class="tool-btn icon-btn" title="Fit" @click="chartRef?.refresh()">
              <svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2" /></svg>
            </button>
            <button type="button" class="tool-btn icon-btn" :class="{ 'is-active': normalize }" title="Normalize" @click="normalize = !normalize">
              <svg viewBox="0 0 24 24"><path d="M4 7h16M4 17h16M7 4v16" fill="none" stroke="currentColor" stroke-width="2" /></svg>
            </button>
            <button type="button" class="tool-btn icon-btn" :class="{ 'is-active': logScale }" title="Log scale" @click="logScale = !logScale">
              <svg viewBox="0 0 24 24"><path d="M4 19h16M6 16c2-3 4-4 6-4s4 1 6 4" fill="none" stroke="currentColor" stroke-width="2" /></svg>
            </button>
            <button type="button" class="tool-btn icon-btn" title="Zoom in" @click="chartRef?.zoomIn()">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" /><path d="M11 8v6M8 11h6M20 20l-4-4" fill="none" stroke="currentColor" stroke-width="2" /></svg>
            </button>
            <button type="button" class="tool-btn icon-btn" title="Zoom out" @click="chartRef?.zoomOut()">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2" /><path d="M8 11h6M20 20l-4-4" fill="none" stroke="currentColor" stroke-width="2" /></svg>
            </button>
            <button type="button" class="tool-btn icon-btn" title="Export PNG" @click="chartRef?.exportPng()">
              <svg viewBox="0 0 24 24"><path d="M12 3v12M8 7l4-4 4 4M5 14v6h14v-6" fill="none" stroke="currentColor" stroke-width="2" /></svg>
            </button>
            <button type="button" class="tool-btn icon-btn" title="Export CSV" @click="chartRef?.exportCsv()">
              <svg viewBox="0 0 24 24"><path d="M4 4h12l4 4v12H4z" fill="none" stroke="currentColor" stroke-width="2" /><path d="M8 16h8M8 12h8M8 8h4" fill="none" stroke="currentColor" stroke-width="2" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Chart area -->
      <div class="chart-main">
        <div class="chart-canvas" style="position: relative;">
          <ProcurementChart
            ref="chartRef"
            :chart-type="chartType"
            :period-type="periodType"
            :year="year"
            :symbols="selectedSymbols"
            :normalize="normalize"
            :log-scale="logScale"
            :height="450"
            @data-loaded="onDataLoaded"
            @error="onChartError"
          />
          <DrawingLayer ref="drawingRef" :height="450" />
        </div>

        <!-- Summary grid -->
        <div v-if="summaryData" class="summary-grid">
          <div class="summary-card">
            <div class="summary-label">Total periode</div>
            <div class="summary-value">{{ formatNumber(summaryData.total) }}</div>
            <div class="summary-sub">Akumulasi data</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Puncak</div>
            <div class="summary-value">{{ formatNumber(summaryData.peak) }}</div>
            <div class="summary-sub">{{ summaryData.peakDate || '-' }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Terakhir</div>
            <div class="summary-value">{{ formatNumber(summaryData.latest) }}</div>
            <div class="summary-sub">Nilai terbaru</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">Perubahan</div>
            <div class="summary-value trend" :class="summaryData.trend >= 0 ? 'up' : 'down'">
              {{ summaryData.trend >= 0 ? '+' : '' }}{{ summaryData.trend?.toFixed(1) }}%
            </div>
            <div class="summary-sub">vs sebelumnya</div>
          </div>
        </div>
      </div>
    </section>
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
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
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

interface SummaryData {
  total: number
  peak: number
  peakDate: string
  latest: number
  trend: number
}

// Chart types
const chartTypes = [
  { value: 'line', label: 'Line' },
  { value: 'area', label: 'Area' },
  { value: 'bar', label: 'Bar' },
  { value: 'candlestick', label: 'Candle' }
] as const

// Colors for series
const colors = [
  '#2962ff', '#26a69a', '#ef5350', '#ab47bc', '#ff9800',
  '#00bcd4', '#8bc34a', '#e91e63', '#3f51b5', '#009688'
]

// Chart ref
const chartRef = ref<InstanceType<typeof ProcurementChart> | null>(null)
const drawingRef = ref<InstanceType<typeof DrawingLayer> | null>(null)

// Chart state
const chartType = ref<'line' | 'area' | 'bar' | 'candlestick'>('line')
const periodType = ref<'calendar' | 'fiscal'>('calendar')
const year = ref(2025)
const normalize = ref(false)
const logScale = ref(false)
const selectedSymbols = ref<string[]>([])

// Search modal state
const searchModalOpen = ref(false)
const searchQuery = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const allSymbols = ref<SymbolItem[]>([])
const loadingSymbols = ref(false)

// Summary data
const summaryData = ref<SummaryData | null>(null)

// Filtered symbols for search
const filteredSymbols = computed(() => {
  if (!searchQuery.value) return allSymbols.value.slice(0, 50)
  const q = searchQuery.value.toLowerCase()
  return allSymbols.value
    .filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
    .slice(0, 50)
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
    if (selectedSymbols.value.length < 10) {
      selectedSymbols.value.push(symbol)
    }
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
  // Calculate summary from first symbol
  const firstSymbol = selectedSymbols.value[0]
  if (!firstSymbol || !data[firstSymbol]) {
    summaryData.value = null
    return
  }

  const values = data[firstSymbol]
  if (values.length === 0) {
    summaryData.value = null
    return
  }

  const closes = values.map((d: any) => d.close)
  const total = closes.reduce((a: number, b: number) => a + b, 0)
  const peakVal = Math.max(...closes)
  const peakIdx = closes.indexOf(peakVal)
  const peakDate = new Date(values[peakIdx].time * 1000).toLocaleDateString('id-ID')
  const latest = closes[closes.length - 1]
  const prev = closes.length > 1 ? closes[closes.length - 2] : latest
  const trend = prev > 0 ? ((latest - prev) / prev) * 100 : 0

  summaryData.value = { total, peak: peakVal, peakDate, latest, trend }
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

// Init
onMounted(() => {
  loadSymbols()
})
</script>

<style scoped>
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
</style>
