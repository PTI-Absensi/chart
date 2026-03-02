<template>
  <div class="page animate-in">
    <!-- Header Section -->
    <section class="hero">
      <div class="hero-inner">
        <div class="eyebrow">Dashboard</div>
        <h1>Laporan Pengadaan SGN</h1>
        <p class="lead">Ringkasan metrik dan performa pengadaan PT. Surya Ganda Nusantara</p>
        <div class="hero-tags">
          <span class="tag">Tahun {{ filters.year }}</span>
          <span class="tag">{{ filters.periodType === 'calendar' ? 'Kalender' : 'Anggaran' }}</span>
          <span class="tag" v-if="filters.sumberDana">{{ filters.sumberDana }}</span>
        </div>
      </div>
    </section>

    <!-- Filters & Actions -->
    <section class="card panel">
      <div class="panel-header">
        <div>
          <h2>Filter Data</h2>
          <p class="muted">Sesuaikan periode dan sumber dana</p>
        </div>
        <div class="panel-actions">
          <PdfExportButton 
            :year="filters.year"
            :period-type="filters.periodType"
            :sumber-dana="filters.sumberDana"
            title="Laporan Pengadaan SGN"
          />
        </div>
      </div>
      
      <div class="filter-grid">
        <div class="field">
          <label>Tipe Tahun</label>
          <select v-model="filters.periodType">
            <option value="calendar">Tahun Kalender</option>
            <option value="fiscal">Tahun Anggaran</option>
          </select>
        </div>
        <div class="field">
          <label>Tahun Anggaran</label>
          <select v-model="filters.year">
            <option :value="2024">2024</option>
            <option :value="2025">2025</option>
            <option :value="2026">2026</option>
          </select>
        </div>
        <div class="field">
          <label>Sumber Dana</label>
          <select v-model="filters.sumberDana">
            <option value="">Semua Dana</option>
            <option value="eksploitasi">Eksploitasi</option>
            <option value="investasi">Investasi</option>
          </select>
        </div>
        <div class="field">
          <label>&nbsp;</label>
          <button class="refresh-btn" @click="loadData" :disabled="loading">
            <span v-if="loading">Loading...</span>
            <span v-else>Refresh Data</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Loading State -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Memuat data...</p>
    </div>

    <!-- KPI Cards -->
    <section class="card panel" v-if="!loading">
      <div class="panel-header">
        <h2>Key Performance Indicators</h2>
        <span class="last-update">Last Update: {{ data.lastUpdate }}</span>
      </div>
      <div class="kpi-grid">
        <div class="kpi-card plant-count">
          <div class="kpi-subtitle">{{ data.plantStats?.pg || 33 }} PG</div>
          <div class="kpi-subtitle small">+{{ data.plantStats?.mkso || 16 }} MKSO</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ formatNumber(data.totalPR) }}</div>
          <div class="kpi-label">Jumlah PR</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ formatNumber(data.totalPK) }}</div>
          <div class="kpi-label">Jumlah PK</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ formatNumber(data.totalPP) }}</div>
          <div class="kpi-label">Jumlah PP</div>
        </div>
        <div class="kpi-card highlight">
          <div class="kpi-value">{{ formatCompactNumber(data.totalNilai) }}</div>
          <div class="kpi-label">Nilai PK</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-value">{{ formatNumber(data.totalSPPBJ) }}</div>
          <div class="kpi-label">Jumlah SPPBJ</div>
        </div>
      </div>
    </section>

    <!-- Waktu Proses -->
    <section class="card panel" v-if="!loading">
      <div class="panel-header">
        <h2>Waktu Proses</h2>
        <p class="muted">Durasi proses dalam hari kerja</p>
      </div>
      <div class="waktu-proses-list">
        <div class="waktu-item">
          <div class="waktu-icon">📋</div>
          <div class="waktu-info">
            <span class="waktu-label">Pembuatan Paket</span>
            <span class="waktu-value">{{ data.waktuProses?.pembuatanPaket || '-' }} Hari</span>
          </div>
        </div>
        <div class="waktu-item">
          <div class="waktu-icon">💵</div>
          <div class="waktu-info">
            <span class="waktu-label">Penyusunan HPS</span>
            <span class="waktu-value">{{ data.waktuProses?.penyusunanHPS || '-' }} Hari</span>
          </div>
        </div>
        <div class="waktu-item">
          <div class="waktu-icon">🏢</div>
          <div class="waktu-info">
            <span class="waktu-label">PL (Penunjukan Langsung)</span>
            <span class="waktu-value">{{ data.waktuProses?.pl || '-' }} Hari</span>
          </div>
        </div>
        <div class="waktu-item">
          <div class="waktu-icon">🏆</div>
          <div class="waktu-info">
            <span class="waktu-label">Tender</span>
            <span class="waktu-value">{{ data.waktuProses?.tender || '-' }} Hari</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Saving Cards -->
    <section class="card panel" v-if="!loading">
      <div class="panel-header">
        <h2>Realisasi dan Saving</h2>
      </div>
      <div class="saving-cards">
        <div class="saving-card main">
          <div class="saving-header">
            <span class="saving-title">Saving terhadap Anggaran</span>
            <span class="saving-percent">{{ data.savings?.vsAnggaran?.toFixed(1) || '0.0' }}%</span>
          </div>
        </div>
        <div class="saving-card main">
          <div class="saving-value-large">{{ formatCompactNumber(data.savings?.nominalHPS) }}</div>
          <div class="saving-title">Saving Terhadap HPS</div>
          <div class="saving-percent-row">
            <span>{{ data.savings?.vsHPS?.toFixed(1) || '0.0' }}%</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Komposisi PK dan Metode Pemilihan -->
    <section class="card panel chart-panel" v-if="!loading">
      <div class="panel-header">
        <h2>Komposisi PK dan Metode Pemilihan</h2>
        <p class="muted">Dihitung berdasarkan paket selesai</p>
      </div>
      <div class="chart-row">
        <div class="chart-col">
          <apexchart 
            type="donut" 
            height="280"
            :options="metodeChartOptions"
            :series="metodeChartSeries"
          />
          <div class="chart-center-text">
            <div class="center-value">{{ data.metodePemilihan?.total || 438 }}</div>
            <div class="center-label">Total</div>
          </div>
        </div>
        <div class="metode-stats">
          <div class="metode-stat tender">
            <div class="metode-bar">
              <div class="metode-progress" :style="{ width: tenderPercent + '%' }"></div>
            </div>
            <div class="metode-info">
              <span class="metode-name">Tender</span>
              <span class="metode-value">{{ data.metodePemilihan?.tender?.count || 285 }}</span>
              <span class="metode-percent">{{ tenderPercent.toFixed(1) }}%</span>
              <span class="metode-nilai">{{ formatCompactNumber(data.metodePemilihan?.tender?.nilai || 202860000000) }}</span>
            </div>
          </div>
          <div class="metode-stat pl">
            <div class="metode-bar">
              <div class="metode-progress" :style="{ width: plPercent + '%' }"></div>
            </div>
            <div class="metode-info">
              <span class="metode-name">PL</span>
              <span class="metode-value">{{ data.metodePemilihan?.pl?.count || 153 }}</span>
              <span class="metode-percent">{{ plPercent.toFixed(1) }}%</span>
              <span class="metode-nilai">{{ formatCompactNumber(data.metodePemilihan?.pl?.nilai || 9320000000) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Charts - Nilai Realisasi per Kategori -->
    <section class="card panel chart-panel" v-if="!loading">
      <div class="panel-header">
        <h2>Nilai Realisasi dan Jumlah PK</h2>
        <p class="muted">Kantor Pusat dan Pabrik Gula</p>
      </div>
      <div class="chart-container">
        <apexchart 
          type="line" 
          height="300"
          :options="realisasiChartOptions"
          :series="realisasiChartSeries"
        />
      </div>
    </section>

    <!-- Chart MKSO -->
    <section class="card panel chart-panel" v-if="!loading">
      <div class="panel-header">
        <h2>Nilai Realisasi dan Jumlah PK</h2>
        <p class="muted">MKSO</p>
      </div>
      <div class="chart-container">
        <apexchart 
          type="line" 
          height="300"
          :options="mksoChartOptions"
          :series="mksoChartSeries"
        />
      </div>
    </section>

    <!-- Tabel Detail Plant -->
    <section class="card panel" v-if="!loading">
      <div class="panel-header">
        <h2>Detail per Plant</h2>
        <p class="muted">Total {{ data.plants?.length || 0 }} unit</p>
      </div>
      <div class="table-wrap">
        <table class="plant-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Plant</th>
              <th class="text-right">Jumlah PK</th>
              <th class="text-right">Nilai Realisasi</th>
              <th class="text-right">Saving %</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(plant, idx) in paginatedPlants" :key="plant.plant_code">
              <td>{{ (currentPage - 1) * perPage + idx + 1 }}</td>
              <td>
                <div class="plant-name">{{ plant.plant_name }}</div>
                <span class="category-badge" :class="plant.kategori?.toLowerCase()">
                  {{ plant.kategori }}
                </span>
              </td>
              <td class="text-right">{{ plant.jumlah_pk || 0 }}</td>
              <td class="text-right">{{ formatCurrency(plant.nilai_realisasi || 0) }}</td>
              <td class="text-right">
                <span class="saving-percent-cell" :class="getSavingClass(plant.saving_percent)">
                  {{ plant.saving_percent?.toFixed(2) || '0.00' }}%
                </span>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2"><strong>TOTAL</strong></td>
              <td class="text-right"><strong>{{ formatNumber(data.totalPK) }}</strong></td>
              <td class="text-right"><strong>{{ formatCurrency(data.totalNilai) }}</strong></td>
              <td class="text-right"><strong>{{ data.avgSaving?.toFixed(2) || '0.00' }}%</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <!-- Pagination -->
      <div class="pagination" v-if="totalPages > 1">
        <button 
          class="page-btn" 
          :disabled="currentPage === 1"
          @click="currentPage--"
        >← Prev</button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button 
          class="page-btn" 
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >Next →</button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="page-footer">
      <p>Dashboard SGN | Generated: {{ new Date().toLocaleString('id-ID') }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import PdfExportButton from '../components/PdfExportButton.vue'

const apexchart = VueApexCharts

interface PlantData {
  plant_code: string
  plant_name: string
  kategori: string
  jumlah_pk?: number
  nilai_realisasi?: number
  saving_percent?: number
}

interface DashboardData {
  totalPR: number
  totalPK: number
  totalPP: number
  totalSPPBJ: number
  totalNilai: number
  avgSaving?: number
  plantStats: {
    pg: number
    mkso: number
  }
  waktuProses: {
    pembuatanPaket: string
    penyusunanHPS: string
    pl: string
    tender: string
  }
  savings: {
    vsAnggaran: number
    vsHPS: number
    nominalHPS: number
  }
  metodePemilihan: {
    total: number
    tender: { count: number; nilai: number }
    pl: { count: number; nilai: number }
  }
  plants: PlantData[]
  lastUpdate: string
}

const loading = ref(false)
const currentPage = ref(1)
const perPage = 25

const filters = reactive({
  year: 2026,
  periodType: 'fiscal',
  sumberDana: ''
})

const data = ref<DashboardData>({
  totalPR: 0,
  totalPK: 0,
  totalPP: 0,
  totalSPPBJ: 0,
  totalNilai: 0,
  avgSaving: 0,
  plantStats: { pg: 33, mkso: 16 },
  waktuProses: {
    pembuatanPaket: '3',
    penyusunanHPS: '3',
    pl: '5',
    tender: '17'
  },
  savings: {
    vsAnggaran: 13.7,
    vsHPS: 8.3,
    nominalHPS: 11210000000
  },
  metodePemilihan: {
    total: 438,
    tender: { count: 285, nilai: 202860000000 },
    pl: { count: 153, nilai: 9320000000 }
  },
  plants: [],
  lastUpdate: '2025-11-18'
})

// Pagination
const totalPages = computed(() => Math.ceil((data.value.plants?.length || 0) / perPage))
const paginatedPlants = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return data.value.plants.slice(start, start + perPage)
})

// Chart percentages
const tenderPercent = computed(() => {
  const t = data.value.metodePemilihan?.tender?.count || 285
  const total = data.value.metodePemilihan?.total || 438
  return (t / total) * 100
})

const plPercent = computed(() => {
  const p = data.value.metodePemilihan?.pl?.count || 153
  const total = data.value.metodePemilihan?.total || 438
  return (p / total) * 100
})

// Chart Options - Metode Pemilihan Donut
const metodeChartSeries = computed(() => [
  data.value.metodePemilihan?.tender?.count || 285,
  data.value.metodePemilihan?.pl?.count || 153
])

const metodeChartOptions = computed(() => ({
  chart: {
    type: 'donut',
    fontFamily: 'inherit'
  },
  labels: ['Tender', 'PL'],
  colors: ['#3b82f6', '#f59e0b'],
  plotOptions: {
    pie: {
      donut: {
        size: '75%'
      }
    }
  },
  dataLabels: { enabled: false },
  legend: { show: false },
  stroke: { show: false },
  tooltip: {
    y: {
      formatter: (val: number) => val + ' PK'
    }
  }
}))

// Chart Realisasi HO/PG
const realisasiChartSeries = computed(() => [
  {
    name: 'Realisasi',
    type: 'column',
    data: [45, 52, 38, 41, 35, 48, 42, 55, 60, 50, 58, 45]
  },
  {
    name: 'Jumlah PK',
    type: 'line',
    data: [8, 12, 6, 9, 7, 11, 8, 14, 16, 12, 15, 10]
  }
])

const realisasiChartOptions = computed(() => ({
  chart: {
    type: 'line',
    fontFamily: 'inherit',
    toolbar: { show: false }
  },
  colors: ['#3b82f6', '#22c55e'],
  stroke: {
    width: [0, 3],
    curve: 'smooth'
  },
  plotOptions: {
    bar: {
      columnWidth: '50%'
    }
  },
  dataLabels: { enabled: false },
  xaxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    labels: { style: { colors: '#94a3b8' } }
  },
  yaxis: [
    {
      title: { text: 'Realisasi', style: { color: '#3b82f6' } },
      labels: { style: { colors: '#94a3b8' } }
    },
    {
      opposite: true,
      title: { text: 'Jumlah PK', style: { color: '#22c55e' } },
      labels: { style: { colors: '#94a3b8' } }
    }
  ],
  grid: {
    borderColor: 'rgba(148, 163, 184, 0.1)'
  },
  theme: { mode: 'dark' }
}))

