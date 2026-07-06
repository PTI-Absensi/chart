<template>
  <div class="research-page">
    <!-- Header -->
    <div class="rp-header">
      <div class="rp-title-row">
        <h1 class="rp-title">Research — EUR/USD TVT v02</h1>
        <div class="rp-interval-tabs">
          <button
            v-for="iv in intervals"
            :key="iv"
            class="rp-itab"
            :class="{ active: interval === iv }"
            @click="setInterval(iv)"
          >{{ iv }}</button>
        </div>
      </div>
      <p class="rp-sub">Evaluasi final fold 19–21 · Scenario: tvt_v02_last3 · Tuning fold 13–18</p>
    </div>

    <!-- Section tabs -->
    <div class="rp-sectabs">
      <button
        v-for="s in sections"
        :key="s.key"
        class="rp-stab"
        :class="{ active: section === s.key }"
        @click="section = s.key"
      >{{ s.label }}</button>
    </div>

    <!-- DASHBOARD section -->
    <div v-if="section === 'dashboard'" class="rp-section">
      <!-- Summary metrics cards -->
      <div v-if="summary" class="rp-cards">
        <div
          v-for="m in modelKeys"
          :key="m"
          class="rp-card"
          :class="{ best: bestModel === m }"
        >
          <div class="rp-card-name">{{ modelLabel(m) }}</div>
          <div class="rp-card-metric">
            <span class="rp-val">{{ fmt(summary[m]?.mean_mae_avg_pips) }}</span>
            <span class="rp-unit">pips MAE avg</span>
          </div>
          <div class="rp-card-row">
            <span class="rp-lbl">R² avg OHLC</span>
            <span class="rp-val2">{{ fmt4(summary[m]?.mean_r2_avg_ohlc) }}</span>
          </div>
          <div class="rp-card-row">
            <span class="rp-lbl">DA body</span>
            <span class="rp-val2">{{ fmt1(summary[m]?.mean_da_body_pct) }}%</span>
          </div>
          <div class="rp-card-row">
            <span class="rp-lbl">Error ≤ ATR6</span>
            <span class="rp-val2">{{ fmtPct(summary[m]?.avg_error_le_atr6_pct) }}</span>
          </div>
          <div class="rp-card-badge" v-if="bestModel === m">Best MAE</div>
        </div>
      </div>

      <!-- Comparison HTML report -->
      <div class="rp-report-block" v-if="comparisonUrl">
        <div class="rp-report-label">Comparison Report</div>
        <iframe :src="comparisonUrl" class="rp-iframe rp-iframe-tall" sandbox="allow-scripts allow-same-origin"></iframe>
      </div>
    </div>

    <!-- DETAIL section -->
    <div v-if="section === 'detail'" class="rp-section">
      <!-- Model selector -->
      <div class="rp-model-tabs">
        <button
          v-for="m in modelKeys"
          :key="m"
          class="rp-mtab"
          :class="{ active: activeModel === m }"
          @click="activeModel = m"
        >{{ modelLabel(m) }}</button>
      </div>

      <!-- Config badge -->
      <div class="rp-config" v-if="models">
        <span class="rp-config-title">Config final:</span>
        <span
          v-for="(v, k) in configOf(activeModel)"
          :key="k"
          class="rp-badge"
        >{{ k }}={{ v }}</span>
      </div>

      <!-- Report sub-tabs -->
      <div class="rp-subtabs" v-if="detailReports.length">
        <button
          v-for="r in detailReports"
          :key="r.label"
          class="rp-subtab"
          :class="{ active: activeReport?.label === r.label }"
          @click="activeReport = r"
        >{{ r.label }}</button>
      </div>

      <div class="rp-report-block" v-if="activeReport">
        <iframe :src="activeReport.url" class="rp-iframe rp-iframe-tall" sandbox="allow-scripts allow-same-origin"></iframe>
      </div>
    </div>

    <!-- TUNING section -->
    <div v-if="section === 'tuning'" class="rp-section">
      <div class="rp-model-tabs">
        <button
          v-for="m in ['bilstm','lstm']"
          :key="m"
          class="rp-mtab"
          :class="{ active: activeTuningModel === m }"
          @click="activeTuningModel = m"
        >{{ modelLabel(m) }}</button>
      </div>
      <div class="rp-report-block" v-if="tuningUrl">
        <iframe :src="tuningUrl" class="rp-iframe rp-iframe-tall" sandbox="allow-scripts allow-same-origin"></iframe>
      </div>
      <div class="rp-empty" v-else>Tidak ada HTML tuning untuk model ini.</div>
    </div>

    <!-- AUDIT section -->
    <div v-if="section === 'audit'" class="rp-section">
      <div class="rp-audit-info" v-if="foldScope">
        <h3>Fold Scope</h3>
        <div class="rp-audit-row"><span>Profile</span><span>{{ foldScope.profile }}</span></div>
        <div class="rp-audit-row"><span>Total fold</span><span>{{ foldScope.total_folds }}</span></div>
        <div class="rp-audit-row"><span>Tuning fold</span><span>{{ foldScope.tuning_policy?.folds?.join(', ') }}</span></div>
        <div class="rp-audit-row"><span>Evaluation fold</span><span>{{ foldScope.evaluation_policy?.folds?.join(', ') }}</span></div>
        <div class="rp-audit-row"><span>Overlap</span><span>{{ foldScope.overlap ? 'Ya' : 'Tidak' }}</span></div>
      </div>
      <div class="rp-audit-links" v-if="auditReports.length">
        <h3>Artefak Audit</h3>
        <a
          v-for="r in auditReports"
          :key="r.label"
          :href="r.url"
          target="_blank"
          class="rp-audit-link"
        >{{ r.label }} <span class="rp-kind">{{ r.kind }}</span></a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const interval = ref('4h')
