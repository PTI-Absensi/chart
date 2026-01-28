import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import multer from 'multer'
import { config } from './config.js'
import { getSymbols, getTimeframes, fetchOhlcData, getLatestPrice } from './services/dataService.js'
import {
  getAllSymbols,
  searchSymbols,
  getTimeframes as getProcurementTimeframes,
  fetchTimeSeries,
  getLatestValue,
  getMetricSymbols,
  getPlants
} from './services/procurementService.js'
import { authMiddleware, authenticate, isAuthEnabled, signToken } from './auth.js'

const app = express()
app.use(cors())
app.use(express.json())

const upload = multer({ storage: multer.memoryStorage() })
const legacyDfgDir = path.resolve(process.cwd(), '..', 'legacy', 'web-static', 'dfg')

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', app: 'chart-backend-node' })
})

app.post('/api/auth/login', async (req, res) => {
  if (!isAuthEnabled()) {
    return res.json({ status: 'success', token: null, user: { username: 'guest', roles: [] } })
  }
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ status: 'error', detail: 'Missing credentials' })
  }
  const user = await authenticate(username, password)
  if (!user) {
    return res.status(401).json({ status: 'error', detail: 'Invalid credentials' })
  }
  const token = signToken(user)
  res.json({ status: 'success', token, user })
})

app.get('/api/auth/me', authMiddleware, (req, res) => {
  if (!isAuthEnabled()) {
    return res.json({ status: 'success', user: { username: 'guest', roles: [] } })
  }
  res.json({ status: 'success', user: req.user })
})

