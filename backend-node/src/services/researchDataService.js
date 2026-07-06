import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..')
const RESEARCH_ROOT = path.join(REPO_ROOT, 'vendor', 'riseteu')
const EPSILON = 1e-6

const RESEARCH_SYMBOLS = [
  {
    symbol: 'EURUSD',
    name: 'EUR/USD Research',
    category: 'research',
    description: 'Research dataset and predictions from riseteu',
    unit: 'FX',
    symbolType: 'nilai',
    provider: 'research'
  }
]

const MODEL_LABELS = {
  bilstm: 'BiLSTM + FLF',
  lstm: 'FLF-LSTM',
  arima: 'ARIMA'
}

const DATASET_CONFIG = {
  '4h': {
    label: 'EURUSD H4',
    scenario: 'tvt_v02_last3',
    rawPath: 'EURUSD_H4_25Oct17.csv',
    comparisonReports: [
      'comparison/tvt_v02/h4/comparison_models_h4_tvt_v02_last3_v01.html'
    ],
    comparisonRoot: 'comparison/tvt_v02/h4',
    comparisonStem: 'comparison_models_h4_tvt_v02_last3_v01',
    splitsRoot: 'results/splits/tvt_v02/h4',
    foldScope: 'results/splits/tvt_v02/h4/fold_scope_tvt_v02.json',
    models: {
      bilstm: {
        label: MODEL_LABELS.bilstm,
        resultDir: 'FLF_BILSTM/results/tvt_v02/h4_evaluation_last3',
        summaryPath: 'FLF_BILSTM/results/tvt_v02/h4_evaluation_last3/rolling_tvt_summary.csv',
        bestConfigPath: 'FLF_BILSTM/bilstm_flf_config_h4_tvt_v02_best.json',
        tuningDir: 'FLF_BILSTM/results/tvt_v02/bilstm_pipeline_h4_tuning_last6'
      },
      lstm: {
        label: MODEL_LABELS.lstm,
        resultDir: 'FLF_LSTM/results/tvt_v02/h4_evaluation_last3',
        summaryPath: 'FLF_LSTM/results/tvt_v02/h4_evaluation_last3/rolling_tvt_summary.csv',
        bestConfigPath: 'FLF_LSTM/lstm_flf_config_h4_tvt_v02_best.json',
        tuningDir: 'FLF_LSTM/results/tvt_v02/lstm_pipeline_h4_tuning_last6'
      },
      arima: {
        label: MODEL_LABELS.arima,
        resultDir: 'Arima/result/tvt_v02/h4_evaluation_last3',
        summaryPath: 'Arima/result/tvt_v02/h4_evaluation_last3/rolling_tvt_summary.csv',
        configPath: 'Arima/arima_baseline_config.json'
      }
    }
  },
  '1D': {
    label: 'EURUSD D1',
    scenario: 'tvt_v02_last3',
    rawPath: 'EURUSD_D1_25Oct17.csv',
    comparisonReports: [
      'comparison/tvt_v02/d1/comparison_models_d1_tvt_v02_last3_v01.html'
    ],
    comparisonRoot: 'comparison/tvt_v02/d1',
    comparisonStem: 'comparison_models_d1_tvt_v02_last3_v01',
    splitsRoot: 'results/splits/tvt_v02/d1',
    foldScope: 'results/splits/tvt_v02/d1/fold_scope_tvt_v02.json',
    models: {
      bilstm: {
        label: MODEL_LABELS.bilstm,
        resultDir: 'FLF_BILSTM/results/tvt_v02/d1_ohlc/d1_evaluation_last3',
        summaryPath: 'FLF_BILSTM/results/tvt_v02/d1_ohlc/d1_evaluation_last3/rolling_tvt_summary.csv',
        bestConfigPath: 'FLF_BILSTM/configs/d1_ohlc/bilstm_flf_config_d1_tvt_v02_best.json',
        tuningDir: 'FLF_BILSTM/results/tvt_v02/d1_ohlc/bilstm_pipeline_d1_tuning_last6'
      },
      lstm: {
        label: MODEL_LABELS.lstm,
        resultDir: 'FLF_LSTM/results/tvt_v02/d1_ohlc/d1_evaluation_last3',
        summaryPath: 'FLF_LSTM/results/tvt_v02/d1_ohlc/d1_evaluation_last3/rolling_tvt_summary.csv',
        bestConfigPath: 'FLF_LSTM/configs/d1_ohlc/lstm_flf_config_d1_tvt_v02_best.json',
        tuningDir: 'FLF_LSTM/results/tvt_v02/d1_ohlc/lstm_pipeline_d1_tuning_last6'
      },
      arima: {
        label: MODEL_LABELS.arima,
        resultDir: 'Arima/result/tvt_v02/d1_evaluation_last3',
        summaryPath: 'Arima/result/tvt_v02/d1_evaluation_last3/rolling_tvt_summary.csv',
        configPath: 'Arima/arima_baseline_config_d1_ohlc_v01.json'
      }
    }
  }
}

