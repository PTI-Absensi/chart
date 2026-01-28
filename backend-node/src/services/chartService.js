import fs from 'fs'
import path from 'path'

function resolveStorageRoot() {
  const candidates = [
    path.resolve(process.cwd(), 'storage'),
    path.resolve(process.cwd(), 'backend-node', 'storage')
  ]
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir
  }
  return candidates[0]
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function getStorageFile(fileName) {
  const root = resolveStorageRoot()
  ensureDir(root)
  return path.join(root, fileName)
}

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    const raw = fs.readFileSync(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch (err) {
    return fallback
  }
}

function writeJsonSafe(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

const chartsFile = () => getStorageFile('charts.json')
const dashboardsFile = () => getStorageFile('dashboards.json')

export function listCharts() {
  const items = readJsonSafe(chartsFile(), [])
  return Array.isArray(items) ? items : []
}

export function getChart(id) {
  return listCharts().find((item) => item.id === id) || null
}

export function addChart(payload) {
  const items = listCharts()
  const now = new Date().toISOString()
  const chart = {
    id: generateId('chart'),
    name: payload.name || 'Untitled Chart',
    type: payload.type || 'line',
    source_id: payload.source_id || null,
    dimension: payload.dimension || '',
    metric: payload.metric || '',
    filters: payload.filters || {},
    created_at: now
  }
  items.unshift(chart)
  writeJsonSafe(chartsFile(), items)
  return chart
}

export function updateChart(id, payload) {
  const items = listCharts()
  const target = items.find((item) => item.id === id)
  if (!target) return null
  Object.assign(target, {
    name: payload.name ?? target.name,
    type: payload.type ?? target.type,
    source_id: payload.source_id ?? target.source_id,
    dimension: payload.dimension ?? target.dimension,
    metric: payload.metric ?? target.metric,
    filters: payload.filters ?? target.filters
  })
  writeJsonSafe(chartsFile(), items)
  return target
}

export function removeChart(id) {
  const items = listCharts()
  const next = items.filter((item) => item.id !== id)
  if (next.length === items.length) return false
  writeJsonSafe(chartsFile(), next)
  return true
}

export function listDashboards() {
  const items = readJsonSafe(dashboardsFile(), [])
  return Array.isArray(items) ? items : []
}

export function getDashboard(id) {
  return listDashboards().find((item) => item.id === id) || null
}

export function addDashboard(payload) {
  const items = listDashboards()
  const now = new Date().toISOString()
  const dashboard = {
    id: generateId('dash'),
    name: payload.name || 'Untitled Dashboard',
    layout: Array.isArray(payload.layout) ? payload.layout : [],
    created_at: now
  }
  items.unshift(dashboard)
  writeJsonSafe(dashboardsFile(), items)
  return dashboard
}

export function updateDashboard(id, payload) {
  const items = listDashboards()
  const target = items.find((item) => item.id === id)
  if (!target) return null
  Object.assign(target, {
    name: payload.name ?? target.name,
    layout: Array.isArray(payload.layout) ? payload.layout : target.layout
  })
  writeJsonSafe(dashboardsFile(), items)
  return target
}

export function removeDashboard(id) {
  const items = listDashboards()
  const next = items.filter((item) => item.id !== id)
  if (next.length === items.length) return false
  writeJsonSafe(dashboardsFile(), next)
  return true
}

// Templates handled in stage 3 service.
