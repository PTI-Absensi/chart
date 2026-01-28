import express from 'express'
import cors from 'cors'
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

const app = express()
app.use(cors())

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', app: 'chart-backend-node' })
})

app.get('/api/symbols', async (req, res) => {
  try {
    const withData = req.query.with_data === 'true'
    const data = await getSymbols(withData)
    res.json({ status: 'success', data })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.get('/api/timeframes', (_req, res) => {
  res.json({ status: 'success', data: getTimeframes() })
})

app.get('/api/ohlc/:symbol', async (req, res) => {
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

app.get('/api/price/:symbol', async (req, res) => {
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

app.get('/api/procurement/symbols', async (_req, res) => {
  try {
    const symbols = await getAllSymbols()
    res.json({ status: 'success', count: symbols.length, data: symbols })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.get('/api/procurement/search', async (req, res) => {
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

app.get('/api/procurement/timeframes', (_req, res) => {
  res.json({ status: 'success', data: getProcurementTimeframes() })
})

app.get('/api/procurement/data/:symbol', async (req, res) => {
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

app.get('/api/procurement/latest/:symbol', async (req, res) => {
  const symbol = String(req.params.symbol || '').toUpperCase()
  try {
    const value = await getLatestValue(symbol)
    res.json({ status: 'success', data: value })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.get('/api/procurement/metrics', (_req, res) => {
  const metrics = getMetricSymbols()
  res.json({ status: 'success', data: metrics })
})

app.get('/api/procurement/plants', async (_req, res) => {
  try {
    const plants = await getPlants()
    res.json({ status: 'success', count: plants.length, data: plants })
  } catch (err) {
    res.status(500).json({ status: 'error', detail: String(err) })
  }
})

app.listen(config.port, () => {
  console.log(`Node backend listening on ${config.port}`)
})