const intervals = ref<string[]>(['4h', '1D'])
const section = ref('dashboard')
const sections = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'detail', label: 'Detail Model' },
  { key: 'tuning', label: 'Tuning' },
  { key: 'audit', label: 'Audit' },
]

const summary = ref<any>(null)
const foldScope = ref<any>(null)
const models = ref<any[]>([])
const reports = ref<any>(null)

const modelKeys = ['bilstm', 'lstm', 'arima']
const activeModel = ref('lstm')
const activeReport = ref<any>(null)
const activeTuningModel = ref('lstm')

function modelLabel(m: string) {
  return m === 'bilstm' ? 'BiLSTM+FLF' : m === 'lstm' ? 'FLF-LSTM' : 'ARIMA'
}

function fmt(v: number | undefined) {
  return v != null ? v.toFixed(2) : '—'
}
function fmt4(v: number | undefined) {
  return v != null ? v.toFixed(4) : '—'
}
function fmt1(v: number | undefined) {
  return v != null ? v.toFixed(1) : '—'
}
function fmtPct(v: number | undefined) {
  return v != null ? v.toFixed(1) + '%' : '—'
}

const bestModel = computed(() => {
  if (!summary.value) return null
  let best = '', bestVal = Infinity
  for (const m of modelKeys) {
    const v = summary.value[m]?.mean_mae_avg_pips
    if (v != null && v < bestVal) { bestVal = v; best = m }
  }
  return best
})

const comparisonUrl = computed(() => {
  return reports.value?.dashboard?.find((r: any) => r.kind === 'html')?.url ?? null
})

const detailReports = computed(() => {
  const m = activeModel.value
  return reports.value?.detail?.[m]?.filter((r: any) => r.kind === 'html') ?? []
})

const tuningUrl = computed(() => {
  const m = activeTuningModel.value
  return reports.value?.tuning?.[m]?.find((r: any) => r.kind === 'html')?.url ?? null
})

const auditReports = computed(() => {
  return reports.value?.audit ?? []
})

function configOf(m: string) {
  const model = models.value.find((x: any) => x.value === m)
  if (!model?.configSummary) return {}
  const c = model.configSummary
  // only non-null entries
  return Object.fromEntries(Object.entries(c).filter(([, v]) => v != null && v !== 0))
}

async function load() {
  try {
    const [modRes, sumRes, repRes] = await Promise.all([
      fetch('/api/research/models'),
      fetch(`/api/research/summary?interval=${interval.value}`),
      fetch(`/api/research/reports?interval=${interval.value}`),
    ])
    const modJson = await modRes.json()
    const sumJson = await sumRes.json()
    const repJson = await repRes.json()

    models.value = modJson.data ?? []
    summary.value = sumJson.data?.summary ?? null
    foldScope.value = sumJson.data?.foldScope ?? null
    intervals.value = modJson.intervals ?? ['4h', '1D']
    reports.value = repJson.data ?? null

    // default first html report for detail
    activeReport.value = detailReports.value[0] ?? null
  } catch (e) {
    console.error('research load error', e)
  }
}

