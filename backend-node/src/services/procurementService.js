import format from 'pg-format'
import { query } from '../db.js'

const METRICS = {
  DOC_PR: {
    name: 'Jumlah PR',
    category: 'metric',
    description: 'Purchase Requisition count',
    unit: 'Dokumen',
    table: 'fact_doc_weekly',
    column: 'count_doc',
    filter: "doc_type = 'PR'"
  },
  DOC_PK: {
    name: 'Jumlah PK',
    category: 'metric',
    description: 'Purchase Order count',
    unit: 'Dokumen',
    table: 'fact_doc_weekly',
    column: 'count_doc',
    filter: "doc_type = 'PK'"
  },
  DOC_PP: {
    name: 'Jumlah PP',
    category: 'metric',
    description: 'Procurement Proposal count',
    unit: 'Dokumen',
    table: 'fact_doc_weekly',
    column: 'count_doc',
    filter: "doc_type = 'PP'"
  },
  DOC_SPPBJ: {
    name: 'Jumlah SPPBJ',
    category: 'metric',
    description: 'SPPBJ count',
    unit: 'Dokumen',
    table: 'fact_doc_weekly',
    column: 'count_doc',
    filter: "doc_type = 'SPPBJ'"
  },
  DOC_ALL: {
    name: 'Semua Dokumen',
    category: 'metric',
    description: 'Total document count',
    unit: 'Dokumen',
    table: 'fact_doc_weekly',
    column: 'count_doc',
    filter: null
  },
  VAL_TOTAL: {
    name: 'Total Nilai',
    category: 'metric',
    description: 'Total nilai (Rp)',
    unit: 'Rp',
    table: 'fact_value_weekly',
    column: 'total_nilai',
    filter: null
  },
  VAL_ANGGARAN: {
    name: 'Anggaran',
    category: 'metric',
    description: 'Total anggaran (Rp)',
    unit: 'Rp',
    table: 'fact_value_weekly',
    column: 'anggaran',
    filter: null
  },
  VAL_HPS: {
    name: 'HPS',
    category: 'metric',
    description: 'Total HPS (Rp)',
    unit: 'Rp',
    table: 'fact_value_weekly',
    column: 'hps',
    filter: null
  },
  VAL_REALISASI: {
    name: 'Realisasi',
    category: 'metric',
    description: 'Total realisasi (Rp)',
    unit: 'Rp',
    table: 'fact_value_weekly',
    column: 'realisasi',
    filter: null
  },
  VAL_SAVING: {
    name: 'Saving',
    category: 'metric',
    description: 'Total saving (Rp)',
    unit: 'Rp',
    table: 'fact_value_weekly',
    column: 'saving_nilai',
    filter: null
  }
}

const TIMEFRAMES = ['1D', '1W', '1M', '1Y']

const cache = {
  plants: null,
  plantsAt: 0,
  kategori: null,
  kategoriAt: 0,
  ttlMs: 10 * 60 * 1000
}

export function getTimeframes() {
  return TIMEFRAMES
}

export async function getPlants() {
  const now = Date.now()
  if (cache.plants && now - cache.plantsAt < cache.ttlMs) {
    return cache.plants
  }
  const sql = `
    SELECT kode, nama, kategori, regional
    FROM dim_plant
    ORDER BY nama
  `
  const result = await query(sql)
  const data = result.rows.map((row) => ({
    symbol: `PLANT_${row.kode}`,
    name: row.nama,
    category: 'plant',
    description: `${row.kategori || ''} - ${row.regional || ''}`.trim(),
    unit: 'Unit'
  }))
  cache.plants = data
  cache.plantsAt = now
  return data
}

export function getSumberDanaSymbols() {
  return [
    {
      symbol: 'DANA_EKSPLOITASI',
      name: 'Eksploitasi',
      category: 'sumber_dana',
      description: 'Dana Operasional (Ops)',
      unit: ''
    },
    {
      symbol: 'DANA_INVESTASI',
      name: 'Investasi',
      category: 'sumber_dana',
      description: 'Dana Capital Expenditure (Capex)',
      unit: ''
    }
  ]
}