app.get('/api/symbols', authMiddleware, async (req, res) => {
  try {
    const withData = req.query.with_data === 'true'
    const data = await getSymbols(withData)
    res.json({ status: 'success', data })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.get('/api/timeframes', authMiddleware, (_req, res) => {
  res.json({ status: 'success', data: getTimeframes() })
})

app.get('/api/ohlc/:symbol', authMiddleware, async (req, res) => {
  const symbol = String(req.params.symbol || '').trim()
  const periodType = String(req.query.period_type || 'calendar')
  const year = Number(req.query.year || 2025)
  const limit = Number(req.query.limit || 500)
  const cumulative = String(req.query.cumulative || 'false') === 'true'

  try {
    const symbols = await getSymbols(false)
    const validSymbols = symbols.map((s) => s.symbol)
    let normalized = symbol
    if (!validSymbols.includes(normalized) && validSymbols.includes(normalized.toUpperCase())) {
      normalized = normalized.toUpperCase()
    }
    if (!validSymbols.includes(normalized)) {
      return res.status(404).json({ detail: `Kode data ${symbol} not found. Available: ${validSymbols}` })
    }

    const data = await fetchOhlcData(normalized, periodType, year, limit, cumulative)
    res.json({
      status: 'success',
      symbol: normalized,
      period_type: periodType,
      year,
      count: data.length,
      data
    })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.get('/api/price/:symbol', authMiddleware, async (req, res) => {
  const symbol = String(req.params.symbol || '').trim()
  const periodType = String(req.query.period_type || 'calendar')
  const year = Number(req.query.year || 2025)

  try {
    const price = await getLatestPrice(symbol, periodType, year)
    res.json({ status: 'success', data: price })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.get('/api/procurement/symbols', authMiddleware, async (_req, res) => {
  try {
    const symbols = await getAllSymbols()
    res.json({ status: 'success', count: symbols.length, data: symbols })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.get('/api/procurement/search', authMiddleware, async (req, res) => {
  const q = String(req.query.q || '')
  const limit = Number(req.query.limit || 20)
  if (!q) {
    return res.json({ status: 'success', data: [] })
  }
  try {
    const results = await searchSymbols(q, limit)
    res.json({ status: 'success', query: q, count: results.length, data: results })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.get('/api/procurement/timeframes', authMiddleware, (_req, res) => {
  res.json({ status: 'success', data: getProcurementTimeframes() })
})

app.get('/api/procurement/data/:symbol', authMiddleware, async (req, res) => {
  const symbol = String(req.params.symbol || '').toUpperCase()
  const timeframe = String(req.query.timeframe || '1W')
  const limit = Number(req.query.limit || 200)
  const plant = req.query.plant ? String(req.query.plant) : null
  const sumberDana = req.query.sumber_dana ? String(req.query.sumber_dana) : null
  const year = req.query.year ? Number(req.query.year) : null
  const periodType = req.query.period_type ? String(req.query.period_type) : null

  const validTimeframes = getProcurementTimeframes()
  if (!validTimeframes.includes(timeframe)) {
    return res.status(400).json({ detail: `Invalid timeframe. Available: ${validTimeframes}` })
  }
  if (periodType && !['calendar', 'fiscal'].includes(periodType)) {
    return res.status(400).json({ detail: "Invalid period_type. Use 'calendar' or 'fiscal'." })
  }

  try {
    const data = await fetchTimeSeries(symbol, timeframe, limit, plant, sumberDana, year, periodType)
    res.json({ status: 'success', symbol, timeframe, count: data.length, data })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.get('/api/procurement/latest/:symbol', authMiddleware, async (req, res) => {
  const symbol = String(req.params.symbol || '').toUpperCase()
  try {
    const value = await getLatestValue(symbol)
    res.json({ status: 'success', data: value })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.get('/api/procurement/metrics', authMiddleware, (_req, res) => {
  const metrics = getMetricSymbols()
  res.json({ status: 'success', data: metrics })
})

app.get('/api/procurement/plants', authMiddleware, async (_req, res) => {
  try {
    const plants = await getPlants()
    res.json({ status: 'success', count: plants.length, data: plants })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.get('/api/dfg/preview', authMiddleware, (req, res) => {
  const table = String(req.query.table || 'fact_event_log_v2')
  const mode = String(req.query.mode || 'event')
  const format = String(req.query.format || 'png')
  const minEdge = String(req.query.min_edge || '1')
  const tahun = String(req.query.tahun_anggaran || '').trim()
  const sumber = String(req.query.sumber_dana || '').trim()
  const kategori = String(req.query.kategori_plant || '').trim()
  const startDate = String(req.query.start_date || '').trim()
  const endDate = String(req.query.end_date || '').trim()

  const safeTable = table.replace(/[^a-zA-Z0-9_]/g, '')
  const safeMode = mode.replace(/[^a-zA-Z0-9_]/g, '')
  const safeFormat = format.replace(/[^a-zA-Z0-9]/g, '')
  const fileName = `${safeTable}_${safeMode}_${tahun || 'all'}.${safeFormat}`
  const filePath = path.join(legacyDfgDir, fileName)
  const exists = fs.existsSync(filePath)

  let cmd = `dfg_cli --table ${safeTable} --mode ${safeMode} --format ${safeFormat} --min-edge ${minEdge}`
  if (tahun) cmd += ` --tahun-anggaran ${tahun}`
  if (sumber) cmd += ` --sumber-dana ${sumber}`
  if (kategori) cmd += ` --kategori-plant ${kategori}`
  if (startDate) cmd += ` --start-date ${startDate}`
  if (endDate) cmd += ` --end-date ${endDate}`

  res.json({
    status: 'success',
    command: cmd,
    file_name: fileName,
    exists,
    file_url: exists ? `/api/dfg/file?name=${encodeURIComponent(fileName)}` : null
  })
})

app.get('/api/dfg/file', authMiddleware, (req, res) => {
  const name = String(req.query.name || '')
  const filePath = path.join(legacyDfgDir, name)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ status: 'error', detail: 'File not found' })
  }
  res.sendFile(filePath)
})

app.post('/api/process-time/parse', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', detail: 'File missing' })
  }
  const raw = req.file.buffer.toString('utf-8')
  const name = req.file.originalname.toLowerCase()
  try {
    let rows = []
    if (name.endsWith('.json')) {
      rows = JSON.parse(raw)
    } else {
      const lines = raw.trim().split(/\r?\n/)
      const header = lines.shift()
      if (!header) return res.json({ status: 'success', data: [] })
      const cols = header.split(',').map((c) => c.trim())
      rows = lines.map((line) => {
        const values = line.split(',').map((v) => v.trim())
        const record = {}
        cols.forEach((col, idx) => {
          record[col] = values[idx]
        })
        return record
      })
    }

    const normalized = rows.map((row) => ({
      metric: row.metric ?? row.Metric ?? '',
      avg_hari_kerja: row.avg_hari_kerja ?? row.avg ?? row['Avg hari kerja'] ?? '',
      jumlah_paket: row.jumlah_paket ?? row.count ?? row['Jumlah paket'] ?? ''
    }))

    res.json({ status: 'success', count: normalized.length, data: normalized })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: 'Failed to parse file' })
  }
})

app.listen(config.port, () => {
  console.log(`Node backend listening on ${config.port}`)
})
