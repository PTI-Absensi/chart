<template>
  <div class="page animate-in">
    <header class="page-header">
      <div>
        <h1>Dashboards</h1>
        <p class="muted">Susun chart ke dalam layout sederhana.</p>
      </div>
    </header>

    <section class="card panel">
      <h2>Dashboard Baru</h2>
      <form class="form-row" @submit.prevent="createDashboard">
        <input v-model="newName" type="text" placeholder="Nama dashboard" />
        <button type="submit">Buat</button>
      </form>
    </section>

    <section class="card panel">
      <div class="panel-header">
        <h2>Daftar Dashboard</h2>
        <button class="ghost" type="button" @click="loadDashboards">Refresh</button>
      </div>
      <div v-if="dashboards.length === 0" class="empty">Belum ada dashboard.</div>
      <div class="dashboard-list">
        <button
          v-for="dash in dashboards"
          :key="dash.id"
          class="dashboard-item"
          :class="{ active: dash.id === activeDashboard?.id }"
          type="button"
          @click="selectDashboard(dash)"
        >
          <strong>{{ dash.name }}</strong>
          <span class="meta">{{ formatDate(dash.created_at) }}</span>
        </button>
      </div>
    </section>

    <section v-if="activeDashboard" class="card panel">
      <div class="panel-header">
        <h2>Layout</h2>
        <div class="actions">
          <button class="ghost" type="button" @click="exportDashboard(activeDashboard.id)">Export</button>
          <button class="ghost danger" type="button" @click="deleteDashboard(activeDashboard.id)">Hapus</button>
        </div>
      </div>
      <div class="layout-editor">
        <div class="form-row">
          <select v-model="selectedChart">
            <option disabled value="">Pilih chart</option>
            <option v-for="chart in charts" :key="chart.id" :value="chart.id">
              {{ chart.name }}
            </option>
          </select>
          <select v-model.number="selectedWidth">
            <option :value="1">1 kolom</option>
            <option :value="2">2 kolom</option>
            <option :value="3">3 kolom</option>
          </select>
          <button type="button" @click="addChart">Tambah ke layout</button>
        </div>
        <div class="grid">
          <div
            v-for="item in activeLayout"
            :key="item.chartId"
            class="grid-item"
            :style="{ gridColumn: `span ${item.w}` }"
          >
            <div class="grid-card">
              <strong>{{ chartName(item.chartId) }}</strong>
              <button class="ghost danger" type="button" @click="removeChart(item.chartId)">Hapus</button>
            </div>
          </div>
        </div>
        <button type="button" @click="saveLayout">Simpan Layout</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { authFetch } from '../utils/auth'
import { buildApiUrl } from '../utils/api'

type Chart = { id: string; name: string }
type LayoutItem = { chartId: string; w: number }
type Dashboard = { id: string; name: string; created_at: string; layout?: LayoutItem[] }

const dashboards = ref<Dashboard[]>([])
const charts = ref<Chart[]>([])
const activeDashboard = ref<Dashboard | null>(null)
const activeLayout = ref<LayoutItem[]>([])

const newName = ref('')
const selectedChart = ref('')
const selectedWidth = ref(1)

const formatDate = (value: string) => new Date(value).toLocaleString()

const loadDashboards = async () => {
  const res = await authFetch('/dashboards')
  const json = await res.json()
  dashboards.value = json.data || []
}

const loadCharts = async () => {
  const res = await authFetch('/charts')
  const json = await res.json()
  charts.value = json.data || []
}

const createDashboard = async () => {
  if (!newName.value.trim()) return
  const res = await authFetch('/dashboards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName.value.trim(), layout: [] })
  })
  if (res.ok) {
    newName.value = ''
    await loadDashboards()
  }
}

const selectDashboard = (dash: Dashboard) => {
  activeDashboard.value = dash
  activeLayout.value = dash.layout ? [...dash.layout] : []
}

const addChart = () => {
  if (!selectedChart.value) return
  if (activeLayout.value.find((item) => item.chartId === selectedChart.value)) return
  activeLayout.value.push({ chartId: selectedChart.value, w: selectedWidth.value })
}

const removeChart = (chartId: string) => {
  activeLayout.value = activeLayout.value.filter((item) => item.chartId !== chartId)
}

const saveLayout = async () => {
  if (!activeDashboard.value) return
  const res = await authFetch(`/dashboards/${activeDashboard.value.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ layout: activeLayout.value })
  })
  if (res.ok) {
    const json = await res.json()
    activeDashboard.value = json.data
    await loadDashboards()
  }
}

const deleteDashboard = async (id: string) => {
  await authFetch(`/dashboards/${id}`, { method: 'DELETE' })
  activeDashboard.value = null
  activeLayout.value = []
  await loadDashboards()
}

const exportDashboard = (id: string) => {
  window.open(buildApiUrl(`/exports/dashboard/${id}`), '_blank')
}

const chartName = (id: string) => charts.value.find((chart) => chart.id === id)?.name || id

onMounted(() => {
  loadDashboards()
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

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1.4fr 1fr auto;
  gap: 12px;
  margin-top: 12px;
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

.dashboard-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.dashboard-item {
  border: 1px solid var(--stroke);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  background: var(--surface);
  cursor: pointer;
}

.dashboard-item.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(10, 120, 120, 0.2);
}

.layout-editor {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.grid-card {
  border: 1px solid var(--stroke);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  background: var(--surface);
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

.empty {
  color: var(--muted);
  padding: 12px 0;
}

@media (max-width: 840px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