export async function getKategoriSymbols() {
  const now = Date.now()
  if (cache.kategori && now - cache.kategoriAt < cache.ttlMs) {
    return cache.kategori
  }
  const sql = `
    SELECT DISTINCT kategori_plant
    FROM fact_value_weekly
    WHERE kategori_plant IS NOT NULL
    ORDER BY kategori_plant
  `
  const result = await query(sql)
  const data = result.rows
    .map((row) => row.kategori_plant)
    .filter(Boolean)
    .map((kategori) => ({
      symbol: `KAT_${kategori}`,
      name: `${kategori}`,
      category: 'kategori',
      description: 'Kategori plant (agregat)',
      unit: 'Rp'
    }))
  cache.kategori = data
  cache.kategoriAt = now
  return data
}

export async function getKategoriDanaSymbols() {
  const base = await getKategoriSymbols()
  const result = []
  base.forEach((item) => {
    result.push({
      symbol: `${item.symbol}_EKS`,
      name: `${item.name} - Eksploitasi`,
      category: 'kategori',
      description: 'Kategori plant (Eksploitasi)',
      unit: 'Rp'
    })
    result.push({
      symbol: `${item.symbol}_INV`,
      name: `${item.name} - Investasi`,
      category: 'kategori',
      description: 'Kategori plant (Investasi)',
      unit: 'Rp'
    })
  })
  return result
}

export async function getPlantDanaSymbols() {
  const plants = await getPlants()
  const result = []
  plants.forEach((plant) => {
    result.push({
      symbol: `${plant.symbol}_EKS`,
      name: `${plant.name} - Eksploitasi`,
      category: 'plant',
      description: `${plant.description} | Eksploitasi`,
      unit: 'Rp'
    })
    result.push({
      symbol: `${plant.symbol}_INV`,
      name: `${plant.name} - Investasi`,
      category: 'plant',
      description: `${plant.description} | Investasi`,
      unit: 'Rp'
    })
  })
  return result
}

export function getMetricSymbols() {
  return Object.entries(METRICS).map(([symbol, metric]) => ({
    symbol,
    name: metric.name,
    category: metric.category,
    description: metric.description,
    unit: metric.unit
  }))
}

export async function getAllSymbols() {
  // Query from analitic table in database
  const sql = `
    SELECT 
      kode_data as symbol,
      nama_dokumen as name,
      COALESCE(status, 'metric') as category,
      COALESCE("desc", nama_dokumen) as description,
      COALESCE(sumber_dana, '') as sumber_dana,
      COALESCE(kategori_plant, '') as kategori_plant
    FROM analitic
    ORDER BY kode_data
  `
  try {
    const result = await query(sql)
    return result.rows.map(row => ({
      symbol: row.symbol,
      name: row.name,
      category: row.category,
      description: row.description,
      unit: 'Dokumen',
      sumber_dana: row.sumber_dana,
      kategori_plant: row.kategori_plant
    }))
  } catch (err) {
    console.error('Error fetching symbols from analitic:', err)
    // Fallback to hardcoded if table doesn't exist
    const symbols = []
    symbols.push(...getMetricSymbols())
    symbols.push(...(await getKategoriSymbols()))
    symbols.push(...(await getPlants()))
    symbols.push(...getSumberDanaSymbols())
    return symbols
  }
}

export async function searchSymbols(queryText, limit = 20) {
  const q = queryText.toLowerCase()
  const all = await getAllSymbols()
  const results = []
  for (const symbol of all) {
    if (
      symbol.symbol.toLowerCase().includes(q) ||
      symbol.name.toLowerCase().includes(q) ||
      symbol.description.toLowerCase().includes(q)
    ) {
      results.push(symbol)
      if (results.length >= limit) break
    }
  }
  return results
}

