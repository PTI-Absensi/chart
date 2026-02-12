import format from 'pg-format'
import { query } from '../db.js'
import { loadMapping } from '../mapping.js'

const mapping = loadMapping()
const cache = {
  symbols: null,
  symbolsWithData: null,
  symbolsAt: 0,
  ttlMs: 5 * 60 * 1000
}

const ident = (qualified) => {
  const parts = qualified.split('.').filter(Boolean)
  return parts.map((p) => format.ident(p)).join('.')
}

// Helper to check if using new view-based structure
function isNewViewStructure(series) {
  return series && (
    series.table === 'public.v_fact_doc_weekly_dense' ||
    series.table === 'v_fact_doc_weekly_dense' ||
    series.table === 'public.v_fact_value_weekly_dense_kpi' ||
    series.table === 'v_fact_value_weekly_dense_kpi'
  )
}

// Helper to get value column based on table/view
function getValueColumn(series) {
  if (series.table?.includes('v_fact_value_weekly_dense_kpi')) {
    return series.value_column || 'nilai_kpi'
  }
  return series.value_column || 'count_doc'
}

export async function getSymbols(onlyWithData = false) {
  const now = Date.now()
  if (onlyWithData && cache.symbolsWithData && now - cache.symbolsAt < cache.ttlMs) {
    return cache.symbolsWithData
  }
  if (!onlyWithData && cache.symbols && now - cache.symbolsAt < cache.ttlMs) {
    return cache.symbols
  }
  const symbolsCfg = mapping.symbols
  if (!symbolsCfg) return []
  const { table, columns } = symbolsCfg
  const { symbol, name, fallback_parts: fallbackParts = [] } = columns

  const selectFallback = fallbackParts.length
    ? fallbackParts.map((col) => format.ident(col)).join(', ')
    : "''"

  let sql = `SELECT ${format.ident(symbol)} AS symbol, ${format.ident(name)} AS name, ${selectFallback} FROM ${ident(table)}`

  if (onlyWithData) {
    const withData = symbolsCfg.filters?.with_data
    if (withData) {
      sql += ` WHERE ${format.ident(symbol)} IN (SELECT DISTINCT ${format.ident(withData.column)} FROM ${ident(withData.table)})`
    }
  }

  sql += ` ORDER BY ${format.ident(symbol)}`
  const result = await query(sql)

  const data = result.rows.map((row) => {
    let displayName = row.name || ''
    if (!displayName && fallbackParts.length) {
      const parts = fallbackParts.map((p) => row[p]).filter(Boolean)
      displayName = parts.join(' ')
    }
    return {
      symbol: row.symbol,
      name: displayName,
      type: 'procurement',
      exchange: 'OLAH'
    }
  })
  if (onlyWithData) {
    cache.symbolsWithData = data
  } else {
    cache.symbols = data
  }
  cache.symbolsAt = now
  return data
}

export function getTimeframes() {
  return ['1W']
}

export async function fetchOhlcData(symbol, periodType, year, limit, cumulative) {
  const series = mapping.series
  if (!series) return []

  const isNewView = isNewViewStructure(series)

  if (isNewView) {
    // Use new view-based query structure
    const table = series.table
    const valueCol = getValueColumn(series)

    const sql = `
      WITH weekly AS (
        SELECT week_start::date AS period, ${format.ident(valueCol)} AS value
        FROM ${ident(table)}
        WHERE kode_data = $1
          AND period_type = $2
          AND period_year = $3
        ORDER BY week_start DESC
        LIMIT $4
      ), ordered AS (
        SELECT * FROM weekly ORDER BY period
      )
      SELECT period, value, SUM(value) OVER (ORDER BY period) AS value_cum
      FROM ordered
      ORDER BY period;
    `

    const result = await query(sql, [symbol, periodType, year, limit])
    return result.rows.map((row) => {
      const value = Number(cumulative ? row.value_cum : row.value)
      const ts = Math.floor(new Date(row.period).getTime() / 1000)
      return {
        time: ts,
        open: value,
        high: value,
        low: value,
        close: value,
        volume: value
      }
    })
  } else {
    // Legacy mapping-based query structure (backward compatibility)
    const table = series.table
    const timeCol = series.time_column
    const valueCol = series.value_column
    const symbolCol = series.symbol_column
    const periodTypeCol = series.period_type_column
    const yearCol = series.year_column

    const sql = `
      WITH weekly AS (
        SELECT ${format.ident(timeCol)}::date AS period, SUM(${format.ident(valueCol)}) AS value
        FROM ${ident(table)}
        WHERE ${format.ident(symbolCol)} = $1
          AND ${format.ident(periodTypeCol)} = $2
          AND ${format.ident(yearCol)} = $3
        GROUP BY ${format.ident(timeCol)}
        ORDER BY ${format.ident(timeCol)} DESC
        LIMIT $4
      ), ordered AS (
        SELECT * FROM weekly ORDER BY period
      )
      SELECT period, value, SUM(value) OVER (ORDER BY period) AS value_cum
      FROM ordered
      ORDER BY period;
    `

    const result = await query(sql, [symbol, periodType, year, limit])
    return result.rows.map((row) => {
      const value = Number(cumulative ? row.value_cum : row.value)
      const ts = Math.floor(new Date(row.period).getTime() / 1000)
      return {
        time: ts,
        open: value,
        high: value,
        low: value,
        close: value,
        volume: value
      }
    })
  }
}

