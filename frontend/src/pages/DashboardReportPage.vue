<template>
  <div class="pp-page flex flex-col gap-6 px-6 md:px-10 lg:px-14 py-8 max-w-[1380px] mx-auto w-full">
    <!-- ═══ Header ═══ -->
    <motion.div :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.35 }">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="pp-title">Laporan Pengadaan SGN</h1>
          <p class="text-[13px] text-[var(--pp-muted)]">
            Ringkasan metrik dan performa pengadaan PT. Surya Ganda Nusantara
            <span v-if="data.lastUpdate" class="ml-2 text-[11px] text-green-600 font-medium">● Data Live: {{ data.lastUpdate }}</span>
            <span v-else class="ml-2 text-[11px] text-amber-600">● Loading data...</span>
          </p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <!-- Search -->
          <div class="relative flex items-center">
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search Anything..."
              class="pp-pill w-[200px] pl-4 pr-12 text-[13px] outline-none"
            />
            <button class="absolute right-1 w-[34px] h-[34px] rounded-full bg-[var(--pp-ink)] text-white flex items-center justify-center" type="button">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
          </div>
          <!-- Filters -->
          <select v-model="filters.year" class="pp-pill text-[13px]">
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
          <select v-model="filters.periodType" class="pp-pill text-[13px]">
            <option value="anggaran">Anggaran</option>
            <option value="kontrak">Kontrak</option>
          </select>
          <select v-model="filters.sumberDana" class="pp-pill text-[13px]">
            <option value="">Semua Dana</option>
            <option value="APBN">APBN</option>
            <option value="APBD">APBD</option>
            <option value="BUMN">BUMN</option>
          </select>
          <!-- Export Buttons -->
          <button 
            class="pp-pg-btn bg-[#b91c1c] text-white disabled:opacity-50 disabled:cursor-not-allowed" 
            @click="exportPDF"
            :disabled="isExporting"
          >
            <svg v-if="!isExporting" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <svg v-else class="animate-spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            {{ isExporting ? 'Generating...' : 'Export Report PDF' }}
          </button>
          <button 
            class="pp-pg-btn bg-[#1e3a2f] text-white disabled:opacity-50 disabled:cursor-not-allowed" 
            @click="captureDashboard"
            :disabled="isExporting"
          >
            <svg v-if="!isExporting" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <svg v-else class="animate-spin" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="60" stroke-dashoffset="20"/></svg>
            {{ isExporting ? 'Capturing...' : 'Capture Dashboard' }}
          </button>
        </div>
      </div>
    </motion.div>

    <!-- ═══ KPI Cards (6 cards like PDF SGN) ═══ -->
    <motion.div
      class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      :initial="'hidden'" :animate="'visible'"
      :variants="containerVariants"
    >
      <!-- Card 1: Plant Stats -->
      <motion.div class="pp-card flex flex-col gap-3 cursor-default" :whileHover="{ y: -3, transition: { duration: 0.2 } }">
        <div class="text-2xl font-bold text-[var(--pp-ink)]">{{ data.plantStats?.pg || 33 }}</div>
        <div class="text-sm text-[var(--pp-muted)]">PG</div>
        <div class="text-xs text-[var(--pp-sage)]">+{{ data.plantStats?.mkso || 16 }} MKSO</div>
      </motion.div>
      
      <!-- Card 2: Jumlah PR -->
      <motion.div class="pp-card flex flex-col gap-3 cursor-default" :whileHover="{ y: -3, transition: { duration: 0.2 } }">
        <div class="text-2xl font-bold text-[var(--pp-ink)]">{{ formatNumber(data.totalPR) }}</div>
        <div class="text-sm text-[var(--pp-muted)]">Jumlah PR</div>
      </motion.div>
      
      <!-- Card 3: Jumlah PK -->
      <motion.div class="pp-card flex flex-col gap-3 cursor-default" :whileHover="{ y: -3, transition: { duration: 0.2 } }">
        <div class="text-2xl font-bold text-[var(--pp-ink)]">{{ formatNumber(data.totalPK) }}</div>
        <div class="text-sm text-[var(--pp-muted)]">Jumlah PK</div>
      </motion.div>
      
      <!-- Card 4: Jumlah PP -->
      <motion.div class="pp-card flex flex-col gap-3 cursor-default" :whileHover="{ y: -3, transition: { duration: 0.2 } }">
        <div class="text-2xl font-bold text-[var(--pp-ink)]">{{ formatNumber(data.totalPP) }}</div>
        <div class="text-sm text-[var(--pp-muted)]">Jumlah PP</div>
      </motion.div>
      
      <!-- Card 5: Nilai PK -->
      <motion.div class="pp-card flex flex-col gap-3 cursor-default" :whileHover="{ y: -3, transition: { duration: 0.2 } }">
        <div class="text-2xl font-bold text-[var(--pp-ink)]">{{ formatCompactNumber(data.totalNilai) }}</div>
        <div class="text-sm text-[var(--pp-muted)]">Nilai PK</div>
      </motion.div>
      
      <!-- Card 6: Jumlah SPPBJ -->
      <motion.div class="pp-card flex flex-col gap-3 cursor-default" :whileHover="{ y: -3, transition: { duration: 0.2 } }">
        <div class="text-2xl font-bold text-[var(--pp-ink)]">{{ formatNumber(data.totalSPPBJ) }}</div>
        <div class="text-sm text-[var(--pp-muted)]">Jumlah SPPBJ</div>
      </motion.div>
    </motion.div>

    <!-- ═══ Charts Row ═══ -->
    <motion.div
      class="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.15 }"
    >
      <!-- Bar Chart -->
      <div class="pp-card">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-base font-semibold text-[var(--pp-ink)]">Tren Realisasi</h3>
          <select v-model="filters.chartMode" class="pp-pill text-[12px] py-1">
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </div>
        <div class="flex gap-4 text-[11px] text-[var(--pp-muted)] mb-3">
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-[#b6c6a6] inline-block"></span>Realisasi</span>
          <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-[#4a5d4a] inline-block"></span>Jumlah PK</span>
        </div>
        <apexchart type="bar" height="260" :options="barChartOptions" :series="barSeries" />
      </div>

      <!-- Donut Chart -->
      <div class="pp-card">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-base font-semibold text-[var(--pp-ink)]">Metode Pemilihan</h3>
          <button class="text-[var(--pp-sage)] text-[12px] font-medium flex items-center gap-1 hover:underline">See Details
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="relative">
          <apexchart type="donut" height="210" :options="donutOptions" :series="donutSeries" />
          <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span class="text-2xl font-bold text-[var(--pp-ink)]">{{ formatNumber(data.totalPK) }}</span>
            <span class="text-[11px] text-[var(--pp-muted)]">Total PK</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px]">
          <span v-for="(leg, idx) in donutLegend" :key="idx" class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full inline-block" :style="{ background: leg.color }"></span>
            <span class="text-[var(--pp-muted)]">{{ leg.label }} ({{ leg.value }})</span>
          </span>
        </div>
      </div>
    </motion.div>

    <!-- ═══ Saving Section (Modern) ═══ -->
    <motion.div
      class="grid grid-cols-1 lg:grid-cols-3 gap-5"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.2 }"
    >
      <!-- Saving vs Anggaran -->
      <div class="pp-card bg-gradient-to-br from-green-50/10 to-transparent border-l-4 border-l-green-500">
        <div class="flex flex-col gap-2">
          <span class="text-sm text-[var(--pp-muted)]">Saving terhadap Anggaran</span>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold text-green-400">{{ data.savings?.vsAnggaran?.toFixed(1) || '13.7' }}%</span>
          </div>
          <div class="w-full bg-gray-700 rounded-full h-2">
            <div class="bg-green-500 h-2 rounded-full" :style="{ width: (data.savings?.vsAnggaran || 13.7) + '%' }"></div>
          </div>
        </div>
      </div>
      
      <!-- Saving Nominal -->
      <div class="pp-card bg-gradient-to-br from-amber-50/10 to-transparent border-l-4 border-l-amber-500">
        <div class="flex flex-col gap-2">
          <span class="text-sm text-[var(--pp-muted)]">Saving Terhadap HPS</span>
          <span class="text-3xl font-bold text-amber-400">{{ formatCompactNumber(data.savings?.nominalHPS || 11210000000) }}</span>
          <span class="text-xs text-[var(--pp-muted)]">Nilai efisiensi pengadaan</span>
        </div>
      </div>
      
      <!-- Saving vs HPS -->
      <div class="pp-card bg-gradient-to-br from-blue-50/10 to-transparent border-l-4 border-l-blue-500">
        <div class="flex flex-col gap-2">
          <span class="text-sm text-[var(--pp-muted)]">Saving(%) terhadap HPS</span>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold text-blue-400">{{ data.savings?.vsHPS?.toFixed(1) || '8.3' }}%</span>
          </div>
          <div class="w-full bg-gray-700 rounded-full h-2">
            <div class="bg-blue-500 h-2 rounded-full" :style="{ width: (data.savings?.vsHPS || 8.3) + '%' }"></div>
          </div>
        </div>
      </div>
    </motion.div>

    <!-- ═══ Plant Table (Modern) ═══ -->
    <motion.div
      class="pp-card overflow-hidden"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.25 }"
    >
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 class="text-lg font-semibold text-[var(--pp-ink)]">Nilai Realisasi dan Jumlah PK</h3>
          <p class="text-[13px] text-[var(--pp-muted)]">Kantor Pusat dan Pabrik Gula</p>
        </div>
        <div class="flex gap-2 bg-[var(--pp-cream)] p-1 rounded-lg">
          <button
            v-for="cat in ['All', 'PG', 'MKSO', 'HO']"
            :key="cat"
            class="px-4 py-1.5 text-[12px] font-medium rounded-md transition-all"
            :class="filters.plantCategory === cat ? 'bg-[var(--pp-ink)] text-white shadow-sm' : 'text-[var(--pp-muted)] hover:text-[var(--pp-ink)]'"
            @click="filters.plantCategory = cat"
          >{{ cat }}</button>
        </div>
      </div>
      
      <div class="overflow-x-auto rounded-lg border border-[var(--pp-border)]">
        <table class="w-full text-[13px]">
          <thead class="bg-[var(--pp-cream)]">
            <tr>
              <th class="text-left py-3 px-4 font-semibold text-[var(--pp-muted)]">No</th>
              <th class="text-left py-3 px-4 font-semibold text-[var(--pp-muted)]">Nama Plant</th>
              <th class="text-center py-3 px-4 font-semibold text-[var(--pp-muted)]">Kategori</th>
              <th class="text-right py-3 px-4 font-semibold text-[var(--pp-muted)]">Jumlah PK</th>
              <th class="text-right py-3 px-4 font-semibold text-[var(--pp-muted)]">Nilai Realisasi</th>
              <th class="text-right py-3 px-4 font-semibold text-[var(--pp-muted)]">Saving %</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="(plant, idx) in filteredPlants" 
              :key="idx"
              class="border-b border-[var(--pp-border)] hover:bg-[rgba(91,117,83,0.05)] transition-colors"
            >
              <td class="py-3 px-4 text-[var(--pp-muted)]">{{ (currentPage - 1) * itemsPerPage + idx + 1 }}</td>
              <td class="py-3 px-4">
                <div class="font-medium text-[var(--pp-ink)]">{{ plant.plant_name || plant.nama_plant }}</div>
                <div class="text-[11px] text-[var(--pp-muted)]">{{ plant.plant_code }}</div>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="px-2 py-1 text-[11px] rounded-full font-medium"
                  :class="plant.kategori === 'PG' ? 'bg-green-100 text-green-700' : plant.kategori === 'MKSO' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'"
                >{{ plant.kategori }}</span>
              </td>
              <td class="py-3 px-4 text-right font-medium">{{ plant.jumlah_pk || 0 }}</td>
              <td class="py-3 px-4 text-right font-semibold text-[var(--pp-sage)]">{{ formatCurrency(plant.nilai_realisasi || 0) }}</td>
              <td class="py-3 px-4 text-right">
                <span class="text-green-400">{{ (plant.saving_percent || 0).toFixed(2) }}%</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-[var(--pp-border)]">
        <span class="text-[12px] text-[var(--pp-muted)]">
          Showing <span class="font-semibold text-[var(--pp-ink)]">{{ filteredPlants.length }}</span> of 
          <span class="font-semibold text-[var(--pp-ink)]">{{ data.plants?.length || 0 }}</span> plants
        </span>
        <div class="flex items-center gap-2">
          <button 
            class="px-4 py-2 text-[12px] font-medium rounded-lg border border-[var(--pp-border)] hover:bg-[var(--pp-cream)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            :disabled="currentPage <= 1"
            @click="currentPage--"
          >← Previous</button>
          <span class="px-4 py-2 text-[12px] font-medium bg-[var(--pp-cream)] rounded-lg">Page {{ currentPage }} of {{ totalPages }}</span>
          <button 
            class="px-4 py-2 text-[12px] font-medium rounded-lg border border-[var(--pp-border)] hover:bg-[var(--pp-cream)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          >Next →</button>
        </div>
      </div>
    </motion.div>

    <!-- Waktu Proses -->
    <motion.div
      class="pp-card"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.3 }"
    >
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-base font-semibold text-[var(--pp-ink)]">Waktu Proses</h3>
        <span class="pp-pill text-[11px] py-0.5 px-3">Hari Kerja</span>
      </div>
      <div class="space-y-0">
        <div
          v-for="(wp, idx) in waktuProsesList"
          :key="idx"
          class="flex justify-between items-center py-3 px-1.5 border-b border-[var(--pp-cream)] last:border-b-0 hover:bg-[rgba(91,117,83,0.03)] transition-colors"
        >
          <div class="flex items-center gap-3">
            <div class="w-[38px] h-[38px] rounded-xl flex items-center justify-center" :style="{ background: wp.bgColor }">
              <svg v-if="wp.iconName === 'file'" width="18" height="18" class="text-[var(--pp-sage)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <svg v-else-if="wp.iconName === 'dollar'" width="18" height="18" class="text-[var(--pp-sand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              <svg v-else-if="wp.iconName === 'handshake'" width="18" height="18" class="text-[var(--pp-olive)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 7h2v10h-2z"/><path d="M7 10h2v7H7z"/><path d="M15 10h2v7h-2z"/><path d="M3 17h18v4H3z"/></svg>
              <svg v-else-if="wp.iconName === 'building'" width="18" height="18" class="text-[var(--pp-olive)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><line x1="9" y1="18" x2="15" y2="18"/></svg>
              <svg v-else width="18" height="18" class="text-[var(--pp-sand)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
            </div>
            <div>
              <div class="font-semibold text-sm text-[var(--pp-ink)]">{{ wp.label }}</div>
              <div class="text-[0.68rem] text-[var(--pp-muted)]">Avg. durasi proses</div>
            </div>
          </div>
          <span class="font-bold text-sm text-[var(--pp-sage)]">{{ wp.value }} Hari</span>
        </div>
      </div>
    </motion.div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { motion } from 'motion-v'
import VueApexCharts from 'vue3-apexcharts'

const apexchart = VueApexCharts

// ── Animation variants ──
const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } }
const itemVariants = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }

