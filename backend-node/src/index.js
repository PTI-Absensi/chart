import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { getSymbols, getTimeframes, fetchOhlcData, getLatestPrice } from './services/dataService.js'

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

app.listen(config.port, () => {
  console.log(`Node backend listening on ${config.port}`)
})