async function fetchMetricData(metricInfo, timeframe, limit, plantFilter, sumberDanaFilter, year, periodType) {
  const table = metricInfo.table
  const column = metricInfo.column
  const metricFilter = metricInfo.filter

  let timeTrunc = 'week'
  if (timeframe === '1D') timeTrunc = 'day'
  if (timeframe === '1M') timeTrunc = 'month'
  if (timeframe === '1Y') timeTrunc = year ? 'month' : 'year'

  const whereClauses = []
  const params = []

  if (metricFilter) {
    whereClauses.push(metricFilter)
  }
  if (year) {
    whereClauses.push('period_year = $' + (params.length + 1))
    params.push(year)
  }
  if (periodType) {
    whereClauses.push('period_type = $' + (params.length + 1))
    params.push(periodType)
  }
  if (plantFilter) {
    whereClauses.push('kategori_plant = $' + (params.length + 1))
    params.push(plantFilter)
  }
  if (sumberDanaFilter) {
    whereClauses.push('sumber_dana = $' + (params.length + 1))
    params.push(sumberDanaFilter)
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

  const sql = `
    SELECT
      DATE_TRUNC('${timeTrunc}', week_start) as period,
      SUM(${format.ident(column)}) as total_value,
      MIN(${format.ident(column)}) as min_value,
      MAX(${format.ident(column)}) as max_value,
      AVG(${format.ident(column)}) as avg_value
    FROM ${format.ident(table)}
    ${whereSql}
    GROUP BY DATE_TRUNC('${timeTrunc}', week_start)
    ORDER BY period DESC
    LIMIT $${params.length + 1}
  `
  params.push(limit)
  const result = await query(sql, params)
  const rows = result.rows || []
  if (!rows.length) return []

  return rows.reverse().map((row) => {
    const value = Number(row.total_value || 0)
    const minVal = Number(row.min_value || value)
    const maxVal = Number(row.max_value || value)
    const avgVal = Number(row.avg_value || value)
    const timestamp = row.period ? Math.floor(new Date(row.period).getTime() / 1000) : 0
    return {
      time: timestamp,
      open: minVal,
      high: maxVal,
      low: minVal,
      close: avgVal,
      volume: value
    }
  })
}

export async function fetchTimeSeries(symbol, timeframe = '1W', limit = 500, plant, sumberDana, year, periodType, raw = false) {
  if (symbol.startsWith('DOC_') || symbol.startsWith('VAL_')) {
    const metricInfo = METRICS[symbol]
    if (!metricInfo) return []
    return fetchMetricData(metricInfo, timeframe, limit, plant, sumberDana, year, periodType)
  }

  if (symbol.startsWith('PLANT_')) {
    let plantCode = symbol.replace('PLANT_', '')
    let sumberDanaOverride = null
    if (plantCode.endsWith('_INV')) {
      plantCode = plantCode.slice(0, -4)
      sumberDanaOverride = 'investasi'
    } else if (plantCode.endsWith('_EKS')) {
      plantCode = plantCode.slice(0, -4)
      sumberDanaOverride = 'eksploitasi'
    }
    return fetchMetricData(
      { table: 'fact_value_weekly', column: 'total_nilai' },
      timeframe,
      limit,
      plantCode,
      sumberDanaOverride || sumberDana,
      year,
      periodType
    )
  }

  if (symbol.startsWith('KAT_')) {
    let kategori = symbol.replace('KAT_', '')
    let sumberDanaOverride = null
    if (kategori.endsWith('_INV')) {
      kategori = kategori.slice(0, -4)
      sumberDanaOverride = 'investasi'
    } else if (kategori.endsWith('_EKS')) {
      kategori = kategori.slice(0, -4)
      sumberDanaOverride = 'eksploitasi'
    }
    return fetchMetricData(
      { table: 'fact_value_weekly', column: 'total_nilai' },
      timeframe,
      limit,
      kategori,
      sumberDanaOverride || sumberDana,
      year,
      periodType
    )
  }

  if (symbol.startsWith('DANA_')) {
    const sumber = symbol.includes('EKSPLOITASI') ? 'eksploitasi' : 'investasi'
    return fetchMetricData(
      { table: 'fact_value_weekly', column: 'total_nilai' },
      timeframe,
      limit,
      plant,
      sumber,
      year,
      periodType
    )
  }

  // Default: query by kode_data from fact_doc_weekly
  // This handles A1, A2, B001, C001, D001, E001, etc.
  return fetchByKodeData(symbol, timeframe, limit, year, periodType, raw)
}

// Fetch time series data by kode_data from fact_doc_weekly
async function fetchByKodeData(kodeData, timeframe = '1W', limit = 500, year = null, periodType = null, raw = false) {
  // Case-insensitive matching for kode_data
  const whereClauses = ['LOWER(kode_data) = LOWER($1)']
  const params = [kodeData]

  if (year) {
    whereClauses.push('period_year = $' + (params.length + 1))
    params.push(year)
  }
  if (periodType) {
    whereClauses.push('period_type = $' + (params.length + 1))
    params.push(periodType)
  }

  const whereSql = 'WHERE ' + whereClauses.join(' AND ')

  let sql
  if (raw) {
    // Raw mode: return individual rows without aggregation
    sql = `
      SELECT
        week_start as period,
        count_doc as value,
        kategori_plant,
        sumber_dana
      FROM fact_doc_weekly
      ${whereSql}
      ORDER BY week_start DESC
      LIMIT $${params.length + 1}
    `
  } else {
    // Aggregated mode (default)
    let timeTrunc = 'week'
    if (timeframe === '1D') timeTrunc = 'day'
    if (timeframe === '1M') timeTrunc = 'month'
    if (timeframe === '1Y') timeTrunc = year ? 'month' : 'year'

    sql = `
      SELECT
        DATE_TRUNC('${timeTrunc}', week_start) as period,
        SUM(count_doc) as total_value,
        MIN(count_doc) as min_value,
        MAX(count_doc) as max_value,
        AVG(count_doc) as avg_value
      FROM fact_doc_weekly
      ${whereSql}
      GROUP BY DATE_TRUNC('${timeTrunc}', week_start)
      ORDER BY period DESC
      LIMIT $${params.length + 1}
    `
  }
  params.push(limit)

  try {
    const result = await query(sql, params)
    const rows = result.rows || []
    if (!rows.length) return []

    if (raw) {
      // Return raw data format
      return rows.reverse().map((row) => {
        const value = Number(row.value || 0)
        const timestamp = row.period ? Math.floor(new Date(row.period).getTime() / 1000) : 0
        return {
          time: timestamp,
          open: value,
          high: value,
          low: value,
          close: value,
          volume: value,
          kategori_plant: row.kategori_plant,
          sumber_dana: row.sumber_dana
        }
      })
    } else {
      // Return aggregated data format
      return rows.reverse().map((row) => {
        const value = Number(row.total_value || 0)
        const minVal = Number(row.min_value || value)
        const maxVal = Number(row.max_value || value)
        const avgVal = Number(row.avg_value || value)
        const timestamp = row.period ? Math.floor(new Date(row.period).getTime() / 1000) : 0
        return {
          time: timestamp,
          open: minVal,
          high: maxVal,
          low: minVal,
          close: avgVal,
          volume: value
        }
      })
    }
  } catch (err) {
    console.error('Error fetching by kode_data:', kodeData, err)
    return []
  }
}

export async function getLatestValue(symbol) {
  const data = await fetchTimeSeries(symbol, '1W', 2)
  if (data.length < 2) {
    return {
      symbol,
      value: 0,
      change: 0,
      change_percent: 0,
      timestamp: Math.floor(Date.now() / 1000)
    }
  }
  const current = data[data.length - 1]
  const previous = data[data.length - 2]
  const change = current.close - previous.close
  const changePercent = previous.close ? (change / previous.close) * 100 : 0
  return {
    symbol,
    value: current.close,
    change: Math.round(change * 100) / 100,
    change_percent: Math.round(changePercent * 100) / 100,
    timestamp: current.time
  }
}
