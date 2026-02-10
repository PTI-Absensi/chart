3<template>
  <div class="page animate-in">
    <header class="page-header">
      <div>
        <h1>Chart Builder</h1>
        <p class="muted">Buat konfigurasi chart dari data source.</p>
      </div>
    </header>

    <section class="card panel">
      <h2>Chart Baru</h2>
      <form class="form-grid" @submit.prevent="createChart">
        <label>
          Nama Chart
          <input v-model="form.name" type="text" required />
        </label>
        <label>
          Source
          <select v-model="form.source_id" required>
            <option disabled value="">Pilih source</option>
            <option v-for="source in sources" :key="source.id" :value="source.id">
              {{ source.name }}
            </option>
          </select>
        </label>
        <label>
          Dimensi (x)
          <input v-model="form.dimension" type="text" placeholder="contoh: tanggal" />
        </label>
        <label>
          Metric (y)
          <input v-model="form.metric" type="text" placeholder="contoh: total_nilai" />
        </label>
        <label>
          Tipe Chart
          <select v-model="form.type">
            <option value="line">Line</option>
            <option value="area">Area</option>
            <option value="bar">Bar</option>
          </select>
        </label>
        <button type="submit">Simpan Chart</button>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </section>

    <section class="card panel">
      <div class="panel-header">
        <h2>Daftar Chart</h2>
        <button class="ghost" type="button" @click="loadCharts">Refresh</button>
      </div>
      <div v-if="charts.length === 0" class="empty">Belum ada chart.</div>
      <div class="chart-list">
        <div v-for="chart in charts" :key="chart.id" class="chart-item">
          <div>
            <strong>{{ chart.name }}</strong>
            <div class="meta">{{ chart.type }} • {{ chart.dimension }} → {{ chart.metric }}</div>
          </div>
          <div class="actions">
            <button class="ghost" type="button" @click="exportChart(chart.id)">Export</button>
            <button class="ghost danger" type="button" @click="deleteChart(chart.id)">Hapus</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiFetch, buildApiUrl } from '../utils/api'

type Source = { id: string; name: string }
type Chart = {
  id: string
  name: string
  type: string
  dimension: string
  metric: string
}

const sources = ref<Source[]>([])
const charts = ref<Chart[]>([])
const error = ref('')

const form = ref({
  name: '',
  source_id: '',
  dimension: '',
  metric: '',
  type: 'line'
})

const loadSources = async () => {
  const res = await apiFetch('/sources')
  const json = await res.json()
  sources.value = json.data || []
}

const loadCharts = async () => {
  const res = await apiFetch('/charts')
  const json = await res.json()
  charts.value = json.data || []
}

const createChart = async () => {
  error.value = ''
  const res = await apiFetch('/charts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form.value)
  })
  const json = await res.json()
  if (!res.ok || json.status !== 'success') {
    error.value = json.detail || 'Gagal membuat chart.'
    return
  }
  form.value = { name: '', source_id: '', dimension: '', metric: '', type: 'line' }
  await loadCharts()
}

const deleteChart = async (id: string) => {
  await apiFetch(`/charts/${id}`, { method: 'DELETE' })
  await loadCharts()
}

const exportChart = async (id: string) => {
  window.open(buildApiUrl(`/exports/chart/${id}`), '_blank')
}

onMounted(() => {
  loadSources()
  loadCharts()
})
</script>

<style scoped>
.page {
  display: grid;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.muted {
  color: var(--muted);
}

.card.panel {
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: 18px;
  padding: 18px;
  box-shadow: var(--shadow-soft);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-weight: 600;
}

input,
select {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  color: var(--ink);
}

button {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: var(--accent);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.chart-list {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.chart-item {
  border: 1px solid var(--stroke);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.meta {
  color: var(--muted);
}

.actions {
  display: flex;
  gap: 8px;
}

.ghost {
  background: transparent;
  color: var(--ink);
}

.danger {
  color: #c33;
}

.error {
  color: #d9482f;
}

.empty {
  color: var(--muted);
  padding: 12px 0;
}

@media (max-width: 840px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
