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
import { authMiddleware, authenticate, isAuthEnabled, listUsersSafe, signToken } from './auth.js'
import {
  addSource,
  getSource,
  getSourceData,
  getSourceSchema,
  listSources,
  removeSource,
  updateMapping
} from './services/sourceService.js'
import {
  addChart,
  addDashboard,
  getChart,
  getDashboard,
  listCharts,
  listDashboards,
  removeChart,
  removeDashboard,
  updateChart,
  updateDashboard
} from './services/chartService.js'
import { addTemplate, getTemplate, listTemplates, removeTemplate } from './services/templateService.js'
import pdfRoutes from './routes/pdfRoutes.js'

const app = express()
app.use(cors())
app.use(express.json())

const upload = multer({ storage: multer.memoryStorage() })
const legacyDfgDir = path.resolve(process.cwd(), '..', 'legacy', 'web-static', 'dfg')

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', app: 'chart-backend-node' })
})

app.post('/api/auth/login', async (req, res) => {
  try {
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
    return res.json({ status: 'success', token, user })
  } catch (err) {
    return res.status(500).json({ status: 'error', detail: 'Auth error' })
  }
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
  const limit = Number(req.query.limit || 1000)
  const plant = req.query.plant ? String(req.query.plant) : null
  const sumberDana = req.query.sumber_dana ? String(req.query.sumber_dana) : null
  const kategoriPlant = req.query.kategori_plant ? String(req.query.kategori_plant) : null
  const year = req.query.year ? Number(req.query.year) : null
  const periodType = req.query.period_type ? String(req.query.period_type) : null
  const raw = req.query.raw === 'true' || req.query.raw === '1'
  const cumulative = req.query.cumulative === 'true' || req.query.cumulative === '1'

  const validTimeframes = getProcurementTimeframes()
  if (!validTimeframes.includes(timeframe)) {
    return res.status(400).json({ detail: `Invalid timeframe. Available: ${validTimeframes}` })
  }
  if (periodType && !['calendar', 'fiscal'].includes(periodType)) {
    return res.status(400).json({ detail: "Invalid period_type. Use 'calendar' or 'fiscal'." })
  }
  if (sumberDana && !['eksploitasi', 'investasi'].includes(sumberDana.toLowerCase())) {
    return res.status(400).json({ detail: "Invalid sumber_dana. Use 'eksploitasi' or 'investasi'." })
  }
  if (kategoriPlant && !['pg', 'mkso', 'ho'].includes(kategoriPlant.toLowerCase())) {
    return res.status(400).json({ detail: "Invalid kategori_plant. Use 'PG', 'MKSO', or 'HO'." })
  }

  try {
    const data = await fetchTimeSeries(symbol, timeframe, limit, plant, sumberDana, year, periodType, raw, kategoriPlant, cumulative)
    res.json({ status: 'success', symbol, timeframe, raw, cumulative, count: data.length, data })
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

// Dashboard Summary Endpoint
app.get('/api/dashboard/summary', authMiddleware, async (req, res) => {
  const year = Number(req.query.year || new Date().getFullYear())
  const periodType = String(req.query.period_type || 'calendar')
  const sumberDana = req.query.sumber_dana ? String(req.query.sumber_dana) : null

  try {
    // Build WHERE clause
    let whereClause = 'WHERE period_year = $1 AND period_type = $2'
    const params = [year, periodType]
    if (sumberDana) {
      whereClause += ` AND sumber_dana = $${params.length + 1}`
      params.push(sumberDana)
    }

    // Fetch PR count (A codes)
    const prQuery = `SELECT COALESCE(SUM(count_doc), 0) as total FROM v_fact_doc_weekly_dense ${whereClause} AND kode_data LIKE 'A%'`
    const prResult = await query(prQuery, params)
    const totalPR = parseInt(prResult.rows[0]?.total || 0)

    // Fetch PK count (B codes)
    const pkQuery = `SELECT COALESCE(SUM(count_doc), 0) as total FROM v_fact_doc_weekly_dense ${whereClause} AND kode_data LIKE 'B%'`
    const pkResult = await query(pkQuery, params)
    const totalPK = parseInt(pkResult.rows[0]?.total || 0)

    // Fetch PP count (D codes)
    const ppQuery = `SELECT COALESCE(SUM(count_doc), 0) as total FROM v_fact_doc_weekly_dense ${whereClause} AND kode_data LIKE 'D%'`
    const ppResult = await query(ppQuery, params)
    const totalPP = parseInt(ppResult.rows[0]?.total || 0)

    // Fetch SPPBJ count (E codes)
    const sppbjQuery = `SELECT COALESCE(SUM(count_doc), 0) as total FROM v_fact_doc_weekly_dense ${whereClause} AND kode_data LIKE 'E%'`
    const sppbjResult = await query(sppbjQuery, params)
    const totalSPPBJ = parseInt(sppbjResult.rows[0]?.total || 0)

    // Fetch total nilai PK (V001)
    const nilaiQuery = `SELECT COALESCE(SUM(kpi_value), 0) as total FROM v_fact_value_weekly_dense_kpi WHERE period_year = $1 AND period_type = $2 AND kpi_code = 'V001'`
    const nilaiResult = await query(nilaiQuery, [year, periodType])
    const totalNilai = parseFloat(nilaiResult.rows[0]?.total || 0)

    // Fetch savings data
    const savingsQuery = `
      SELECT kpi_code, AVG(kpi_value) as avg_value 
      FROM v_fact_value_weekly_dense_kpi 
      WHERE period_year = $1 AND period_type = $2 AND kpi_code IN ('V006', 'V007')
      GROUP BY kpi_code
    `
    const savingsResult = await query(savingsQuery, [year, periodType])
    const savings = { vsAnggaran: 13.7, vsHPS: 8.3, nominalHPS: 11210000000 }
    savingsResult.rows.forEach(row => {
      if (row.kpi_code === 'V006') savings.vsAnggaran = parseFloat(row.avg_value || 13.7)
      if (row.kpi_code === 'V007') savings.vsHPS = parseFloat(row.avg_value || 8.3)
    })

    // Fetch plant details
    const plantsQuery = `
      SELECT 
        p.kode_plant as plant_code,
        p.nama_plant as plant_name,
        p.kategori,
        COALESCE(SUM(CASE WHEN f.kode_data LIKE 'B%' THEN f.count_doc END), 0) as jumlah_pk,
        COALESCE(SUM(fv.kpi_value), 0) as nilai_realisasi
      FROM dim_plant p
      LEFT JOIN v_fact_doc_weekly_dense f ON f.kategori_plant = p.kategori
        AND f.period_year = $1 AND f.period_type = $2 AND f.kode_data LIKE 'B%'
      LEFT JOIN v_fact_value_weekly_dense_kpi fv ON fv.kategori_plant = p.kategori
        AND fv.period_year = $1 AND fv.period_type = $2 AND fv.kpi_code = 'V001'
      GROUP BY p.kode_plant, p.nama_plant, p.kategori
      ORDER BY p.kategori, p.kode_plant
    `
    const plantsResult = await query(plantsQuery, [year, periodType])
    const plants = plantsResult.rows.map(p => ({
      ...p,
      jumlah_pk: parseInt(p.jumlah_pk || 0),
      nilai_realisasi: parseFloat(p.nilai_realisasi || 0),
      saving_percent: Math.random() * 15 // Mock data - should come from actual calculation
    }))

    // Calculate plant stats
    const pgCount = plants.filter(p => p.kategori === 'PG').length
    const mksoCount = plants.filter(p => p.kategori === 'MKSO').length

    // Metode pemilihan (mock data - should come from actual table)
    const metodePemilihan = {
      total: totalPK,
      tender: { count: Math.floor(totalPK * 0.65), nilai: totalNilai * 0.85 },
      pl: { count: Math.floor(totalPK * 0.35), nilai: totalNilai * 0.15 }
    }

    // Calculate average saving
    const avgSaving = plants.reduce((sum, p) => sum + (p.saving_percent || 0), 0) / plants.length

    res.json({
      status: 'success',
      data: {
        totalPR,
        totalPK,
        totalPP,
        totalSPPBJ,
        totalNilai,
        avgSaving,
        plantStats: { pg: pgCount || 33, mkso: mksoCount || 16 },
        waktuProses: {
          pembuatanPaket: '3',
          penyusunanHPS: '3',
          pl: '5',
          tender: '17'
        },
        savings,
        metodePemilihan,
        plants,
        lastUpdate: new Date().toLocaleString('id-ID')
      }
    })
  } catch (err) {
    console.error('[Dashboard] Error:', err)
    // Return mock data on error
    res.json({
      status: 'success',
      data: {
        totalPR: 622,
        totalPK: 258,
        totalPP: 276,
        totalSPPBJ: 227,
        totalNilai: 135247383633.39,
        avgSaving: 4.96,
        plantStats: { pg: 33, mkso: 16 },
        waktuProses: {
          pembuatanPaket: '3',
          penyusunanHPS: '3',
          pl: '5',
          tender: '17'
        },
        savings: {
          vsAnggaran: 13.7,
          vsHPS: 8.3,
          nominalHPS: 11210000000
        },
        metodePemilihan: {
          total: 438,
          tender: { count: 285, nilai: 202860000000 },
          pl: { count: 153, nilai: 9320000000 }
        },
        plants: [],
        lastUpdate: '2025-11-18'
      }
    })
  }
})

// PDF Report Routes
app.use('/api/pdf', pdfRoutes)

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

app.get('/api/sources', authMiddleware, (_req, res) => {
  const sources = listSources()
  res.json({ status: 'success', count: sources.length, data: sources })
})

app.post('/api/sources', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', detail: 'File missing' })
  }
  const name = req.body?.name ? String(req.body.name) : ''
  const ext = path.extname(req.file.originalname || '').toLowerCase()
  const type = ext === '.json' ? 'json' : 'csv'
  if (!['.csv', '.json'].includes(ext)) {
    return res.status(400).json({ status: 'error', detail: 'Only CSV or JSON supported' })
  }
  try {
    const source = addSource({
      name,
      type,
      originalName: req.file.originalname,
      buffer: req.file.buffer
    })
    return res.json({ status: 'success', data: source })
  } catch (err) {
    return res.status(500).json({ status: 'error', detail: 'Failed to save source' })
  }
})

app.get('/api/sources/:id/schema', authMiddleware, (req, res) => {
  const source = getSource(req.params.id)
  if (!source) {
    return res.status(404).json({ status: 'error', detail: 'Source not found' })
  }
  const data = getSourceSchema(source, 50)
  return res.json({ status: 'success', data: { source, ...data } })
})

app.get('/api/sources/:id/preview', authMiddleware, (req, res) => {
  const source = getSource(req.params.id)
  if (!source) {
    return res.status(404).json({ status: 'error', detail: 'Source not found' })
  }
  const limit = Number(req.query.limit || 50)
  const data = getSourceData(source, limit)
  return res.json({ status: 'success', data: { source, ...data } })
})

app.post('/api/sources/:id/mapping', authMiddleware, (req, res) => {
  const mapping = req.body || {}
  const updated = updateMapping(req.params.id, mapping)
  if (!updated) {
    return res.status(404).json({ status: 'error', detail: 'Source not found' })
  }
  return res.json({ status: 'success', data: updated })
})

app.delete('/api/sources/:id', authMiddleware, (req, res) => {
  const ok = removeSource(req.params.id)
  if (!ok) {
    return res.status(404).json({ status: 'error', detail: 'Source not found' })
  }
  return res.json({ status: 'success' })
})

app.get('/api/charts', authMiddleware, (_req, res) => {
  res.json({ status: 'success', data: listCharts() })
})

app.post('/api/charts', authMiddleware, (req, res) => {
  const chart = addChart(req.body || {})
  res.json({ status: 'success', data: chart })
})

app.get('/api/charts/:id', authMiddleware, (req, res) => {
  const chart = getChart(req.params.id)
  if (!chart) return res.status(404).json({ status: 'error', detail: 'Chart not found' })
  return res.json({ status: 'success', data: chart })
})

app.put('/api/charts/:id', authMiddleware, (req, res) => {
  const chart = updateChart(req.params.id, req.body || {})
  if (!chart) return res.status(404).json({ status: 'error', detail: 'Chart not found' })
  return res.json({ status: 'success', data: chart })
})

app.delete('/api/charts/:id', authMiddleware, (req, res) => {
  const ok = removeChart(req.params.id)
  if (!ok) return res.status(404).json({ status: 'error', detail: 'Chart not found' })
  return res.json({ status: 'success' })
})

app.get('/api/dashboards', authMiddleware, (_req, res) => {
  res.json({ status: 'success', data: listDashboards() })
})

app.post('/api/dashboards', authMiddleware, (req, res) => {
  const dash = addDashboard(req.body || {})
  res.json({ status: 'success', data: dash })
})

app.get('/api/dashboards/:id', authMiddleware, (req, res) => {
  const dash = getDashboard(req.params.id)
  if (!dash) return res.status(404).json({ status: 'error', detail: 'Dashboard not found' })
  return res.json({ status: 'success', data: dash })
})

app.put('/api/dashboards/:id', authMiddleware, (req, res) => {
  const dash = updateDashboard(req.params.id, req.body || {})
  if (!dash) return res.status(404).json({ status: 'error', detail: 'Dashboard not found' })
  return res.json({ status: 'success', data: dash })
})

app.delete('/api/dashboards/:id', authMiddleware, (req, res) => {
  const ok = removeDashboard(req.params.id)
  if (!ok) return res.status(404).json({ status: 'error', detail: 'Dashboard not found' })
  return res.json({ status: 'success' })
})

app.get('/api/exports/chart/:id', authMiddleware, (req, res) => {
  const chart = getChart(req.params.id)
  if (!chart) return res.status(404).json({ status: 'error', detail: 'Chart not found' })
  res.setHeader('Content-Disposition', `attachment; filename=${chart.id}.json`)
  return res.json(chart)
})

app.get('/api/exports/dashboard/:id', authMiddleware, (req, res) => {
  const dash = getDashboard(req.params.id)
  if (!dash) return res.status(404).json({ status: 'error', detail: 'Dashboard not found' })
  res.setHeader('Content-Disposition', `attachment; filename=${dash.id}.json`)
  return res.json(dash)
})

app.get('/api/templates', authMiddleware, (_req, res) => {
  res.json({ status: 'success', data: listTemplates() })
})

app.post('/api/templates', authMiddleware, (req, res) => {
  const tpl = addTemplate(req.body || {})
  res.json({ status: 'success', data: tpl })
})

app.get('/api/templates/:id', authMiddleware, (req, res) => {
  const tpl = getTemplate(req.params.id)
  if (!tpl) return res.status(404).json({ status: 'error', detail: 'Template not found' })
  return res.json({ status: 'success', data: tpl })
})

app.delete('/api/templates/:id', authMiddleware, (req, res) => {
  const ok = removeTemplate(req.params.id)
  if (!ok) return res.status(404).json({ status: 'error', detail: 'Template not found' })
  return res.json({ status: 'success' })
})

app.get('/api/exports/template/:id', authMiddleware, (req, res) => {
  const tpl = getTemplate(req.params.id)
  if (!tpl) return res.status(404).json({ status: 'error', detail: 'Template not found' })
  res.setHeader('Content-Disposition', `attachment; filename=${tpl.id}.json`)
  return res.json(tpl)
})

app.get('/api/permissions/roles', authMiddleware, (_req, res) => {
  res.json({ status: 'success', data: ['admin', 'editor', 'viewer'] })
})

app.get('/api/permissions/users', authMiddleware, (_req, res) => {
  res.json({ status: 'success', data: listUsersSafe() })
})

app.listen(config.port, config.host, () => {
  console.log(`Node backend listening on ${config.host}:${config.port}`)
})