const rawCache = new Map()
const preparedCache = new Map()

function resolveResearchPath(relativePath) {
  return path.join(RESEARCH_ROOT, relativePath)
}

function readDelimited(filePath, delimiter) {
  const raw = fs.readFileSync(filePath, 'utf-8').trim()
  const lines = raw.split(/\r?\n/).filter(Boolean)
  const headers = lines[0].split(delimiter).map((value) => value.trim())
  return lines.slice(1).map((line) => {
    const cells = line.split(delimiter)
    const row = {}
    headers.forEach((header, index) => {
      row[header] = String(cells[index] ?? '').trim()
    })
    return row
  })
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(resolveResearchPath(relativePath), 'utf-8'))
}

function parseResearchTimestamp(value) {
  const text = String(value || '').trim()
  if (!text) return 0
  const dotted = text.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/)
  const iso = dotted
    ? null
    : text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/)
  const match = dotted || iso
  if (!match) return 0
  const [, year, month, day, hour = '0', minute = '0', second = '0'] = match
  return Math.floor(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ) / 1000
  )
}

function parseNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function createComparableRow(row) {
  return {
    open: parseNumber(row.open ?? row.Open),
    high: parseNumber(row.high ?? row.High),
    low: parseNumber(row.low ?? row.Low),
    close: parseNumber(row.close ?? row.Close)
  }
}

function rowsEqual(left, right) {
  return ['open', 'high', 'low', 'close'].every((key) => {
    const a = Number(left?.[key])
    const b = Number(right?.[key])
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= EPSILON
  })
}

function buildRawRows(relativePath) {
  const cacheKey = `raw:${relativePath}`
  if (rawCache.has(cacheKey)) {
    return rawCache.get(cacheKey)
  }
  const parsed = readDelimited(resolveResearchPath(relativePath), '\t')
  const rows = parsed.map((row) => ({
    time: parseResearchTimestamp(row.datetime),
    datetime: row.datetime,
    open: parseNumber(row.Open),
    high: parseNumber(row.High),
    low: parseNumber(row.Low),
    close: parseNumber(row.Close)
  }))
  rawCache.set(cacheKey, rows)
  return rows
}

function buildFoldRows(relativePath) {
  const cacheKey = `fold:${relativePath}`
  if (rawCache.has(cacheKey)) {
    return rawCache.get(cacheKey)
  }
  const parsed = readDelimited(resolveResearchPath(relativePath), ',')
  const rows = parsed.map((row) => createComparableRow(row))
  rawCache.set(cacheKey, rows)
  return rows
}

function buildPredRows(relativePath) {
  const cacheKey = `pred:${relativePath}`
  if (rawCache.has(cacheKey)) {
    return rawCache.get(cacheKey)
  }
  const parsed = readDelimited(resolveResearchPath(relativePath), ',')
  const rows = parsed.map((row) => ({
    pred_open: parseNumber(row.pred_open),
    pred_high: parseNumber(row.pred_high),
    pred_low: parseNumber(row.pred_low),
    pred_close: parseNumber(row.pred_close),
    true_open: parseNumber(row.true_open),
    true_high: parseNumber(row.true_high),
    true_low: parseNumber(row.true_low),
    true_close: parseNumber(row.true_close)
  }))
  rawCache.set(cacheKey, rows)
  return rows
}

