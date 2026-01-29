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

function generateId() {
  return `tpl_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`
}

const templatesFile = () => getStorageFile('templates.json')

export function listTemplates() {
  const items = readJsonSafe(templatesFile(), [])
  return Array.isArray(items) ? items : []
}

export function getTemplate(id) {
  return listTemplates().find((item) => item.id === id) || null
}

export function addTemplate(payload) {
  const items = listTemplates()
  const now = new Date().toISOString()
  const template = {
    id: generateId(),
    name: payload.name || 'Untitled Template',
    content: payload.content || {},
    created_at: now
  }
  items.unshift(template)
  writeJsonSafe(templatesFile(), items)
  return template
}

export function removeTemplate(id) {
  const items = listTemplates()
  const next = items.filter((item) => item.id !== id)
  if (next.length === items.length) return false
  writeJsonSafe(templatesFile(), next)
  return true
}
