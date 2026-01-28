<template>
  <div class="page-content dfg-page">
    <header class="animate-in">
      <div class="title-wrap">
        <h1>Directly-Folows Graph (DFG)</h1>
        <h2>Manajemen Pengadaan</h2>
      </div>
      <div class="pill">Event-based DFG</div>
    </header>

    <div class="grid">
      <section class="card animate-in">
        <h3>Create DFG</h3>
        <div class="field">
          <label for="table">Event log table</label>
          <input id="table" type="text" value="fact_event_log_v2" />
        </div>
        <div class="row">
          <div class="field">
            <label for="mode">Mode</label>
            <select id="mode">
              <option value="event">event</option>
              <option value="status">status</option>
            </select>
          </div>
          <div class="field">
            <label for="format">Output format</label>
            <select id="format">
              <option value="png">png</option>
              <option value="svg">svg</option>
              <option value="dot">dot</option>
              <option value="csv">csv</option>
            </select>
          </div>
          <div class="field">
            <label for="minEdge">Min edge</label>
            <input id="minEdge" type="number" value="1" />
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label for="tahunAnggaran">Tahun anggaran</label>
            <input id="tahunAnggaran" type="text" value="2025" />
          </div>
          <div class="field">
            <label for="sumberDana">Sumber dana</label>
            <input id="sumberDana" type="text" value="eksploitasi" />
          </div>
          <div class="field">
            <label for="kategoriPlant">Kategori plant</label>
            <input id="kategoriPlant" type="text" value="PG" />
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label for="startDate">Start date</label>
            <input id="startDate" type="date" />
          </div>
          <div class="field">
            <label for="endDate">End date</label>
            <input id="endDate" type="date" />
          </div>
        </div>
        <div class="button-row">
          <button class="btn-secondary" id="loadLatest">Load latest file</button>
        </div>
        <div class="note">Preview file path:</div>
        <pre id="commandPreview"></pre>
      </section>

      <section class="card animate-in">
        <h3>DFG Preview</h3>
        <div class="tabs">
          <button class="tab active" data-tab="image">Image</button>
          <button class="tab" data-tab="mermaid">Mermaid</button>
        </div>
        <div class="tab-panel active" id="panel-image">
          <div class="preview-box image-preview">
            <img id="imagePreview" src="" alt="DFG preview" />
          </div>
          <div class="field file-row">
            <label for="imageInput">Load image file</label>
            <input id="imageInput" type="file" accept="image/*" />
          </div>
        </div>
        <div class="tab-panel" id="panel-mermaid">
          <div class="field">
            <label for="mermaidInput">Mermaid code</label>
            <textarea
              id="mermaidInput"
              rows="9"
            >graph LR
Start((Start)) -->|9360| PR_VERIFIED
PR_VERIFIED -->|9217| PK_START
PR_VERIFIED -->|26| PK_SUBMIT_HPS
PK_START -->|8990| PK_SUBMIT_HPS
PK_START -->|209| HPS_FINISH
PK_SUBMIT_HPS -->|8907| HPS_FINISH
PK_SUBMIT_HPS -->|209| PK_FINISH
HPS_FINISH -->|8907| PK_FINISH
PK_FINISH -->|9075| PP_START
PP_START -->|9075| PP_PELAKSANAAN
PP_PELAKSANAAN -->|9094| PP_TAYANG
PP_TAYANG -->|8902| PP_PEMENANG
PP_PEMENANG -->|8902| SPPBJ_START
SPPBJ_START -->|8902| SPPBJ_FINISH["SPPBJ Finish/PP Selesai"]
SPPBJ_FINISH -->|8902| End((End))</textarea>
          </div>
          <div class="button-row">
            <button class="btn-primary" id="renderMermaid">Render Mermaid</button>
          </div>
          <div class="preview-box mermaid-output" id="mermaidPreview">Mermaid preview will appear here.</div>
          <div class="note">Mermaid rendering uses CDN. If offline, copy the text to a Mermaid editor.</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { authFetch } from '../utils/auth'