function buildSummaryRows(relativePath) {
  const cacheKey = `summary:${relativePath}`
  if (rawCache.has(cacheKey)) {
    return rawCache.get(cacheKey)
  }
  const parsed = readDelimited(resolveResearchPath(relativePath), ',')
  const rows = parsed.map((row) => ({
    fold: Number(row.fold),
    train_start: row.train_core_start || row.train_start || null,
    train_end: row.train_core_end || row.train_end || null,
    validation_start: row.validation_start || null,
    validation_end: row.validation_end || null,
    test_start: row.test_start || null,
    test_end: row.test_end || null,
    train_samples: Number(row.train_core_samples || row.train_samples || 0),
    validation_samples: Number(row.validation_samples || 0),
    test_samples: Number(row.test_samples || 0),
    split_ratio: parseNumber(row.split_ratio),
    mode: row.mode || null,
    profile: row.profile || null
  })).filter((row) => Number.isFinite(row.fold))
  rawCache.set(cacheKey, rows)
  return rows
}

function findSequenceStart(rawRows, foldRows) {
  if (!rawRows.length || !foldRows.length || foldRows.length > rawRows.length) return -1
  const probeLength = Math.min(5, foldRows.length)
  for (let start = 0; start <= rawRows.length - foldRows.length; start += 1) {
    let matched = true
    for (let offset = 0; offset < probeLength; offset += 1) {
      if (!rowsEqual(rawRows[start + offset], foldRows[offset])) {
        matched = false
        break
      }
    }
    if (matched) {
      return start
    }
  }
  return -1
}

function cloneRows(rows) {
  return rows.map((row) => ({ ...row }))
}

function attachAtr(baseRows, atrRows) {
  if (!Array.isArray(atrRows) || !atrRows.length) return
  const count = Math.min(baseRows.length, atrRows.length)
  for (let index = 0; index < count; index += 1) {
    const atr = atrRows[index]
    if (Number.isFinite(atr?.atr6)) baseRows[index].atr6 = atr.atr6
    if (Number.isFinite(atr?.atr12)) baseRows[index].atr12 = atr.atr12
  }
}

function computeAtrRows(rows, periods = [6, 12]) {
  if (!Array.isArray(rows) || !rows.length) return []
  const trValues = rows.map((row, index) => {
    const high = Number(row?.high)
    const low = Number(row?.low)
    const prevClose = index > 0 ? Number(rows[index - 1]?.close) : NaN
    if (!Number.isFinite(high) || !Number.isFinite(low)) return null
    const candidates = [high - low]
    if (Number.isFinite(prevClose)) {
      candidates.push(Math.abs(high - prevClose), Math.abs(low - prevClose))
    }
    return Math.max(...candidates)
  })

  return rows.map((row, index) => {
    const nextRow = { ...row }
    periods.forEach((period) => {
      if (index < period - 1) {
        nextRow[`atr${period}`] = null
        return
      }
      const slice = trValues.slice(index - period + 1, index + 1)
      if (slice.some((value) => !Number.isFinite(value))) {
        nextRow[`atr${period}`] = null
        return
      }
      const avg = slice.reduce((sum, value) => sum + value, 0) / period
      nextRow[`atr${period}`] = avg
    })
    return nextRow
  })
}

function attachPredictions(baseRows, predRows, modelKey) {
  if (!Array.isArray(predRows) || !predRows.length || predRows.length > baseRows.length) return
  const startIndex = baseRows.length - predRows.length
  for (let index = 0; index < predRows.length; index += 1) {
    const target = baseRows[startIndex + index]
    const pred = predRows[index]
    if (!target || !pred) continue
    target[`pred_${modelKey}_open`] = pred.pred_open
    target[`pred_${modelKey}_high`] = pred.pred_high
    target[`pred_${modelKey}_low`] = pred.pred_low
    target[`pred_${modelKey}_close`] = pred.pred_close
    target[`true_${modelKey}_open`] = pred.true_open
    target[`true_${modelKey}_high`] = pred.true_high
    target[`true_${modelKey}_low`] = pred.true_low
    target[`true_${modelKey}_close`] = pred.true_close
  }
}

function getFoldPaths(resultDir, fold) {
  const foldLabel = `fold${String(fold).padStart(2, '0')}`
  return {
    dataPath: `${resultDir}/${foldLabel}_data.csv`,
    predsPath: `${resultDir}/${foldLabel}_preds.csv`,
    summaryPath: `${resultDir}/${foldLabel}_summary.json`
  }
}

function getAvailableFoldEntries(modelConfig) {
  const summaryRows = modelConfig.summaryPath ? buildSummaryRows(modelConfig.summaryPath) : []
  return summaryRows.filter((row) => {
    const paths = getFoldPaths(modelConfig.resultDir, row.fold)
    return fs.existsSync(resolveResearchPath(paths.predsPath))
  })
}