function setInterval(iv: string) {
  interval.value = iv
}

watch(interval, load)
watch(activeModel, () => {
  activeReport.value = detailReports.value[0] ?? null
})

onMounted(load)
</script>

<style scoped>
.research-page {
  padding: 24px 28px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: var(--font-body);
  color: var(--ink);
}
.rp-header { margin-bottom: 6px; }
.rp-title-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 4px; }
.rp-title { font-family: var(--font-display); font-size: 1.35rem; font-weight: 700; margin: 0; }
.rp-sub { color: var(--muted); font-size: 0.82rem; margin: 0 0 16px; }

.rp-interval-tabs, .rp-sectabs, .rp-model-tabs, .rp-subtabs {
  display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px;
}
.rp-itab, .rp-stab, .rp-mtab, .rp-subtab {
  padding: 5px 14px; border-radius: 20px; border: 1px solid var(--stroke);
  background: var(--surface-alt); color: var(--ink); font-size: 0.82rem;
  cursor: pointer; transition: background var(--transition), color var(--transition);
}
.rp-itab.active, .rp-stab.active, .rp-mtab.active, .rp-subtab.active {
  background: var(--accent); color: #fff; border-color: var(--accent);
}

.rp-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}
.rp-card {
  background: var(--surface);
  border: 1px solid var(--stroke);
  border-radius: var(--radius-sm);
  padding: 16px 18px;
  position: relative;
}
.rp-card.best { border-color: var(--accent-3); }
.rp-card-name { font-size: 0.78rem; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
.rp-card-metric { display: flex; align-items: baseline; gap: 6px; margin-bottom: 10px; }
.rp-val { font-size: 1.6rem; font-weight: 700; font-family: var(--font-display); color: var(--ink); }
.rp-unit { font-size: 0.75rem; color: var(--muted); }
.rp-card-row { display: flex; justify-content: space-between; font-size: 0.8rem; padding: 2px 0; }
.rp-lbl { color: var(--muted); }
.rp-val2 { font-weight: 600; }
.rp-card-badge {
  position: absolute; top: 10px; right: 10px;
  background: var(--accent-3); color: #fff;
  font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 10px;
  text-transform: uppercase; letter-spacing: .05em;
}

.rp-report-block { margin-top: 8px; }
.rp-report-label { font-size: 0.8rem; font-weight: 600; color: var(--muted); margin-bottom: 6px; }
.rp-iframe {
  width: 100%; border: 1px solid var(--stroke);
  border-radius: var(--radius-sm); background: var(--surface);
}
.rp-iframe-tall { height: 700px; }

.rp-config {
  display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
  margin-bottom: 14px; font-size: 0.8rem;
}
.rp-config-title { font-weight: 600; color: var(--muted); }
.rp-badge {
  background: var(--surface-alt); border: 1px solid var(--stroke);
  border-radius: 6px; padding: 2px 8px; font-size: 0.75rem; font-family: monospace;
}

.rp-audit-info, .rp-audit-links { margin-bottom: 24px; }
.rp-audit-info h3, .rp-audit-links h3 { font-size: 0.9rem; font-weight: 700; margin: 0 0 10px; }
.rp-audit-row {
  display: flex; justify-content: space-between;
  font-size: 0.82rem; padding: 5px 0;
  border-bottom: 1px solid var(--stroke);
}
.rp-audit-row span:first-child { color: var(--muted); }
.rp-audit-links { display: flex; flex-direction: column; gap: 6px; }
.rp-audit-link {
  font-size: 0.82rem; color: var(--accent); text-decoration: none;
  padding: 6px 10px; border: 1px solid var(--stroke);
  border-radius: 8px; background: var(--surface);
  display: flex; justify-content: space-between;
}
.rp-audit-link:hover { background: var(--hover); }
.rp-kind { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; }
.rp-empty { color: var(--muted); font-size: 0.85rem; padding: 20px 0; }
</style>