// Chart MKSO
const mksoChartSeries = computed(() => [
  {
    name: 'Realisasi',
    type: 'column',
    data: [15, 22, 18, 25, 20, 28, 24, 30, 35, 28, 32, 25]
  },
  {
    name: 'Jumlah PK',
    type: 'line',
    data: [3, 5, 4, 6, 5, 7, 6, 8, 10, 7, 9, 6]
  }
])

const mksoChartOptions = computed(() => ({
  chart: {
    type: 'line',
    fontFamily: 'inherit',
    toolbar: { show: false }
  },
  colors: ['#a855f7', '#eab308'],
  stroke: {
    width: [0, 3],
    curve: 'smooth'
  },
  plotOptions: {
    bar: {
      columnWidth: '50%'
    }
  },
  dataLabels: { enabled: false },
  xaxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    labels: { style: { colors: '#94a3b8' } }
  },
  yaxis: [
    {
      title: { text: 'Realisasi', style: { color: '#a855f7' } },
      labels: { style: { colors: '#94a3b8' } }
    },
    {
      opposite: true,
      title: { text: 'Jumlah PK', style: { color: '#eab308' } },
      labels: { style: { colors: '#94a3b8' } }
    }
  ],
  grid: {
    borderColor: 'rgba(148, 163, 184, 0.1)'
  },
  theme: { mode: 'dark' }
}))