function getModelConfigSummary(modelKey, modelConfig) {
  if (modelKey === 'arima' && modelConfig.configPath) {
    const cfg = readJson(modelConfig.configPath)
    return {
      order_search: cfg.order_search,
      p_values: cfg.p_values,
      d_values: cfg.d_values,
      q_values: cfg.q_values,
      selection_metric: cfg.selection_metric,
      trend: cfg.trend
    }
  }

  if (modelConfig.bestConfigPath) {
    const cfg = readJson(modelConfig.bestConfigPath)
    return {
      window: Number(cfg.window || 0),
      units: Number(cfg.units || 0),
      activation: cfg.activation || null,
      lr: parseNumber(cfg.lr),
      epochs: Number(cfg.epochs || 0),
      lambda_coef: parseNumber(cfg.lambda_coef),
      sigma_coef: parseNumber(cfg.sigma_coef),
      batch: Number(cfg.batch || 0),
      l2_reg: parseNumber(cfg.l2_reg)
    }
  }

  if (modelConfig.bestProgressionPath) {
    const rows = readDelimited(resolveResearchPath(modelConfig.bestProgressionPath), ',')
    const last = rows[rows.length - 1]
    if (!last) return null
    return {
      stage: last.stage || null,
      window: Number(last.window || 0),
      units: Number(last.units || 0),
      activation: last.activation || null,
      lr: parseNumber(last.lr),
      epochs: Number(last.epochs || 0),
      lambda_coef: parseNumber(last.lambda_coef),
      sigma_coef: parseNumber(last.sigma_coef),
      batch: Number(last.batch || 0)
    }
  }

  return null
}

function getPreparedRows(interval) {
  const cacheKey = `${interval}:all-models`
  if (preparedCache.has(cacheKey)) {
    return cloneRows(preparedCache.get(cacheKey))
  }

  const dataset = DATASET_CONFIG[interval]
  if (!dataset) {
    throw new Error(`Unsupported research interval: ${interval}`)
  }

  const rawRows = buildRawRows(dataset.rawPath)
  const preparedRows = interval === '4h' ? computeAtrRows(rawRows) : cloneRows(rawRows)
  const indexByTime = new Map()
  for (let index = 0; index < preparedRows.length; index += 1) {
    const time = Number(preparedRows[index]?.time || 0)
    if (time > 0) indexByTime.set(time, index)
  }

  Object.entries(dataset.models || {}).forEach(([modelKey, modelConfig]) => {
    const foldEntries = getAvailableFoldEntries(modelConfig)
    foldEntries.forEach((entry) => {
      const paths = getFoldPaths(modelConfig.resultDir, entry.fold)
      const predRows = buildPredRows(paths.predsPath)
      if (!predRows.length) return
      const testStart = parseResearchTimestamp(entry.test_start)
      const startIndex = indexByTime.get(testStart)
      if (!Number.isFinite(startIndex)) {
        throw new Error(
          `Failed to align research fold by timestamp for ${interval}/${modelKey}/fold${entry.fold} (test_start=${entry.test_start})`
        )
      }
      const endIndex = Math.min(startIndex + predRows.length, preparedRows.length)
      const alignedRows = preparedRows.slice(startIndex, endIndex)
      attachPredictions(alignedRows, predRows, modelKey)
    })
  })

  preparedCache.set(cacheKey, preparedRows)
  return cloneRows(preparedRows)
}

function subtractPeriod(referenceDate, timeframe) {
  const next = new Date(referenceDate.getTime())
  if (timeframe === '1D') next.setUTCDate(next.getUTCDate() - 1)
  else if (timeframe === '5D') next.setUTCDate(next.getUTCDate() - 5)
  else if (timeframe === '1M') next.setUTCMonth(next.getUTCMonth() - 1)
  else if (timeframe === '3M') next.setUTCMonth(next.getUTCMonth() - 3)
  else if (timeframe === '6M') next.setUTCMonth(next.getUTCMonth() - 6)
  else if (timeframe === '1Y') next.setUTCFullYear(next.getUTCFullYear() - 1)
  else if (timeframe === '2Y') next.setUTCFullYear(next.getUTCFullYear() - 2)
  else if (timeframe === '3Y') next.setUTCFullYear(next.getUTCFullYear() - 3)
  else if (timeframe === '5Y') next.setUTCFullYear(next.getUTCFullYear() - 5)
  else if (timeframe === '72M') next.setUTCMonth(next.getUTCMonth() - 72)
  return next
}

