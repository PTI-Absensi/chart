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

function getStoragePaths() {
  const root = resolveStorageRoot()
  const uploads = path.join(root, 'uploads')
  const meta = path.join(root, 'sources.json')
  ensureDir(root)
  ensureDir(uploads)
  return { root, uploads, meta }
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

function splitCsvLine(line) {
  const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)
  return parts.map((part) => {
    const trimmed = part.trim()
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1).replace(/""/g, '"')
    }
    return trimmed
  })
}

function parseCsv(text, limit = 50) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return { columns: [], rows: [] }
  const headers = splitCsvLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length && rows.length < limit; i += 1) {
    const values = splitCsvLine(lines[i])
    const row = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? ''
    })
    rows.push(row)
  }
  return { columns: headers, rows }
}

function parseJson(text, limit = 50) {
  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed)) {
    return { columns: [], rows: [] }
  }
  const rows = parsed.slice(0, limit)
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []
  return { columns, rows }
}

function inferType(values) {
  const cleaned = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
  if (cleaned.length === 0) return 'string'
  let hasString = false
  let hasDate = false
  let hasNumber = false
  cleaned.forEach((value) => {
    const str = String(value).trim()
    const num = Number(str)
    if (!Number.isNaN(num) && str !== '') {
      hasNumber = true
      return
    }
    const parsedDate = Date.parse(str)
    if (!Number.isNaN(parsedDate)) {
      hasDate = true
      return
    }
    hasString = true
  })
  if (hasString) return 'string'
  if (hasDate) return 'date'
  if (hasNumber) return 'number'
  return 'string'
}

function buildSchema(columns, rows) {
  return columns.map((col) => {
    const values = rows.map((row) => row[col])
    return { name: col, type: inferType(values) }
  })
}

function generateId() {
  return `src_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

export function listSources() {
  const { meta } = getStoragePaths()
  const sources = readJsonSafe(meta, [])
  return Array.isArray(sources) ? sources : []
}

export function getSource(id) {
  const sources = listSources()
  return sources.find((item) => item.id === id) || null
}

export function addSource({ name, type, originalName, buffer }) {
  const { uploads, meta } = getStoragePaths()
  const sources = listSources()
  const id = generateId()
  const extension = type === 'json' ? 'json' : 'csv'
  const fileName = `${id}.${extension}`
  const filePath = path.join(uploads, fileName)
  fs.writeFileSync(filePath, buffer)

  const now = new Date().toISOString()
  const source = {
    id,
    name: name || originalName || fileName,
    type,
    file_name: fileName,
    created_at: now,
    mapping: { dimension: [], metric: [], date: [] }
  }
  sources.unshift(source)
  writeJsonSafe(meta, sources)
  return source
}

export function removeSource(id) {
  const { uploads, meta } = getStoragePaths()
  const sources = listSources()
  const next = sources.filter((item) => item.id !== id)
  if (next.length === sources.length) return false
  const removed = sources.find((item) => item.id === id)
  if (removed) {
    const filePath = path.join(uploads, removed.file_name)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
  writeJsonSafe(meta, next)
  return true
}

export function updateMapping(id, mapping) {
  const { meta } = getStoragePaths()
  const sources = listSources()
  const target = sources.find((item) => item.id === id)
  if (!target) return null
  target.mapping = {
    dimension: mapping.dimension || [],
    metric: mapping.metric || [],
    date: mapping.date || []
  }
  writeJsonSafe(meta, sources)
  return target
}

export function getSourceData(source, limit = 50) {
  const { uploads } = getStoragePaths()
  const filePath = path.join(uploads, source.file_name)
  if (!fs.existsSync(filePath)) return { columns: [], rows: [] }
  const raw = fs.readFileSync(filePath, 'utf-8')
  if (source.type === 'json') return parseJson(raw, limit)
  return parseCsv(raw, limit)
}

export function getSourceSchema(source, limit = 50) {
  const { columns, rows } = getSourceData(source, limit)
  const schema = buildSchema(columns, rows)
  return { schema, preview: rows }
}
