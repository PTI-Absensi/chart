<template>
  <div class="page animate-in">
    <header class="page-header">
      <div>
        <h1>Data Sources</h1>
        <p class="muted">Tambah sumber data (CSV/JSON), lihat schema, dan mapping kolom.</p>
      </div>
    </header>

    <section class="card panel">
      <h2>Tambah Source</h2>
      <form class="form-row" @submit.prevent="uploadSource">
        <input v-model="newName" type="text" placeholder="Nama source (opsional)" />
        <input ref="fileInput" type="file" accept=".csv,.json" />
        <button type="submit">Upload</button>
      </form>
      <p v-if="uploadError" class="error">{{ uploadError }}</p>
    </section>

    <section class="card panel">
      <div class="panel-header">
        <h2>Daftar Source</h2>
        <button class="ghost" type="button" @click="loadSources">Refresh</button>
      </div>
      <div v-if="sources.length === 0" class="empty">Belum ada source.</div>
      <div class="source-list">
        <button
          v-for="source in sources"
          :key="source.id"
          class="source-item"
          :class="{ active: source.id === activeSource?.id }"
          type="button"
          @click="selectSource(source)"
        >
          <div>
            <strong>{{ source.name }}</strong>
            <span class="meta">{{ source.type.toUpperCase() }}</span>
          </div>
          <small class="meta">{{ formatDate(source.created_at) }}</small>
        </button>
      </div>
    </section>

    <section v-if="activeSource" class="card panel">
      <div class="panel-header">
        <h2>Schema & Preview</h2>
        <button class="danger ghost" type="button" @click="removeSource(activeSource.id)">Hapus</button>
      </div>
      <div class="schema-grid">
        <div v-for="field in schema" :key="field.name" class="schema-row">
          <span>{{ field.name }}</span>
          <select v-model="field.type">
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="date">date</option>
          </select>
          <select v-model="mapping[field.name]">
            <option value="ignore">ignore</option>
            <option value="dimension">dimension</option>
            <option value="metric">metric</option>
            <option value="date">date</option>
          </select>
        </div>
      </div>
      <div class="panel-actions">
        <button type="button" @click="saveMapping">Simpan Mapping</button>
        <span v-if="mappingSaved" class="success">Mapping tersimpan.</span>
      </div>
      <div class="table-wrap">
        <table v-if="preview.length > 0">
          <thead>
            <tr>
              <th v-for="col in columns" :key="col">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in preview" :key="idx">
              <td v-for="col in columns" :key="col">{{ row[col] }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">Preview kosong.</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { authFetch } from '../utils/auth'

type Source = {
  id: string
  name: string
  type: 'csv' | 'json'
  created_at: string
  mapping?: { dimension: string[]; metric: string[]; date: string[] }
}

type SchemaField = { name: string; type: 'string' | 'number' | 'date' }

const sources = ref<Source[]>([])
const activeSource = ref<Source | null>(null)
const schema = ref<SchemaField[]>([])
const preview = ref<Record<string, string>[]>([])
const columns = ref<string[]>([])
const mapping = ref<Record<string, string>>({})

const newName = ref('')
const uploadError = ref('')
const mappingSaved = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const formatDate = (value: string) => new Date(value).toLocaleString()

const loadSources = async () => {
  const res = await authFetch('/api/sources')
  const json = await res.json()
  sources.value = json.data || []
}

const selectSource = async (source: Source) => {
  activeSource.value = source
  mappingSaved.value = false
  const res = await authFetch(`/api/sources/${source.id}/schema`)
  const json = await res.json()
  schema.value = json.data?.schema || []
  preview.value = json.data?.preview || []
  columns.value = schema.value.map((item) => item.name)
  const existingMapping = source.mapping || { dimension: [], metric: [], date: [] }
  mapping.value = {}
  schema.value.forEach((field) => {
    if (existingMapping.dimension?.includes(field.name)) {
      mapping.value[field.name] = 'dimension'
    } else if (existingMapping.metric?.includes(field.name)) {
      mapping.value[field.name] = 'metric'
    } else if (existingMapping.date?.includes(field.name)) {
      mapping.value[field.name] = 'date'
    } else {
      mapping.value[field.name] = 'ignore'
    }
  })
}

const uploadSource = async () => {
  uploadError.value = ''
  mappingSaved.value = false
  const file = fileInput.value?.files?.[0]
  if (!file) {
    uploadError.value = 'Pilih file CSV atau JSON terlebih dahulu.'
    return
  }
  const form = new FormData()
  form.append('file', file)
  if (newName.value.trim()) form.append('name', newName.value.trim())

  const res = await authFetch('/api/sources', { method: 'POST', body: form })
  const json = await res.json()
  if (!res.ok || json.status !== 'success') {
    uploadError.value = json.detail || 'Upload gagal.'
    return
  }
  newName.value = ''
  if (fileInput.value) fileInput.value.value = ''
  await loadSources()
  const added = json.data
  if (added) {
    const selected = sources.value.find((item) => item.id === added.id)
    if (selected) await selectSource(selected)
  }
}

const saveMapping = async () => {
  if (!activeSource.value) return
  const payload = {
    dimension: [],
    metric: [],
    date: []
  } as { dimension: string[]; metric: string[]; date: string[] }

  Object.entries(mapping.value).forEach(([field, type]) => {
    if (type === 'dimension') payload.dimension.push(field)
    if (type === 'metric') payload.metric.push(field)
    if (type === 'date') payload.date.push(field)
  })

  const res = await authFetch(`/api/sources/${activeSource.value.id}/mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const json = await res.json()
  if (res.ok && json.status === 'success') {
    mappingSaved.value = true
    activeSource.value = json.data
  }
}

const removeSource = async (id: string) => {
  const res = await authFetch(`/api/sources/${id}`, { method: 'DELETE' })
  if (!res.ok) return
  activeSource.value = null
  schema.value = []
  preview.value = []
  columns.value = []
  await loadSources()
}

onMounted(() => {
  loadSources()
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

.panel h2 {
  margin: 0 0 12px;
  font-size: 1.1rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.form-row {
  display: grid;
  grid-template-columns: 1.2fr 1.2fr 0.6fr;
  gap: 12px;
}

.form-row input,
.form-row button {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  color: var(--ink);
}

.form-row button {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.source-list {
  display: grid;
  gap: 10px;
}

.source-item {
  border: 1px solid var(--stroke);
  background: var(--surface);
  border-radius: 12px;
  padding: 12px;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.source-item.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(10, 120, 120, 0.2);
}

.meta {
  color: var(--muted);
}

.schema-grid {
  display: grid;
  gap: 10px;
  margin: 12px 0 16px;
}

.schema-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 0.8fr;
  gap: 10px;
  align-items: center;
}

.schema-row select {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  color: var(--ink);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.panel-actions button {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--stroke);
  background: var(--accent);
  color: #fff;
  cursor: pointer;
}

.ghost {
  background: transparent;
  color: var(--ink);
}

.danger {
  color: #c33;
}

.success {
  color: #1a8b6a;
  font-weight: 600;
}

.error {
  color: #d9482f;
}

.empty {
  color: var(--muted);
  padding: 12px 0;
}

.table-wrap {
  overflow-x: auto;
  border: 1px solid var(--stroke);
  border-radius: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--stroke);
  text-align: left;
  font-size: 0.9rem;
}

thead {
  background: var(--surface-alt);
}

@media (max-width: 860px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  .schema-row {
    grid-template-columns: 1fr;
  }
}
</style>