// ── Reactive theme detection ──
const currentTheme = ref<'light' | 'dark'>('light')
onMounted(() => {
  const sync = () => { currentTheme.value = (document.body.dataset.theme as 'light' | 'dark') || 'light' }
  sync()
  const obs = new MutationObserver(sync)
  obs.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })
})

// ── Filters ──
const currentYear = new Date().getFullYear()
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)
const plantOptions = ['All', 'PG', 'MKSO', 'HO']

const filters = reactive({
  year: currentYear,
  periodType: 'anggaran',
  sumberDana: '',
  search: '',
  chartMode: 'monthly' as 'monthly' | 'quarterly',
  plant: 'All',
  plantCategory: 'All'
})

// ── Pagination ──
const currentPage = ref(1)
const itemsPerPage = 25

// ── Plant Table Computed ──
const filteredPlants = computed(() => {
  let plants = data.plants || []
  if (filters.plantCategory !== 'All') {
    plants = plants.filter((p: any) => p.kategori === filters.plantCategory)
  }
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return plants.slice(start, end)
})

const totalPages = computed(() => {
  let total = (data.plants || []).length
  if (filters.plantCategory !== 'All') {
    total = (data.plants || []).filter((p: any) => p.kategori === filters.plantCategory).length
  }
  return Math.ceil(total / itemsPerPage) || 1
})

