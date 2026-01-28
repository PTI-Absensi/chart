<template>
  <div class="page-content process-page">
    <header class="animate-in">
      <div class="title-wrap">
        <h1>Rekap Waktu Proses</h1>
        <h2>Manajemen Pengadaan</h2>
      </div>
      <div class="pill">Process-time summary</div>
    </header>

    <div class="grid">
      <div class="card animate-in">
        <h3>Create Recap</h3>
        <p class="muted">
          Jalankan CLI untuk menghasilkan rekap, lalu muat file CSV/JSON ke tabel preview.
        </p>
        <div class="form-grid">
          <div>
            <label for="yearType">Tipe tahun</label>
            <select id="yearType">
              <option value="fiscal">Tahun Anggaran</option>
              <option value="calendar">Tahun Kalender</option>
            </select>
          </div>
          <div>
            <label for="yearValue">Tahun</label>
            <input id="yearValue" type="text" value="2025" />
          </div>
          <div>
            <label for="sumberDana">Sumber dana</label>
            <select id="sumberDana">
              <option value="">ALL</option>
              <option value="eksploitasi">eksploitasi</option>
              <option value="investasi">investasi</option>
            </select>
          </div>
          <div>
            <label for="kategoriPlant">Kategori plant</label>
            <select id="kategoriPlant">
              <option value="">ALL</option>
              <option value="PG">PG</option>
              <option value="MKSO">MKSO</option>
              <option value="HO">HO</option>
            </select>
          </div>
          <div>
            <label for="outputFormat">Output format</label>
            <select id="outputFormat">
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>
        <div class="button-row">
          <button class="btn-primary" id="refreshBtn">Refresh</button>
        </div>
        <div class="file-row">
          <input id="fileInput" type="file" accept=".csv,.json" />
          <button class="btn-secondary" id="loadFileBtn">Load output file</button>
        </div>
      </div>

      <div class="card animate-in">
        <h3>Table Preview</h3>
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Avg hari kerja</th>
              <th>Jumlah paket</th>
            </tr>
          </thead>
          <tbody id="tableBody">
            <tr>
              <td class="empty" colspan="3">Belum ada data. Muat file CSV/JSON.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { authFetch } from '../utils/auth'

type Row = {
  metric: string
  avg_hari_kerja: string | number
  jumlah_paket: string | number
}

onMounted(() => {
  const fileInput = document.getElementById('fileInput') as HTMLInputElement | null
  const loadFileBtn = document.getElementById('loadFileBtn')
  const tableBody = document.getElementById('tableBody')

  const renderTable = (records: Row[]) => {
    if (!tableBody) return
    if (!records.length) {
      tableBody.innerHTML = '<tr><td class="empty" colspan="3">Tidak ada data.</td></tr>'
      return
    }
    tableBody.innerHTML = records
      .map(
        (row) => `
        <tr>
          <td>${row.metric}</td>
          <td>${row.avg_hari_kerja}</td>
          <td>${row.jumlah_paket}</td>
        </tr>
      `
      )
      .join('')
  }

  loadFileBtn?.addEventListener('click', () => {
    if (!fileInput) return
    fileInput.click()
  })

  fileInput?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    authFetch('/api/process-time/parse', { method: 'POST', body: form })
      .then((res) => res.json())
      .then((json) => {
        renderTable(json.data || [])
      })
      .catch(() => {
        if (tableBody) {
          tableBody.innerHTML = '<tr><td class="empty" colspan="3">Gagal membaca file.</td></tr>'
        }
      })
  })
})
</script>

<style scoped>
.process-page {
  --bg-1: var(--bg);
  --bg-2: var(--bg-2);
  --card: var(--surface);
  --stroke: var(--stroke);
  --text: var(--ink);
  --muted: var(--muted);
  --accent: var(--accent);
  --accent-2: var(--accent-3);
  --accent-3: var(--accent-2);
}

.page-content {
  width: min(1400px, 100%);
  margin: 0 auto;
  padding: 36px 0 60px;
}

header {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26px;
}

.title-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

h1 {
  font-family: var(--font-display);
  font-size: clamp(28px, 3vw, 38px);
  margin: 0;
  color: var(--text);
}

h2 {
  margin: 0;
  font-weight: 500;
  color: var(--muted);
}

.pill {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: var(--accent);
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.card {
  background: var(--card);
  border-radius: 18px;
  border: 1px solid var(--stroke);
  padding: 18px;
  box-shadow: 0 18px 30px rgba(15, 46, 35, 0.1);
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 24px 40px rgba(15, 46, 35, 0.18);
}

.muted {
  color: var(--muted);
  margin-top: 6px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  margin-top: 14px;
}

label {
  display: block;
  font-weight: 600;
  margin-bottom: 6px;
}

input,
select {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  padding: 10px 12px;
  font-family: var(--font-body);
  background: var(--surface);
  color: var(--text);
}

.button-row {
  margin-top: 16px;
}

.btn-primary,
.btn-secondary {
  padding: 10px 16px;
  border-radius: 12px;
  border: 1px solid var(--stroke);
  cursor: pointer;
  font-weight: 600;
}

.btn-primary {
  background: var(--accent);
  color: white;
  border-color: transparent;
}

.btn-secondary {
  background: var(--surface);
  color: var(--accent);
}

.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid var(--stroke);
  padding: 10px;
  text-align: left;
}

.empty {
  text-align: center;
  color: var(--muted);
  padding: 28px 0;
}
</style>