function filterRowsByTimeframe(rows, timeframe) {
  if (!Array.isArray(rows) || !rows.length || !timeframe || timeframe === 'ALL') {
    return rows
  }
  const lastTime = Number(rows[rows.length - 1]?.time || 0)
  if (!Number.isFinite(lastTime) || lastTime <= 0) return rows
  const endDate = new Date(lastTime * 1000)
  let fromTimestamp = 0

  if (timeframe === 'YTD') {
    fromTimestamp = Math.floor(Date.UTC(endDate.getUTCFullYear(), 0, 1, 0, 0, 0) / 1000)
  } else {
    const startDate = subtractPeriod(endDate, timeframe)
    fromTimestamp = Math.floor(startDate.getTime() / 1000)
  }

  return rows.filter((row) => Number(row?.time || 0) >= fromTimestamp)
}

function normalizeResearchSymbol(symbol) {
  const value = String(symbol || '').trim().toUpperCase()
  if (['EURUSD', 'EURUSD=X'].includes(value)) return 'EURUSD'
  return value
}

export function listResearchSymbols() {
  return RESEARCH_SYMBOLS
}

export function searchResearchSymbols(query = '') {
  const needle = String(query || '').trim().toLowerCase()
  if (!needle) return RESEARCH_SYMBOLS
  return RESEARCH_SYMBOLS.filter((item) => {
    return (
      item.symbol.toLowerCase().includes(needle) ||
      item.name.toLowerCase().includes(needle) ||
      item.description.toLowerCase().includes(needle)
    )
  })
}

export function listResearchModels(interval = '4h') {
  const dataset = DATASET_CONFIG[interval]
  if (!dataset) return []
  return Object.entries(dataset.models || {}).map(([value, item]) => {
    const folds = getAvailableFoldEntries(item).map((entry) => entry.fold)
    return {
      value,
      label: item.label,
      scenario: dataset.scenario || null,
      folds,
      foldCount: folds.length,
      configSummary: getModelConfigSummary(value, item)
    }
  })
}

export function getResearchIntervals() {
  return Object.keys(DATASET_CONFIG)
}

export async function fetchResearchOhlcData(symbol, timeframe = 'ALL', interval = '4h', model = 'bilstm') {
  const normalizedSymbol = normalizeResearchSymbol(symbol)
  if (normalizedSymbol !== 'EURUSD') {
    throw new Error(`Research dataset is only available for EURUSD, received ${symbol}`)
  }

  const normalizedInterval = interval === 'H4' ? '4h' : interval
  if (!DATASET_CONFIG[normalizedInterval]) {
    throw new Error(`Unsupported research interval: ${interval}`)
  }

  const dataset = DATASET_CONFIG[normalizedInterval]
  const modelConfig = dataset.models?.[model] || null
  const rows = getPreparedRows(normalizedInterval)
  const filteredRows = filterRowsByTimeframe(rows, timeframe)

  const availableModels = listResearchModels(normalizedInterval)
  const hasPrediction = filteredRows.some((row) => {
    return availableModels.some(({ value }) => Number.isFinite(row?.[`pred_${value}_close`]))
  })
  const hasAtr = filteredRows.some((row) => Number.isFinite(row?.atr6) || Number.isFinite(row?.atr12))

  return {
    provider: 'research',
    symbol: normalizedSymbol,
    timeframe,
    interval: normalizedInterval,
    model: modelConfig ? model : null,
    modelLabel: modelConfig ? modelConfig.label : null,
    count: filteredRows.length,
    meta: {
      provider: 'research',
      symbol: normalizedSymbol,
      interval: normalizedInterval,
      timeframe,
      model: modelConfig ? model : null,
      modelLabel: modelConfig ? modelConfig.label : null,
      datasetLabel: dataset.label,
      scenario: dataset.scenario || null,
      timezone: 'UTC',
      currency: 'EUR/USD',
      hasPrediction,
      hasIndicators: hasAtr,
      availableModels,
      comparisonReports: dataset.comparisonReports || [],
      selectedModel: modelConfig ? model : null,
      selectedModelLabel: modelConfig ? modelConfig.label : null,
      note: normalizedInterval === '1D'
        ? 'D1 in this repository currently exposes actual candles only.'
        : 'H4 uses the comparison-ready last5 walk-forward folds across available models.'
    },
    data: filteredRows
  }
}