// Format functions
function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null) return '0'
  return num.toLocaleString('id-ID')
}

function formatCurrency(value: number | undefined): string {
  if (value === undefined || value === null) return 'Rp 0'
  return 'Rp ' + value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatCompactNumber(value: number | undefined): string {
  if (value === undefined || value === null) return '0'
  if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T'
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'M'
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'Jt'
  return value.toLocaleString('id-ID')
}

function getSavingClass(percent: number | undefined): string {
  if (!percent) return ''
  if (percent >= 10) return 'high'
  if (percent >= 5) return 'medium'
  return 'low'
}

// Load data
async function loadData() {
  loading.value = true
  currentPage.value = 1
  try {
    const params = new URLSearchParams()
    params.set('year', filters.year.toString())
    params.set('period_type', filters.periodType)
    if (filters.sumberDana) params.set('sumber_dana', filters.sumberDana)

    const response = await fetch(`/api/dashboard/summary?${params}`)
    if (!response.ok) throw new Error('Failed to load data')
    
    const result = await response.json()
    if (result.status === 'success') {
      data.value = { ...data.value, ...result.data }
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    loadMockData()
  } finally {
    loading.value = false
  }
}

function loadMockData() {
  // Generate 50 plants data
  const plants: PlantData[] = [
    { plant_code: 'HO01', plant_name: 'HO MKSO Tebu', kategori: 'HO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'HO02', plant_name: 'KANTOR PUSAT PT SGN', kategori: 'HO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK01', plant_name: 'Kebun Agroforestry', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK02', plant_name: 'Kebun Banyuwangi Raya', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK03', plant_name: 'Kebun Bone', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK04', plant_name: 'Kebun Bunga Mayang', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK05', plant_name: 'Kebun Camming', kategori: 'MKSO', jumlah_pk: 4, nilai_realisasi: 16372502832, saving_percent: 16.36 },
    { plant_code: 'MK06', plant_name: 'Kebun Cinta Manis 1', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK07', plant_name: 'Kebun Cinta Manis 2', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK08', plant_name: 'Kebun Dhoho', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK09', plant_name: 'Kebun Jateng', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK10', plant_name: 'Kebun Kalitelepak', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK11', plant_name: 'Kebun Kwala Madu', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK12', plant_name: 'Kebun Lumajang Raya', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK13', plant_name: 'Kebun Mumbul', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK14', plant_name: 'Kebun Sei Semayang', kategori: 'MKSO', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'MK15', plant_name: 'Kebun Takalar', kategori: 'MKSO', jumlah_pk: 2, nilai_realisasi: 5703009115, saving_percent: 5.69 },
    { plant_code: 'PG01', plant_name: 'PG ASSEMBAGOES', kategori: 'PG', jumlah_pk: 14, nilai_realisasi: 4034594253, saving_percent: 3.62 },
    { plant_code: 'PG02', plant_name: 'PG BONE', kategori: 'PG', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'PG03', plant_name: 'PG BUNGA MAYANG', kategori: 'PG', jumlah_pk: 1, nilai_realisasi: 2990340000, saving_percent: 2.75 },
    { plant_code: 'PG04', plant_name: 'PG CAMMING', kategori: 'PG', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'PG05', plant_name: 'PG CINTA MANIS', kategori: 'PG', jumlah_pk: 3, nilai_realisasi: 1986162110, saving_percent: 1.78 },
    { plant_code: 'PG06', plant_name: 'PG DJATIROTO', kategori: 'PG', jumlah_pk: 17, nilai_realisasi: 9473293512, saving_percent: 8.26 },
    { plant_code: 'PG07', plant_name: 'PG DJOMBANG BARU', kategori: 'PG', jumlah_pk: 7, nilai_realisasi: 4369292559, saving_percent: 3.88 },
    { plant_code: 'PG08', plant_name: 'PG GEMPOLKREP', kategori: 'PG', jumlah_pk: 20, nilai_realisasi: 8657022147, saving_percent: 7.77 },
    { plant_code: 'PG09', plant_name: 'PG GENDING', kategori: 'PG', jumlah_pk: 6, nilai_realisasi: 4069941626, saving_percent: 3.67 },
    { plant_code: 'PG10', plant_name: 'PG KEDAWOENG', kategori: 'PG', jumlah_pk: 7, nilai_realisasi: 2844547551, saving_percent: 2.64 },
    { plant_code: 'PG11', plant_name: 'PG KREMBOONG', kategori: 'PG', jumlah_pk: 8, nilai_realisasi: 3546713512, saving_percent: 3.17 },
    { plant_code: 'PG12', plant_name: 'PG KWALA MADU', kategori: 'PG', jumlah_pk: 3, nilai_realisasi: 270099117, saving_percent: 0.26 },
    { plant_code: 'PG13', plant_name: 'PG LESTARI', kategori: 'PG', jumlah_pk: 7, nilai_realisasi: 1146783311, saving_percent: 1.11 },
    { plant_code: 'PG14', plant_name: 'PG MERITJAN', kategori: 'PG', jumlah_pk: 6, nilai_realisasi: 4836458477, saving_percent: 4.54 },
    { plant_code: 'PG15', plant_name: 'PG MOJOPANGGOONG', kategori: 'PG', jumlah_pk: 7, nilai_realisasi: 5375612392, saving_percent: 4.81 },
    { plant_code: 'PG16', plant_name: 'PG MOJO', kategori: 'PG', jumlah_pk: 5, nilai_realisasi: 1582564127, saving_percent: 1.41 },
    { plant_code: 'PG17', plant_name: 'PG NGADIREDJO', kategori: 'PG', jumlah_pk: 12, nilai_realisasi: 6924413254, saving_percent: 6.01 },
    { plant_code: 'PG18', plant_name: 'PG PAGOTTAN', kategori: 'PG', jumlah_pk: 7, nilai_realisasi: 3691503885, saving_percent: 3.35 },
    { plant_code: 'PG19', plant_name: 'PG PANDJIE', kategori: 'PG', jumlah_pk: 6, nilai_realisasi: 2287653102, saving_percent: 1.97 },
    { plant_code: 'PG20', plant_name: 'PG PESANTREN BARU', kategori: 'PG', jumlah_pk: 15, nilai_realisasi: 8471896403, saving_percent: 7.67 },
    { plant_code: 'PG21', plant_name: 'PG POERWODADIE', kategori: 'PG', jumlah_pk: 10, nilai_realisasi: 3802467673, saving_percent: 3.38 },
    { plant_code: 'PG22', plant_name: 'PG PRADJEKAN', kategori: 'PG', jumlah_pk: 9, nilai_realisasi: 3698530480, saving_percent: 3.23 },
    { plant_code: 'PG23', plant_name: 'PG REDJOSARIE', kategori: 'PG', jumlah_pk: 13, nilai_realisasi: 2341183442, saving_percent: 2.24 },
    { plant_code: 'PG24', plant_name: 'PG RENDENG', kategori: 'PG', jumlah_pk: 8, nilai_realisasi: 850126343, saving_percent: 0.77 },
    { plant_code: 'PG25', plant_name: 'PG SEI SEMAYANG', kategori: 'PG', jumlah_pk: 0, nilai_realisasi: 0, saving_percent: 0 },
    { plant_code: 'PG26', plant_name: 'PG SEMBORO', kategori: 'PG', jumlah_pk: 18, nilai_realisasi: 7764236636, saving_percent: 7.26 },
    { plant_code: 'PG27', plant_name: 'PG SOEDHONO', kategori: 'PG', jumlah_pk: 7, nilai_realisasi: 3539315349, saving_percent: 3.31 },
    { plant_code: 'PG28', plant_name: 'PG SRAGI', kategori: 'PG', jumlah_pk: 5, nilai_realisasi: 1832284664, saving_percent: 1.71 },
    { plant_code: 'PG29', plant_name: 'PG TAKALAR', kategori: 'PG', jumlah_pk: 2, nilai_realisasi: 1382143021, saving_percent: 1.28 },
    { plant_code: 'PG30', plant_name: 'PG TJOEKIR', kategori: 'PG', jumlah_pk: 6, nilai_realisasi: 2956439481, saving_percent: 2.70 },
    { plant_code: 'PG31', plant_name: 'PG WONOLANGAN', kategori: 'PG', jumlah_pk: 15, nilai_realisasi: 4120858596, saving_percent: 3.78 },
    { plant_code: 'PG32', plant_name: 'PG WRINGIN ANOM', kategori: 'PG', jumlah_pk: 2, nilai_realisasi: 1495583180, saving_percent: 1.21 },
    { plant_code: 'PG33', plant_name: 'PT INDUSTRI GULA GLENMORE', kategori: 'PG', jumlah_pk: 6, nilai_realisasi: 2829811542, saving_percent: 2.27 },
  ]

  data.value = {
    totalPR: 622,
    totalPK: 258,
    totalPP: 276,
    totalSPPBJ: 227,
    totalNilai: 135247383633.39,
    avgSaving: 124.03,
    plantStats: { pg: 33, mkso: 16 },
    waktuProses: {
      pembuatanPaket: '3',
      penyusunanHPS: '3',
      pl: '5',
      tender: '17'
    },
    savings: {
      vsAnggaran: 13.7,
      vsHPS: 8.3,
      nominalHPS: 11210000000
    },
    metodePemilihan: {
      total: 438,
      tender: { count: 285, nilai: 202860000000 },
      pl: { count: 153, nilai: 9320000000 }
    },
    plants: plants,
    lastUpdate: '2025-11-18'
  }
}

watch(filters, () => {
  loadData()
}, { deep: true })

onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* Layout */
.page {
  display: grid;
  gap: 20px;
  padding-bottom: 40px;
}

.hero {
  position: relative;
  z-index: 1;
  padding: 40px 0 16px;
}

.hero-inner {
  max-width: 780px;
}

.eyebrow {
  font-size: 0.85rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 600;
  margin-bottom: 8px;
}

h1 {
  font-family: var(--font-display);
  font-size: clamp(2rem, 3vw + 1rem, 3rem);
  margin: 0 0 8px;
  line-height: 1.1;
}

.lead {
  font-size: 1.05rem;
  color: var(--muted);
  margin: 0 0 16px;
}

.hero-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tag {
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: var(--accent);
  font-weight: 600;
  font-size: 0.85rem;
}

/* Card & Panel */
.card.panel {
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  border: 1px solid var(--stroke);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px 20px 24px;
  backdrop-filter: blur(8px);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.panel-header h2 {
  font-family: var(--font-display);
  font-size: 1.3rem;
  margin: 0 0 4px;
}

.last-update {
  font-size: 0.8rem;
  color: var(--muted);
}

.panel-header p {
  margin: 0;
  color: var(--muted);
}

.panel-actions {
  display: flex;
  gap: 12px;
}

.muted {
  color: var(--muted);
}

/* Filter Grid */
.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-weight: 600;
  color: var(--ink);
  font-size: 0.9rem;
}

select {
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--stroke);
  background: var(--surface);
  color: var(--ink);
  font-size: 0.98rem;
  font-family: var(--font-body);
  cursor: pointer;
}

.refresh-btn {
  padding: 10px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--stroke);
  background: var(--accent);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading */
.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* KPI Grid */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.kpi-card {
  background: color-mix(in srgb, var(--surface) 95%, transparent);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-sm);
  padding: 16px;
  text-align: center;
  transition: transform 0.2s;
}

.kpi-card:hover {
  transform: translateY(-2px);
}

.kpi-card.plant-count {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.kpi-card.highlight {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(37, 99, 235, 0.1));
  border-color: rgba(59, 130, 246, 0.3);
}

.kpi-subtitle {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ink);
}

