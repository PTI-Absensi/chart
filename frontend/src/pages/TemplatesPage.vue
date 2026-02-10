<template>
  <div class="page animate-in">
    <header class="page-header">
      <div>
        <h1>Templates</h1>
        <p class="muted">Simpan konfigurasi chart/dashboard sebagai template.</p>
      </div>
    </header>

    <section class="card panel">
      <h2>Template Baru</h2>
      <form class="form-row" @submit.prevent="createTemplate">
        <input v-model="newName" type="text" placeholder="Nama template" />
        <button type="submit">Simpan</button>
      </form>
    </section>

    <section class="card panel">
      <div class="panel-header">
        <h2>Daftar Template</h2>
        <button class="ghost" type="button" @click="loadTemplates">Refresh</button>
      </div>
      <div v-if="templates.length === 0" class="empty">Belum ada template.</div>
      <div class="template-list">
        <div v-for="tpl in templates" :key="tpl.id" class="template-item">
          <div>
            <strong>{{ tpl.name }}</strong>
            <div class="meta">{{ formatDate(tpl.created_at) }}</div>
          </div>
          <button class="ghost" type="button" @click="exportTemplate(tpl.id)">Export</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { apiFetch, buildApiUrl } from '../utils/api'

type Template = { id: string; name: string; created_at: string }

const templates = ref<Template[]>([])
const newName = ref('')

const formatDate = (value: string) => new Date(value).toLocaleString()

const loadTemplates = async () => {
  const res = await apiFetch('/templates')
  const json = await res.json()
  templates.value = json.data || []
}

const createTemplate = async () => {
  if (!newName.value.trim()) return
  const res = await apiFetch('/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName.value.trim(), content: {} })
  })
  if (res.ok) {
    newName.value = ''
    await loadTemplates()
  }
}

const exportTemplate = (id: string) => {
  window.open(buildApiUrl(`/exports/template/${id}`), '_blank')
}

onMounted(loadTemplates)
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
  grid-template-columns: 1.4fr auto;
  gap: 12px;
  margin-top: 12px;
}

input {
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

.template-list {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.template-item {
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

.ghost {
  background: transparent;
  color: var(--ink);
}

.empty {
  color: var(--muted);
  padding: 12px 0;
}

@media (max-width: 720px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