export function getResearchRoot() {
  return RESEARCH_ROOT
}

function safeReadJson(relativePath) {
  try {
    return readJson(relativePath)
  } catch {
    return null
  }
}

function safeReadCsv(relativePath) {
  try {
    return readDelimited(resolveResearchPath(relativePath), ',')
  } catch {
    return null
  }
}

function existsRel(relativePath) {
  if (!relativePath) return false
  return fs.existsSync(resolveResearchPath(relativePath))
}

function asReportEntry(relativePath, label, kind) {
  return existsRel(relativePath)
    ? { label, kind, path: relativePath, url: `/research-reports/${relativePath}` }
    : null
}

export function listResearchReports(interval = '4h') {
  const normalizedInterval = interval === 'H4' ? '4h' : interval
  const dataset = DATASET_CONFIG[normalizedInterval]
  if (!dataset) {
    throw new Error(`Unsupported research interval: ${interval}`)
  }
  const tfShort = normalizedInterval === '4h' ? 'h4' : 'd1'
  const stem = dataset.comparisonStem
  const compRoot = dataset.comparisonRoot

  const dashboard = []
  const main = asReportEntry(`${compRoot}/${stem}.html`, `Comparison ${tfShort.toUpperCase()}`, 'html')
  if (main) dashboard.push(main)
  const summaryCsv = asReportEntry(`${compRoot}/${stem}_summary.csv`, 'Summary table', 'csv')
  if (summaryCsv) dashboard.push(summaryCsv)
  const summaryJson = asReportEntry(`${compRoot}/${stem}_summary.json`, 'Summary JSON', 'json')
  if (summaryJson) dashboard.push(summaryJson)
  for (const m of ['lstm', 'bilstm', 'arima']) {
    const e = asReportEntry(`${compRoot}/${stem}_${m}_metrics.csv`, `${m.toUpperCase()} metrics`, 'csv')
    if (e) dashboard.push(e)
  }
  const pairwise = asReportEntry(`${compRoot}/${stem}_pairwise.csv`, 'Pairwise', 'csv')
  if (pairwise) dashboard.push(pairwise)
  const atrRel = asReportEntry(`${compRoot}/${stem}_atr_relation.csv`, 'ATR relation', 'csv')
  if (atrRel) dashboard.push(atrRel)

  const detail = {}
  Object.entries(dataset.models).forEach(([modelKey, mc]) => {
    const items = []
    const dir = mc.resultDir
    items.push(asReportEntry(`${dir}/rolling_tvt_summary.csv`, 'Rolling summary', 'csv'))
    items.push(asReportEntry(`${dir}/run_manifest.json`, 'Run manifest', 'json'))
    items.push(asReportEntry(`${dir}/selected_schedule.csv`, 'Selected schedule', 'csv'))
    items.push(asReportEntry(`${dir}/mae_atr_fold_allfull.html`, 'MAE/ATR allfull', 'html'))
    items.push(asReportEntry(`${dir}/mae_atr_fold_allfull.csv`, 'MAE/ATR allfull (CSV)', 'csv'))
    if (modelKey === 'arima') {
      items.push(asReportEntry(`${dir}/index.html`, 'ARIMA index', 'html'))
      items.push(asReportEntry(`${dir}/index_metrics.csv`, 'ARIMA metrics', 'csv'))
      items.push(asReportEntry(`${dir}/arima_residual_diagnostics_tvt_v02_last3.html`, 'ARIMA residual diagnostics', 'html'))
    } else {
      const tfLabel = tfShort
      const modelLabel = modelKey === 'lstm' ? 'lstm' : 'bilstm'
      items.push(asReportEntry(`${dir}/validation_report_${tfLabel}_tvt_v02_${modelLabel}_last3.html`, 'Validation report', 'html'))
      items.push(asReportEntry(`${dir}/validation_report_${tfLabel}_tvt_v02_${modelLabel}_last3_metrics.csv`, 'Validation metrics', 'csv'))
      items.push(asReportEntry(`${dir}/ohlc_dot_${tfLabel}_tvt_v02_${modelLabel}_last3_all.html`, 'OHLC dot plot', 'html'))
      items.push(asReportEntry(`${dir}/loss_${tfLabel}_tvt_v02_${modelLabel}_last3.html`, 'Loss curve', 'html'))
      items.push(asReportEntry(`${dir}/loss_gradient_${tfLabel}_tvt_v02_${modelLabel}_last3.html`, 'Loss gradient', 'html'))
    }
    detail[modelKey] = items.filter(Boolean)
  })

  const tuning = {}
  Object.entries(dataset.models).forEach(([modelKey, mc]) => {
    if (!mc.tuningDir) return
    const items = []
    items.push(asReportEntry(`${mc.tuningDir}/best_progression.csv`, 'Best progression', 'csv'))
    items.push(asReportEntry(`${mc.tuningDir}/audit_finalize_report.json`, 'Audit finalize', 'json'))
    items.push(asReportEntry(`${mc.tuningDir}/audit_finalize_report.md`, 'Audit finalize (md)', 'md'))
    for (let stage = 1; stage <= 8; stage += 1) {
      const e = asReportEntry(`${mc.tuningDir}/stage${stage}_summary.csv`, `Stage ${stage} summary`, 'csv')
      if (e) items.push(e)
    }
    items.push(asReportEntry(`${mc.tuningDir}/eurusd_${modelKey}_pipeline_tvt_summary.html`, 'Pipeline summary', 'html'))
    items.push(asReportEntry(`${mc.tuningDir}/eurusd_${modelKey}_d1_pipeline_tvt_v02_summary.html`, 'Pipeline summary', 'html'))
    tuning[modelKey] = items.filter(Boolean)
  })

  const audit = []
  audit.push(asReportEntry(dataset.foldScope, 'Fold scope', 'json'))
  audit.push(asReportEntry(`${dataset.splitsRoot}/fold_schedule.csv`, 'Fold schedule (all)', 'csv'))
  audit.push(asReportEntry(`${dataset.splitsRoot}/fold_schedule_tuning.csv`, 'Fold schedule (tuning)', 'csv'))
  audit.push(asReportEntry(`${dataset.splitsRoot}/fold_schedule_evaluation.csv`, 'Fold schedule (evaluation)', 'csv'))
  Object.entries(dataset.models).forEach(([modelKey, mc]) => {
    audit.push(asReportEntry(`${mc.resultDir}/run_manifest.json`, `Run manifest (${modelKey})`, 'json'))
  })

  return {
    dashboard: dashboard.filter(Boolean),
    detail,
    tuning,
    audit: audit.filter(Boolean)
  }
}