.kpi-subtitle.small {
  font-size: 0.85rem;
  color: var(--muted);
}

.kpi-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 4px;
}

.kpi-card.highlight .kpi-value {
  color: #60a5fa;
}

.kpi-label {
  font-size: 0.75rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Waktu Proses */
.waktu-proses-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.waktu-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: color-mix(in srgb, var(--surface) 95%, transparent);
  border-radius: var(--radius-sm);
  border: 1px solid var(--stroke);
}

.waktu-icon {
  font-size: 20px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 10px;
}

.waktu-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.waktu-label {
  font-weight: 500;
  color: var(--ink);
}

.waktu-value {
  font-weight: 600;
  color: var(--accent);
}

/* Saving Cards */
.saving-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.saving-card {
  background: color-mix(in srgb, var(--surface) 95%, transparent);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-sm);
  padding: 20px;
}

.saving-card.main {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.saving-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.saving-title {
  font-size: 0.9rem;
  color: var(--muted);
}

.saving-percent {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
}

.saving-value-large {
  font-size: 1.8rem;
  font-weight: 700;
  color: #22c55e;
}

.saving-percent-row {
  font-size: 1.2rem;
  color: #22c55e;
  font-weight: 600;
}

/* Chart Panel */
.chart-panel {
  position: relative;
}

.chart-row {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: center;
}

.chart-col {
  position: relative;
  display: flex;
  justify-content: center;
}

.chart-center-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.center-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--ink);
}