onMounted(() => {
  const formatEl = document.getElementById('format') as HTMLSelectElement | null
  const modeEl = document.getElementById('mode') as HTMLSelectElement | null
  const tableEl = document.getElementById('table') as HTMLInputElement | null
  const minEdgeEl = document.getElementById('minEdge') as HTMLInputElement | null
  const tahunEl = document.getElementById('tahunAnggaran') as HTMLInputElement | null
  const sumberEl = document.getElementById('sumberDana') as HTMLInputElement | null
  const kategoriEl = document.getElementById('kategoriPlant') as HTMLInputElement | null
  const startEl = document.getElementById('startDate') as HTMLInputElement | null
  const endEl = document.getElementById('endDate') as HTMLInputElement | null

  const commandPreview = document.getElementById('commandPreview') as HTMLElement | null

  if (!formatEl || !modeEl || !tableEl || !minEdgeEl || !tahunEl || !sumberEl || !kategoriEl || !startEl || !endEl) {
    return
  }

  const buildCommand = async () => {
    const format = formatEl.value
    const mode = modeEl.value
    const table = tableEl.value.trim() || 'fact_event_log_v2'
    const minEdge = minEdgeEl.value || '1'
    const tahun = tahunEl.value.trim()

    const params = new URLSearchParams({
      table,
      mode,
      format,
      min_edge: minEdge
    })
    if (tahun) params.set('tahun_anggaran', tahun)
    if (sumberEl.value.trim()) params.set('sumber_dana', sumberEl.value.trim())
    if (kategoriEl.value.trim()) params.set('kategori_plant', kategoriEl.value.trim())
    if (startEl.value) params.set('start_date', startEl.value)
    if (endEl.value) params.set('end_date', endEl.value)

    const res = await authFetch(`/api/dfg/preview?${params.toString()}`)
    const json = await res.json()
    if (commandPreview) commandPreview.textContent = json.command || ''
    return json.file_url
  }

  const loadLatestBtn = document.getElementById('loadLatest')
  loadLatestBtn?.addEventListener('click', async () => {
    const output = await buildCommand()
    const img = document.getElementById('imagePreview') as HTMLImageElement | null
    if (img && output) img.src = `${output}?t=${Date.now()}`
  })

  const rebuild = async () => {
    const output = await buildCommand()
    const imagePreview = document.getElementById('imagePreview') as HTMLImageElement | null
    if (imagePreview && output) imagePreview.src = `${output}?t=${Date.now()}`
  }

  formatEl.addEventListener('change', rebuild)
  modeEl.addEventListener('change', rebuild)
  tableEl.addEventListener('input', rebuild)
  minEdgeEl.addEventListener('input', rebuild)
  tahunEl.addEventListener('input', rebuild)
  sumberEl.addEventListener('input', rebuild)
  kategoriEl.addEventListener('input', rebuild)
  startEl.addEventListener('change', rebuild)
  endEl.addEventListener('change', rebuild)

  await rebuild()

  const tabs = document.querySelectorAll('.tab')
  const panels = {
    image: document.getElementById('panel-image'),
    mermaid: document.getElementById('panel-mermaid')
  }
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'))
      tab.classList.add('active')
      Object.values(panels).forEach((p) => p?.classList.remove('active'))
      const target = (panels as Record<string, HTMLElement | null>)[(tab as HTMLElement).dataset.tab ?? '']
      target?.classList.add('active')
    })
  })

  const imageInput = document.getElementById('imageInput') as HTMLInputElement | null
  imageInput?.addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      if (imagePreview) imagePreview.src = String(e.target?.result ?? '')
    }
    reader.readAsDataURL(file)
  })

  const mermaidPreview = document.getElementById('mermaidPreview') as HTMLElement | null
  const mermaidInput = document.getElementById('mermaidInput') as HTMLTextAreaElement | null
  const renderMermaid = async () => {
    const code = mermaidInput?.value.trim() || ''
    if (!code) return
    if (!(window as any).mermaid) {
      if (mermaidPreview) mermaidPreview.textContent = 'Mermaid CDN not loaded.'
      return
    }
    ;(window as any).mermaid.initialize({ startOnLoad: false, theme: 'base' })
    try {
      const id = `dfgSvg${Date.now()}`
      const { svg } = await (window as any).mermaid.render(id, code)
      if (mermaidPreview) mermaidPreview.innerHTML = svg
    } catch (err) {
      if (mermaidPreview) mermaidPreview.textContent = 'Failed to render Mermaid.'
    }
  }

  document.getElementById('renderMermaid')?.addEventListener('click', renderMermaid)
  renderMermaid()
})
</script>

<style scoped>
.dfg-page {
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

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}

.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
}

input,
select,
textarea {
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

.tabs {
  display: flex;
  gap: 10px;
  margin: 12px 0;
}

.tab {
  border-radius: 999px;
  border: 1px solid var(--stroke);
  padding: 6px 12px;
  cursor: pointer;
  background: var(--surface);
}

.tab.active {
  background: var(--accent);
  color: white;
  border-color: transparent;
}

.tab-panel {
  display: none;
}

.tab-panel.active {
  display: block;
}

.preview-box {
  border-radius: 16px;
  border: 1px solid var(--stroke);
  background: var(--surface);
  padding: 12px;
  min-height: 200px;
}

.image-preview img {
  width: 100%;
  border-radius: 10px;
}

.note {
  font-size: 12px;
  color: var(--muted);
  margin-top: 10px;
}
</style>