export function getResearchComparisonSummary(interval = '4h') {
  const normalizedInterval = interval === 'H4' ? '4h' : interval
  const dataset = DATASET_CONFIG[normalizedInterval]
  if (!dataset) {
    throw new Error(`Unsupported research interval: ${interval}`)
  }
  const stem = dataset.comparisonStem
  const compRoot = dataset.comparisonRoot
  const summary = safeReadJson(`${compRoot}/${stem}_summary.json`)
  const summaryRows = safeReadCsv(`${compRoot}/${stem}_summary.csv`) || []
  const pairwise = safeReadCsv(`${compRoot}/${stem}_pairwise.csv`) || []
  const atrRelation = safeReadCsv(`${compRoot}/${stem}_atr_relation.csv`) || []
  const foldScope = safeReadJson(dataset.foldScope)

  const perFold = {}
  Object.entries(dataset.models).forEach(([modelKey, mc]) => {
    const rows = safeReadCsv(mc.summaryPath) || []
    perFold[modelKey] = rows.map((row) => ({
      fold: Number(row.fold),
      profile: row.profile || null,
      test_start: row.test_start || null,
      test_end: row.test_end || null,
      test_samples: Number(row.test_samples || 0),
      mae_avg_pips: parseNumber(row.mae_avg_pips),
      mae_open_pips: parseNumber(row.mae_open_pips),
      mae_high_pips: parseNumber(row.mae_high_pips),
      mae_low_pips: parseNumber(row.mae_low_pips),
      mae_close_pips: parseNumber(row.mae_close_pips),
      corr2_avg_ohlc: parseNumber(row.corr2_avg_ohlc),
      da_body_pct: parseNumber(row.da_body_pct)
    })).filter((r) => Number.isFinite(r.fold))
  })

  return {
    interval: normalizedInterval,
    scenario: dataset.scenario,
    foldScope,
    summary,
    summaryRows,
    pairwise,
    atrRelation,
    perFold
  }
}