.center-label {
  font-size: 0.8rem;
  color: var(--muted);
}

.metode-stats {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.metode-stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metode-bar {
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  overflow: hidden;
}

.metode-progress {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.metode-stat.tender .metode-progress {
  background: #3b82f6;
}

.metode-stat.pl .metode-progress {
  background: #f59e0b;
}

.metode-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.metode-name {
  font-weight: 600;
  color: var(--ink);
  min-width: 80px;
}

.metode-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ink);
}

.metode-percent {
  color: #22c55e;
  font-weight: 600;
}

.metode-nilai {
  color: var(--muted);
  font-size: 0.9rem;
}

.chart-container {
  min-height: 300px;
}

/* Table */
.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--stroke);
  border-radius: var(--radius-sm);
}

.plant-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.plant-table th {
  background: var(--surface-alt);
  color: var(--ink);
  font-weight: 600;
  font-size: 0.75rem;
  padding: 12px 16px;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--stroke);
}

.plant-table td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--stroke);
}

.plant-table tr:hover {
  background: color-mix(in srgb, var(--accent) 5%, transparent);
}

.plant-table tfoot {
  background: var(--surface-alt);
}

.plant-name {
  font-weight: 500;
  color: var(--ink);
  margin-bottom: 4px;
}

.text-right {
  text-align: right;
}

/* Badges */
.category-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

.category-badge.pg {
  background: rgba(59, 130, 246, 0.15);
  color: #60a5fa;
}

.category-badge.mkso {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
}

.category-badge.ho {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
}

.saving-percent-cell {
  font-weight: 600;
}

.saving-percent-cell.high {
  color: #22c55e;
}

.saving-percent-cell.medium {
  color: #f59e0b;
}

.saving-percent-cell.low {
  color: #ef4444;
}

.total-row {
  font-weight: 700;
  background: var(--surface-alt);
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--stroke);
}

.page-btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--stroke);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: var(--accent);
  color: white;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: var(--muted);
  font-size: 0.9rem;
}

/* Footer */
.page-footer {
  text-align: center;
  padding: 20px 0;
  color: var(--muted);
  font-size: 0.85rem;
  border-top: 1px solid var(--stroke);
}

/* Responsive */
@media (max-width: 768px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
  
  .kpi-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .chart-row {
    grid-template-columns: 1fr;
  }
  
  .panel-header {
    flex-direction: column;
  }
  
  .waktu-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
