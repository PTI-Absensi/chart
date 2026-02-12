// Fetch time series NILAI (rupiah) data by kode_data
// This is used for symbols ending with -N suffix
// Strategy: 
// 1. First try v_fact_value_weekly_by_analitic_dense (for codes with specific values like PK, HPS, PP, SPPBJ)
// 2. If no data, fallback to fact_value_weekly using sumber_dana/kategori_plant from analitic (for PR)
async function fetchByKodeDataNilai(kodeData, timeframe = '1W', limit = 500, year = null, periodType = null, raw = false, sumberDana = null, kategoriPlant = null, cumulative = false) {
  // First, lookup the sumber_dana and kategori_plant from analitic table
  const lookupSql = `
    SELECT sumber_dana, kategori_plant, is_value_applicable
    FROM analitic 
    WHERE LOWER(kode_data) = LOWER($1)
    LIMIT 1
  `

  try {
    const lookupResult = await query(lookupSql, [kodeData])
    
    if (!lookupResult.rows.length) {
      console.warn('No analitic entry found for kode_data:', kodeData)
      return []
    }

    const analitic = lookupResult.rows[0]
    const sd = sumberDana || analitic.sumber_dana
    const kp = kategoriPlant || analitic.kategori_plant
    const hasSpecificValue = analitic.is_value_applicable

    // Try view per analitic first (for codes like B100, C001, D100, etc that have specific values)
    if (hasSpecificValue) {
      const viewResult = await fetchFromValueView(kodeData, timeframe, limit, year, periodType, raw, sd, kp, cumulative)
      if (viewResult.length > 0) {
        return viewResult
      }
    }

    // Fallback to global fact_value_weekly (for PR and codes without specific value)
    // This returns total value of all documents (PK+PP+HPS+SPPBJ) for the dimension
    return await fetchFromGlobalValue(sd, kp, timeframe, limit, year, periodType, raw, cumulative)

  } catch (err) {
    console.error('Error fetching nilai by kode_data:', kodeData, err)
    return []
  }
}

// Helper: Query from v_fact_value_weekly_by_analitic_dense
async function fetchFromValueView(kodeData, timeframe, limit, year, periodType, raw, sumberDana, kategoriPlant, cumulative) {
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
  if (sumberDana) {
    whereClauses.push('LOWER(sumber_dana) = LOWER($' + (params.length + 1) + ')')
    params.push(sumberDana)
  }
  if (kategoriPlant) {
    whereClauses.push('LOWER(kategori_plant) = LOWER($' + (params.length + 1) + ')')
    params.push(kategoriPlant)
  }

  const whereSql = 'WHERE ' + whereClauses.join(' AND ')

  let sql
  if (cumulative) {
    sql = `
      SELECT
        week_start as period,
        SUM(value_amount_cum) as cum_value,
        SUM(value_amount) as weekly_value
      FROM v_fact_value_weekly_by_analitic_dense_cum
      ${whereSql}
      GROUP BY week_start
      ORDER BY week_start DESC
      LIMIT $${params.length + 1}
    `
  } else {
    sql = `
      SELECT
        week_start as period,
        SUM(value_amount) as total_value,
        MIN(value_amount) as min_value,
        MAX(value_amount) as max_value,
        AVG(value_amount) as avg_value
      FROM v_fact_value_weekly_by_analitic_dense
      ${whereSql}
      GROUP BY week_start
      ORDER BY week_start DESC
      LIMIT $${params.length + 1}
    `
  }
  params.push(limit)

  const result = await query(sql, params)
  return formatValueResult(result.rows, cumulative)
}

// Helper: Query from global fact_value_weekly
async function fetchFromGlobalValue(sumberDana, kategoriPlant, timeframe, limit, year, periodType, raw, cumulative) {
  let timeTrunc = 'week'
  if (timeframe === '1D') timeTrunc = 'day'
  if (timeframe === '1M') timeTrunc = 'month'
  if (timeframe === '1Y') timeTrunc = year ? 'month' : 'year'

  const whereClauses = []
  const params = []

  if (year) {
    whereClauses.push('period_year = $' + (params.length + 1))
    params.push(year)
  }
  if (periodType) {
    whereClauses.push('period_type = $' + (params.length + 1))
    params.push(periodType)
  }
  if (sumberDana) {
    whereClauses.push('LOWER(sumber_dana) = LOWER($' + (params.length + 1) + ')')
    params.push(sumberDana)
  }
  if (kategoriPlant) {
    whereClauses.push('LOWER(kategori_plant) = LOWER($' + (params.length + 1) + ')')
    params.push(kategoriPlant)
  }

  const whereSql = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : ''

  const sql = `
    SELECT
      DATE_TRUNC('${timeTrunc}', week_start) as period,
      SUM(total_nilai) as total_value,
      MIN(total_nilai) as min_value,
      MAX(total_nilai) as max_value,
      AVG(total_nilai) as avg_value
    FROM fact_value_weekly
    ${whereSql}
    GROUP BY DATE_TRUNC('${timeTrunc}', week_start)
    ORDER BY period DESC
    LIMIT $${params.length + 1}
  `
  params.push(limit)

  const result = await query(sql, params)
  return formatValueResult(result.rows, false)
}

// Helper: Format query result to chart data
function formatValueResult(rows, cumulative) {
  if (!rows || !rows.length) return []
  
  if (cumulative) {
    return rows.reverse().map((row) => {
      const cumValue = Number(row.cum_value || 0)
      const weeklyValue = Number(row.weekly_value || 0)
      const timestamp = row.period ? Math.floor(new Date(row.period).getTime() / 1000) : 0
      return {
        time: timestamp,
        open: cumValue - weeklyValue,
        high: cumValue,
        low: cumValue - weeklyValue,
        close: cumValue,
        volume: weeklyValue
      }
    })
  } else {
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
}
