import format from 'pg-format'
import { query } from '../db.js'
import { loadMapping } from '../mapping.js'

const mapping = loadMapping()

const ident = (qualified) => {
  const parts = qualified.split('.').filter(Boolean)
  return parts.map((p) => format.ident(p)).join('.')
}

export async function getSymbols(onlyWithData = false) {
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

  return result.rows.map((row) => {
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
}

export function getTimeframes() {
  return ['1W']
}

export async function fetchOhlcData(symbol, periodType, year, limit, cumulative) {
  const series = mapping.series
  if (!series) return []
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

export async function getLatestPrice(symbol, periodType, year) {
  const series = mapping.series
  if (!series) {
    return { symbol, price: 0, change: 0, change_percent: 0, timestamp: Math.floor(Date.now() / 1000) }
  }
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