const totalPlantStats = computed(() => {
  const plants = filteredPlants.value
  return {
    jumlah_pk: plants.reduce((sum: number, p: any) => sum + (p.jumlah_pk || 0), 0),
    nilai: plants.reduce((sum: number, p: any) => sum + (p.nilai_realisasi || 0), 0),
    saving: plants.length > 0 
      ? plants.reduce((sum: number, p: any) => sum + (p.saving_percent || 0), 0) / plants.length 
      : 0
  }
})

// ── Data ──
const data = reactive({
  totalPR: 0,
  totalPK: 0,
  totalPP: 0,
  totalSPPBJ: 0,
  totalNilai: 0,
  plantStats: null as any,
  savings: null as any,
  waktuProses: null as any,
  realisasi: [] as any[],
  metodePemilihan: null as any,
  plants: [] as any[],  // Backend returns 'plants'
  plantList: [] as any[]  // For compatibility
})

const isLoading = ref(false)

// ── API fetch ──
async function fetchData() {
  isLoading.value = true
  try {
    const periodTypeParam = filters.periodType === 'anggaran' ? 'fiscal' : 'calendar'
    const params = new URLSearchParams({ 
      year: String(filters.year),
      period_type: periodTypeParam
    })
    if (filters.sumberDana) params.set('sumber_dana', filters.sumberDana)
    
    console.log('[Dashboard] Fetching data:', { year: filters.year, periodType: periodTypeParam })
    
    const res = await fetch(`/api/dashboard/summary?${params}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    
    console.log('[Dashboard] Received data:', json.data)
    
    // Backend returns { status: 'success', data: {...} }
    if (json.data) {
      Object.assign(data, json.data)
    } else {
      Object.assign(data, json)
    }
  } catch (e) {
    console.warn('Dashboard API error, using mock data:', e)
    // Mock fallback
    Object.assign(data, {
      totalPR: 622, totalPK: 258, totalPP: 276, totalSPPBJ: 227,
      totalNilai: 135250000,
      plantStats: { pg: 33, mkso: 16 },
      savings: { vsAnggaran: 13.7 },
      waktuProses: { pembuatanPaket: 5, penyusunanHPS: 8, pl: 12, tender: 21 },
      realisasi: [
        { month: 'Jan', realisasi: 32, pk: 14 }, { month: 'Feb', realisasi: 38, pk: 12 },
        { month: 'Mar', realisasi: 35, pk: 15 }, { month: 'Apr', realisasi: 28, pk: 11 },
        { month: 'Mei', realisasi: 42, pk: 16 }, { month: 'Jun', realisasi: 39, pk: 14 },
        { month: 'Jul', realisasi: 48, pk: 17 }, { month: 'Agu', realisasi: 52, pk: 18 },
        { month: 'Sep', realisasi: 45, pk: 15 }, { month: 'Okt', realisasi: 50, pk: 16 },
        { month: 'Nov', realisasi: 47, pk: 14 }, { month: 'Des', realisasi: 44, pk: 13 }
      ],
      metodePemilihan: { tender: 285, pl: 153 },
      plantList: [
        { name: 'PG MKSO Kediri', pr: 85, pk: 42, nilai: '15.2M' },
        { name: 'PG Cirebon', pr: 72, pk: 38, nilai: '12.8M' },
        { name: 'PG Gempolkrep', pr: 68, pk: 35, nilai: '11.5M' },
        { name: 'PG Madukismo', pr: 61, pk: 30, nilai: '9.8M' },
        { name: 'PG Pesantren Baru', pr: 55, pk: 28, nilai: '8.2M' }
      ]
    })
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchData)
watch(() => [filters.year, filters.periodType, filters.sumberDana], fetchData)
watch(() => filters.plantCategory, () => { currentPage.value = 1 })

// ── Formatters ──
function formatNumber(n: number): string {
  return n?.toLocaleString('id-ID') ?? '0'
}
function formatCompactNumber(n: number): string {
  if (!n) return '0'
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

function formatCurrency(n: number): string {
  if (!n) return '0.00'
  return n.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── KPI cards ──
const kpiCards = computed(() => [
  { iconName: 'clipboard', label: 'Jumlah PR', value: formatNumber(data.totalPR), change: `${data.plantStats?.pg || 33} PG`, sub: `Last month total ${data.plantStats?.mkso || 16} MKSO`, changeDir: 'up', iconBg: 'rgba(91,117,83,0.12)' },
  { iconName: 'package', label: 'Jumlah PK', value: formatNumber(data.totalPK), change: `${formatNumber(data.totalPP)} PP`, sub: `Last month total ${formatNumber(data.totalSPPBJ)} SPPBJ`, changeDir: 'up', iconBg: 'rgba(168,139,97,0.15)' },
  { iconName: 'coins', label: 'Nilai PK', value: formatCompactNumber(data.totalNilai), change: `Saving ${data.savings?.vsAnggaran?.toFixed(1) || '0'}%`, sub: `vs Anggaran TA ${filters.year}`, changeDir: 'up', iconBg: 'rgba(139,160,130,0.15)' }
])

// ── Waktu Proses ──
const waktuProsesList = computed(() => [
  { iconName: 'file', label: 'Pembuatan Paket', value: data.waktuProses?.pembuatanPaket || '3', bgColor: 'rgba(91,117,83,0.1)' },
  { iconName: 'dollar', label: 'Penyusunan HPS', value: data.waktuProses?.penyusunanHPS || '3', bgColor: 'rgba(168,139,97,0.12)' },
  { iconName: 'handshake', label: 'Pemilihan Penyedia', value: '-', bgColor: 'rgba(139,160,130,0.12)' },
  { iconName: 'building', label: 'PL (Penunjukan Langsung)', value: data.waktuProses?.pl || '5', bgColor: 'rgba(120,140,110,0.12)' },
  { iconName: 'trophy', label: 'Tender', value: data.waktuProses?.tender || '17', bgColor: 'rgba(182,152,113,0.12)' }
])

// ── Donut legend ──
const donutLegend = computed(() => {
  const m = data.metodePemilihan
  if (!m) return []
  // Handle both formats: object with count property or direct number
  const tenderCount = typeof m.tender === 'object' ? m.tender?.count || 0 : m.tender || 0
  const plCount = typeof m.pl === 'object' ? m.pl?.count || 0 : m.pl || 0
  return [
    { label: 'Tender', value: tenderCount, color: '#5b7553' },
    { label: 'PL', value: plCount, color: '#a88b61' }
  ]
})
const donutSeries = computed(() => donutLegend.value.map(l => l.value))

// ── Plant list ──
const plantList = computed(() => data.plantList || [])

// ── Chart Options ──
const barChartOptions = computed(() => {
  const isDark = currentTheme.value === 'dark'
  const textColor = isDark ? '#9aa09a' : '#9ca3af'
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
  return {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'Inter, sans-serif', background: 'transparent' },
    theme: { mode: currentTheme.value },
    colors: ['#b6c6a6', '#4a5d4a'],
    plotOptions: { bar: { columnWidth: '55%', borderRadius: 5, borderRadiusApplication: 'end' } },
    dataLabels: { enabled: false },
    grid: { borderColor: gridColor, strokeDashArray: 4, xaxis: { lines: { show: false } } },
    xaxis: {
      categories: (data.realisasi || []).map((r: any) => r.month),
      axisBorder: { show: false }, axisTicks: { show: false },
      labels: { style: { colors: textColor, fontSize: '11px' } }
    },
    yaxis: [
      { labels: { style: { colors: textColor, fontSize: '11px' } } },
      { opposite: true, labels: { style: { colors: textColor, fontSize: '11px' } } }
    ],
    tooltip: { theme: currentTheme.value },
    legend: { show: false }
  }
})

const barSeries = computed(() => {
  // Use API data or fallback to mock data
  const realisasiData = (data.realisasi && data.realisasi.length > 0) ? data.realisasi : [
    { month: 'Jan', realisasi: 30, pk: 25 }, { month: 'Feb', realisasi: 40, pk: 35 },
    { month: 'Mar', realisasi: 35, pk: 30 }, { month: 'Apr', realisasi: 50, pk: 45 },
    { month: 'May', realisasi: 49, pk: 42 }, { month: 'Jun', realisasi: 60, pk: 55 },
    { month: 'Jul', realisasi: 70, pk: 65 }, { month: 'Aug', realisasi: 91, pk: 85 },
    { month: 'Sep', realisasi: 125, pk: 110 }, { month: 'Oct', realisasi: 100, pk: 95 },
    { month: 'Nov', realisasi: 80, pk: 75 }, { month: 'Dec', realisasi: 70, pk: 65 }
  ]
  return [
    { name: 'Realisasi', type: 'bar', data: realisasiData.map((r: any) => r.realisasi || r.sppbj_count || 0) },
    { name: 'Jumlah PK', type: 'line', data: realisasiData.map((r: any) => r.pk || r.pk_count || 0) }
  ]
})

const donutOptions = computed(() => ({
  chart: { type: 'donut', background: 'transparent' },
  theme: { mode: currentTheme.value },
  colors: ['#5b7553', '#a88b61', '#8ba882', '#c4a87a'],
  plotOptions: { pie: { donut: { size: '70%' } } },
  dataLabels: { enabled: false },
  stroke: { show: false },
  legend: { show: false },
  tooltip: { theme: currentTheme.value }
}))

// ── Export Functions ──
const isExporting = ref(false)

async function exportPDF() {
  if (isExporting.value) return
  isExporting.value = true
  
  try {
    const response = await fetch('/api/pdf/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Laporan Pengadaan SGN',
        period: { year: filters.year, type: filters.periodType },
        filters: {
          sumberDana: filters.sumberDana || undefined,
          kategoriPlant: filters.plant !== 'All' ? filters.plant : undefined
        },
        reportType: 'dashboard'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `HTTP ${response.status}`)
    }

    const blob = await response.blob()
    if (blob.type.includes('html') || blob.size < 100) {
      throw new Error('Server returned invalid PDF')
    }
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Laporan_Pengadaan_${filters.year}_${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

  } catch (error) {
    console.error('PDF export error:', error)
    alert('Gagal export PDF: ' + (error as Error).message)
  } finally {
    isExporting.value = false
  }
}

async function captureDashboard() {
  if (isExporting.value) return
  isExporting.value = true
  
  try {
    const response = await fetch('/api/pdf/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: window.location.origin,
        filters: {
          year: filters.year,
          periodType: filters.periodType,
          sumberDana: filters.sumberDana,
          kategoriPlant: filters.plant !== 'All' ? filters.plant : undefined
        },
        title: 'Dashboard Procurement Report'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(errorText || `HTTP ${response.status}`)
    }

    const blob = await response.blob()
    if (blob.type.includes('html') || blob.size < 100) {
      throw new Error('Server returned invalid PDF. Puppeteer may not be installed.')
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
    console.error('Dashboard capture error:', error)
    alert('Gagal capture dashboard: ' + (error as Error).message)
  } finally {
    isExporting.value = false
  }
}
</script>

<style scoped>
/* ═══ Paperpillar Design Tokens ═══ */
.pp-page {
  --pp-card: #ffffff;
  --pp-ink: #1a1d1a;
  --pp-muted: #7a7f7a;
  --pp-sage: #5b7553;
  --pp-olive: #4a5d4a;
  --pp-sand: #a88b61;
  --pp-cream: #f0ede8;
  --pp-border: rgba(0,0,0,0.05);
  --pp-font: 'Inter', 'Source Sans 3', system-ui, sans-serif;
}

/* Override parent page background for Paperpillar warmth */
:global(.page):has(.pp-page) {
  background: #f7f5f0 !important;
}

:global(body[data-theme="dark"] .page):has(.pp-page) {
  background: #161a16 !important;
}

/* ── Soft white card ── */
.pp-card {
  background: var(--pp-card);
  border: 1px solid var(--pp-border);
  border-radius: 20px;
  padding: 24px 26px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.02);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.pp-card:hover {
  box-shadow: 0 2px 6px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.05);
}

/* ── Dark mode: override all CSS variables at root ── */
:global(body[data-theme="dark"] .pp-page) {
  --pp-card: #242824;
  --pp-ink: #e8ece8;
  --pp-muted: #b4bcb4;
  --pp-sage: #7aaa72;
  --pp-olive: #6a8a6a;
  --pp-sand: #c8a881;
  --pp-cream: #1c2120;
  --pp-border: rgba(255,255,255,0.07);
}

/* ── Dark mode explicit overrides ── */
:global(body[data-theme="dark"] .pp-card) {
  background: #242824 !important;
  border-color: rgba(255,255,255,0.07) !important;
}

:global(body[data-theme="dark"] .pp-card:hover) {
  box-shadow: 0 6px 24px rgba(0,0,0,0.25);
}

:global(body[data-theme="dark"] .pp-pill) {
  background: #2a2f2c !important;
  border-color: rgba(255,255,255,0.07) !important;
}

/* ── Dark mode: text visibility ── */
:global(body[data-theme="dark"] .pp-page) {
  color: #e8ece8;
}

/* ── Dark mode: badge colors ── */
:global(body[data-theme="dark"] .pp-page .bg-green-100) {
  background-color: rgba(74, 139, 80, 0.25) !important;
}
:global(body[data-theme="dark"] .pp-page .text-green-700) {
  color: #7dce85 !important;
}
:global(body[data-theme="dark"] .pp-page .bg-red-100) {
  background-color: rgba(185, 50, 50, 0.25) !important;
}
:global(body[data-theme="dark"] .pp-page .text-red-600) {
  color: #f08080 !important;
}

/* ── Title ── */
.pp-title {
  font-family: var(--font-display, 'Space Grotesk', sans-serif) !important;
  font-size: 1.35rem !important;
  font-weight: 700 !important;
  color: var(--pp-ink) !important;
  margin: 0 0 4px !important;
  line-height: 1.3 !important;
}

/* ── Pill button / select ── */
.pp-pill {
  padding: 9px 16px;
  border-radius: 999px;
  border: 1px solid var(--pp-border);
  background: var(--pp-card);
  font-size: 0.8rem;
  color: var(--pp-ink);
  outline: none;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.pp-pill:focus {
  border-color: var(--pp-sage);
  box-shadow: 0 0 0 3px rgba(91,117,83,0.12);
}

/* ── Small action btn ── */
.pp-pg-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 12px;
  border: none;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.15s;
}

.pp-pg-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

/* ── Fallback Tailwind Utilities ── */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.flex-wrap { flex-wrap: wrap; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-center { justify-content: center; }
.flex-1 { flex: 1; }

.grid { display: grid; }
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
@media (min-width: 768px) {
  .md\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .md\:flex-row { flex-direction: row; }
  .md\:items-center { align-items: center; }
}
@media (min-width: 1024px) {
  .lg\:grid-cols-\[1fr_380px\] { grid-template-columns: 1fr 380px; }
  .lg\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.gap-1 { gap: 0.25rem; }
.gap-1\.5 { gap: 0.375rem; }
.gap-2 { gap: 0.5rem; }
.gap-2\.5 { gap: 0.625rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.gap-5 { gap: 1.25rem; }
.gap-6 { gap: 1.5rem; }
.gap-x-4 { column-gap: 1rem; }
.gap-y-1 { row-gap: 0.25rem; }

.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.py-8 { padding-top: 2rem; padding-bottom: 2rem; }
.px-1\.5 { padding-left: 0.375rem; padding-right: 0.375rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
.py-0\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
.py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mt-0\.5 { margin-top: 0.125rem; }
.mt-2 { margin-top: 0.5rem; }
.mx-auto { margin-left: auto; margin-right: auto; }

.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
.text-2xl { font-size: 1.5rem; line-height: 2rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.font-bold { font-weight: 700; }
.font-semibold { font-weight: 600; }
.font-medium { font-weight: 500; }

.w-full { width: 100%; }
.max-w-\[1380px\] { max-width: 1380px; }
.w-2 { width: 0.5rem; } .h-2 { height: 0.5rem; }
.w-2\.5 { width: 0.625rem; } .h-2\.5 { height: 0.625rem; }
.w-[42px] { width: 42px; } .h-[42px] { height: 42px; }
.w-[38px] { width: 38px; } .h-[38px] { height: 38px; }
.w-[34px] { width: 34px; } .h-[34px] { height: 34px; }
.w-[30px] { width: 30px; } .h-[30px] { height: 30px; }
.w-[200px] { width: 200px; }
.rounded-full { border-radius: 9999px; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-\[14px\] { border-radius: 14px; }
.rounded-sm { border-radius: 0.125rem; }
.border-b { border-bottom-width: 1px; }

.relative { position: relative; }
.absolute { position: absolute; }
.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.right-1 { right: 0.25rem; }

.pointer-events-none { pointer-events: none; }
.cursor-pointer { cursor: pointer; }
.cursor-default { cursor: default; }

.overflow-y-auto { overflow-y: auto; }
.max-h-\[200px\] { max-height: 200px; }
.inline-block { display: inline-block; }
.inline-flex { display: inline-flex; }

/* Colors that aren't variables */
.bg-transparent { background-color: transparent; }
.bg-\[\#b91c1c\] { background-color: #b91c1c; }
.bg-\[\#1e3a2f\] { background-color: #1e3a2f; }
.bg-\[\#b6c6a6\] { background-color: #b6c6a6; }
.bg-\[\#4a5d4a\] { background-color: #4a5d4a; }
.bg-green-100 { background-color: #dcfce7; }
.bg-red-100 { background-color: #fee2e2; }
.text-green-700 { color: #15803d; }
.text-red-600 { color: #dc2626; }
.text-white { color: #fff; }
</style>