export async function getLatestPrice(symbol, periodType, year) {
  const series = mapping.series
  if (!series) {
    return { symbol, price: 0, change: 0, change_percent: 0, timestamp: Math.floor(Date.now() / 1000) }
  }

  const isNewView = isNewViewStructure(series)

  if (isNewView) {
    // Use new view-based query structure
    const table = series.table
    const valueCol = getValueColumn(series)

    const sql = `
      WITH weekly AS (
        SELECT week_start::date AS period, ${format.ident(valueCol)} AS value
        FROM ${ident(table)}
        WHERE kode_data = $1
          AND period_type = $2
          AND period_year = $3
        ORDER BY week_start DESC
        LIMIT 2
      )
      SELECT * FROM weekly ORDER BY period;
    `

    try {
      const result = await query(sql, [symbol, periodType, year])
      if (!result.rows.length) {
        return { symbol, price: 0, change: 0, change_percent: 0, timestamp: Math.floor(Date.now() / 1000) }
      }
      const latest = result.rows[result.rows.length - 1]
      const prev = result.rows.length > 1 ? result.rows[result.rows.length - 2] : latest
      const current = Number(latest.value)
      const previous = Number(prev.value)
      const change = current - previous
      const changePercent = previous ? (change / previous) * 100 : 0
      return {
        symbol,
        price: Math.round(current * 100) / 100,
        change: Math.round(change * 100) / 100,
        change_percent: Math.round(changePercent * 100) / 100,
        timestamp: Math.floor(new Date(latest.period).getTime() / 1000)
      }
    } catch (err) {
      return { symbol, price: 0, change: 0, change_percent: 0, timestamp: Math.floor(Date.now() / 1000) }
    }
  } else {
    // Legacy mapping-based query structure (backward compatibility)
    const table = series.table
    const timeCol = series.time_column
    const valueCol = series.value_column
    const symbolCol = series.symbol_column
    const periodTypeCol = series.period_type_column
    const yearCol = series.year_column

    const sql = `
      WITH weekly AS (
        SELECT ${format.ident(timeCol)}::date AS period, SUM(${format.ident(valueCol)}) AS value
        FROM ${ident(table)}
        WHERE ${format.ident(symbolCol)} = $1
          AND ${format.ident(periodTypeCol)} = $2
          AND ${format.ident(yearCol)} = $3
        GROUP BY ${format.ident(timeCol)}
        ORDER BY ${format.ident(timeCol)} DESC
        LIMIT 2
      )
      SELECT * FROM weekly ORDER BY period;
    `

    try {
      const result = await query(sql, [symbol, periodType, year])
      if (!result.rows.length) {
        return { symbol, price: 0, change: 0, change_percent: 0, timestamp: Math.floor(Date.now() / 1000) }
      }
      const latest = result.rows[result.rows.length - 1]
      const prev = result.rows.length > 1 ? result.rows[result.rows.length - 2] : latest
      const current = Number(latest.value)
      const previous = Number(prev.value)
      const change = current - previous
      const changePercent = previous ? (change / previous) * 100 : 0
      return {
        symbol,
        price: Math.round(current * 100) / 100,
        change: Math.round(change * 100) / 100,
        change_percent: Math.round(changePercent * 100) / 100,
        timestamp: Math.floor(new Date(latest.period).getTime() / 1000)
      }
    } catch (err) {
      return { symbol, price: 0, change: 0, change_percent: 0, timestamp: Math.floor(Date.now() / 1000) }
    }
  }
}
