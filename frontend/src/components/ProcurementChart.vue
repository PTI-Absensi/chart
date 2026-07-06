<template>
  <div class="chart-wrapper">
    <div class="chart-stage">
      <div class="chart-status-badge">
        <span class="chart-status-pill">{{ rangeDisplayLabel }}</span>
        <span class="chart-status-pill chart-status-pill--muted">{{ intervalDisplayLabel }}</span>
      </div>
      <div ref="chartContainer" class="lw-chart"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineSeries
} from 'lightweight-charts'
import { authFetch } from '../utils/auth'

const props = withDefaults(defineProps<{
  chartType?: 'line' | 'area' | 'bar' | 'candlestick' | 'ohlc'
  dataSource?: 'yahoo' | 'research' | 'economy'
  timeframe?: string
  interval?: string
  periodType?: 'calendar' | 'fiscal'
  year?: number
  height?: number
  symbols?: string[]
  hiddenSeries?: Set<string>
  hiddenPredIds?: Set<string>
  colorOverrides?: Record<string, string>
  rawMode?: boolean
  cumulative?: boolean
  singleScale?: boolean
  scaleSide?: 'left' | 'right'
  yAxisOverride?: { min?: number; max?: number }
  yAxisBySymbolOverride?: Record<string, { min?: number; max?: number }>
  symbolMeta?: Record<string, { name?: string; description?: string; unit?: string }>
  sumberDana?: string
  kategoriPlant?: string
  timezone?: string
  theme?: 'dark' | 'light'
  overlayIndicators?: Array<{ id?: string; label?: string; type: 'sma' | 'ema' | 'atr6' | 'atr12' | 'pred_bilstm' | 'pred_lstm' | 'pred_arima'; period: number; sourceField: 'open' | 'high' | 'low' | 'close' }>
  indicatorPane?: { id?: string; engine: 'rsi' | 'macd' | 'stoch' | 'volume'; period: number } | null
}>(), {
  chartType: 'line',
  dataSource: 'yahoo',
  timeframe: '6M',
  interval: '1D',
  periodType: 'calendar',
  year: 2025,
  height: 450,
  symbols: () => [],
  hiddenSeries: () => new Set(),
  colorOverrides: () => ({}),
  rawMode: false,
  cumulative: false,
  singleScale: false,
  scaleSide: 'left',
  yAxisOverride: undefined,
  yAxisBySymbolOverride: undefined,
  symbolMeta: () => ({}),
  sumberDana: '',
  kategoriPlant: '',
  timezone: 'auto',
  theme: 'dark',
  overlayIndicators: () => [],
  indicatorPane: null
})

const emit = defineEmits<{
  (e: 'dataLoaded', data: Record<string, any[]>): void
  (e: 'error', message: string): void
}>()

const chartContainer = ref<HTMLElement | null>(null)
let chart: any = null
const seriesMap = new Map<string, any>()
const seriesVisible = new Map<string, boolean>()
const rawData = ref<Record<string, any[]>>({})
const runtimeMetaBySymbol = ref<Record<string, { timezone?: string; currency?: string }>>({})
const intradayDetected = ref(false)
const intradayDayBoundaryTimes = ref<Set<number>>(new Set())
let latestLoadRequestId = 0
let autoRefreshTimer: ReturnType<typeof setTimeout> | null = null
const responseCache = new Map<string, { expiresAt: number; rows: any[]; meta: { timezone?: string; currency?: string } | null }>()
let lastAppliedViewportKey = ''

const colors = [
  '#2962ff', '#26a69a', '#ef5350', '#ab47bc', '#ff9800',
  '#00bcd4', '#8bc34a', '#e91e63', '#3f51b5', '#009688'
]

const TIMEZONE_ALIAS_MAP: Record<string, string> = {
  EDT: 'America/New_York',
  EST: 'America/New_York',
  ET: 'America/New_York',
  CDT: 'America/Chicago',
  CST: 'America/Chicago',
  CT: 'America/Chicago',
  MDT: 'America/Denver',
  MST: 'America/Denver',
  MT: 'America/Denver',
  PDT: 'America/Los_Angeles',
  PST: 'America/Los_Angeles',
  PT: 'America/Los_Angeles',
  WIB: 'Asia/Jakarta',
  WITA: 'Asia/Makassar',
  WIT: 'Asia/Jayapura',
  JST: 'Asia/Tokyo'
}

function normalizeTimeZone(value?: string): string {
  const candidate = String(value || '').trim()
  if (!candidate) return 'UTC'
  const mapped = TIMEZONE_ALIAS_MAP[candidate.toUpperCase()] || candidate
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: mapped }).format(new Date())
    return mapped
  } catch {
    return 'UTC'
  }
}

const activeTimeZone = computed(() => {
  if (props.timezone && props.timezone !== 'auto') return normalizeTimeZone(props.timezone)
  const tz = props.symbols
    .map((symbol) => runtimeMetaBySymbol.value[symbol]?.timezone)
    .find((value) => typeof value === 'string' && value.length > 0)
  return normalizeTimeZone(tz)
})

const isCandleMode = computed(() => props.chartType === 'candlestick' || props.chartType === 'ohlc')
const isIndicatorPane = computed(() => Boolean(props.indicatorPane))
const isIntraday = computed(() => {
  if (intradayDetected.value) return true
  return ['15m', '30m', '1h', '4h'].includes(props.interval || '')
})
const rangeDisplayLabel = computed(() => String(props.timeframe || '').replace('72M', '6Y') || 'Range')
const intervalDisplayLabel = computed(() => String(props.interval || '').replace('1D', '1d').replace('5D', '5d').replace('1W', '1w').replace('1M', '1m').replace('3M', '3m'))

function getUnit(symbol: string): string {
  return props.symbolMeta?.[symbol]?.unit || ''
}

function resolveColor(symbol: string, index: number): string {
  return props.colorOverrides?.[symbol] || colors[index % colors.length]
}

function formatXAxisDate(ms: number): string {
  const date = new Date(ms)
  if (isIntraday.value) {
    if (props.timeframe === '1D') {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: activeTimeZone.value
      }).format(date)
    }

    const timeKey = Math.floor(ms / 1000)
    if (intradayDayBoundaryTimes.value.has(timeKey)) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        timeZone: activeTimeZone.value
      }).format(date)
    }

    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: activeTimeZone.value
    }).format(date)
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    timeZone: activeTimeZone.value
  }).format(date)
}

function buildIntradayBoundarySet(rows: any[]): Set<number> {
  const boundaries = new Set<number>()
  if (!Array.isArray(rows) || !rows.length || !isIntraday.value || props.timeframe === '1D') {
    return boundaries
  }

  const dayKeys = new Set<string>()
  const formatter = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: activeTimeZone.value
  })

  rows.forEach((row) => {
    const time = Number(row?.time)
    if (!Number.isFinite(time)) return
    const dayKey = formatter.format(new Date(time * 1000))
    if (dayKeys.has(dayKey)) return
    dayKeys.add(dayKey)
    boundaries.add(time)
  })

  return boundaries
}

function detectIntradayFromRows(rows: any[]): boolean {
  if (!Array.isArray(rows) || rows.length < 3) {
    return ['15m', '30m', '1h', '4h'].includes(props.interval || '')
  }
  const deltas: number[] = []
  for (let i = 1; i < rows.length; i += 1) {
    const prev = Number(rows[i - 1]?.time || 0)
    const next = Number(rows[i]?.time || 0)
    const delta = next - prev
    if (delta > 0) deltas.push(delta)
  }
  if (!deltas.length) return ['15m', '30m', '1h', '4h'].includes(props.interval || '')
  deltas.sort((a, b) => a - b)
  const median = deltas[Math.floor(deltas.length / 2)]
  return median < 24 * 60 * 60
}

function toTimestamp(time: any): number {
  if (typeof time === 'number') return time
  if (typeof time?.timestamp === 'number') return time.timestamp
  if (typeof time?.year === 'number' && typeof time?.month === 'number' && typeof time?.day === 'number') {
    return Math.floor(Date.UTC(time.year, time.month - 1, time.day) / 1000)
  }
  return 0
}

function clearSeries() {
  if (!chart) return
  seriesMap.forEach((series) => {
    try {
      chart.removeSeries(series)
    } catch {
      // ignore stale refs
    }
  })
  seriesMap.clear()
}

function computePrecision(values: number[]): number {
  if (!values.length) return 2
  const maxAbs = Math.max(...values.map((v) => Math.abs(v)))
  if (maxAbs < 1) return 6
  if (maxAbs < 100) return 4
  if (maxAbs < 10000) return 2
  return 2
}

function getRowSourceValue(row: any, sourceField: 'open' | 'high' | 'low' | 'close'): number {
  return Number(row?.[sourceField])
}

function computeMovingAverageData(
  rows: any[],
  type: 'sma' | 'ema',
  period: number,
  sourceField: 'open' | 'high' | 'low' | 'close' = 'close'
): Array<{ time: number; value: number }> {
  if (!Array.isArray(rows) || period <= 1) return []
  const points: Array<{ time: number; value: number }> = []
  const closes = rows.map((r) => getRowSourceValue(r, sourceField)).filter((v) => Number.isFinite(v))
  if (!closes.length) return points

  if (type === 'sma') {
    let sum = 0
    for (let i = 0; i < rows.length; i += 1) {
      const c = getRowSourceValue(rows[i], sourceField)
      if (!Number.isFinite(c)) continue
      sum += c
      if (i >= period) {
        const prev = getRowSourceValue(rows[i - period], sourceField)
        if (Number.isFinite(prev)) sum -= prev
      }
      if (i >= period - 1) {
        points.push({ time: rows[i].time, value: sum / period })
      }
    }
    return points
  }

  const k = 2 / (period + 1)
  let ema: number | null = null
  for (let i = 0; i < rows.length; i += 1) {
    const c = getRowSourceValue(rows[i], sourceField)
    if (!Number.isFinite(c)) continue
    ema = ema === null ? c : c * k + ema * (1 - k)
    if (i >= period - 1 && ema !== null) {
      points.push({ time: rows[i].time, value: ema })
    }
  }
  return points
}

function computeResearchIndicatorData(
  rows: any[],
  field: 'atr6' | 'atr12'
): Array<{ time: number; value: number }> {
  if (!Array.isArray(rows) || !rows.length) return []
  return rows
    .map((row) => ({
      time: Number(row?.time),
      value: Number(row?.[field])
    }))
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value))
}

type PredictionOverlayType = 'pred_bilstm' | 'pred_lstm' | 'pred_arima'
type OverlayIndicatorType = 'sma' | 'ema' | 'atr6' | 'atr12' | PredictionOverlayType

function getPredictionModelKey(type: PredictionOverlayType): 'bilstm' | 'lstm' | 'arima' {
  if (type === 'pred_bilstm') return 'bilstm'
  if (type === 'pred_lstm') return 'lstm'
  return 'arima'
}

function getPredictionRows(rows: any[], type: PredictionOverlayType) {
  if (!Array.isArray(rows) || !rows.length) return []
  const modelKey = getPredictionModelKey(type)
  return rows
    .filter((row) => {
      return ['open', 'high', 'low', 'close'].every((key) => Number.isFinite(Number(row?.[`pred_${modelKey}_${key}`])))
    })
    .map((row) => ({
      time: Number(row.time),
      open: Number(row[`pred_${modelKey}_open`]),
      high: Number(row[`pred_${modelKey}_high`]),
      low: Number(row[`pred_${modelKey}_low`]),
      close: Number(row[`pred_${modelKey}_close`])
    }))
}

function getPredictionCloseRows(rows: any[], type: PredictionOverlayType) {
  return getPredictionRows(rows, type).map((row) => ({ time: row.time, value: row.close }))
}

function getPredictionStyle(type: PredictionOverlayType) {
  // Each model uses one hue: BiLSTM=blue, LSTM=amber, ARIMA=green
  // up candle = brighter fill, down candle = dimmer same hue (no red/green confusion with actual)
  if (type === 'pred_bilstm') {
    return {
      candleUp:   'rgba(41, 182, 246, 0.55)',
      candleDown: 'rgba(41, 182, 246, 0.20)',
      borderUp:   'rgba(41, 182, 246, 1)',
      borderDown: 'rgba(41, 182, 246, 0.65)',
      wickUp:     'rgba(41, 182, 246, 1)',
      wickDown:   'rgba(41, 182, 246, 0.65)',
      line: '#29b6f6', lineStyle: 0
    }
  }
  if (type === 'pred_lstm') {
    return {
      candleUp:   'rgba(255, 202, 40, 0.55)',
      candleDown: 'rgba(255, 202, 40, 0.20)',
      borderUp:   'rgba(255, 202, 40, 1)',
      borderDown: 'rgba(255, 202, 40, 0.65)',
      wickUp:     'rgba(255, 202, 40, 1)',
      wickDown:   'rgba(255, 202, 40, 0.65)',
      line: '#ffca28', lineStyle: 1
    }
  }
  // arima � green
  return {
    candleUp:   'rgba(102, 187, 106, 0.55)',
    candleDown: 'rgba(102, 187, 106, 0.20)',
    borderUp:   'rgba(102, 187, 106, 1)',
    borderDown: 'rgba(102, 187, 106, 0.65)',
    wickUp:     'rgba(102, 187, 106, 1)',
    wickDown:   'rgba(102, 187, 106, 0.65)',
    line: '#66bb6a', lineStyle: 2
  }
}

function addPredictionOverlay(rows: any[], type: PredictionOverlayType, seriesKeyPrefix: string, showCandles: boolean) {
  if (!chart) return
  const predictionRows = getPredictionRows(rows, type)
  if (!predictionRows.length) return

  const style = getPredictionStyle(type)

  if (showCandles) {
    const predictionSeries = chart.addSeries(CandlestickSeries, {
      upColor: style.candleUp,
      downColor: style.candleDown,
      borderVisible: true,
      borderUpColor: style.borderUp,
      borderDownColor: style.borderDown,
      wickUpColor: style.wickUp,
      wickDownColor: style.wickDown,
      priceScaleId: 'right'
    })
    predictionSeries.setData(predictionRows)
    seriesMap.set(`${seriesKeyPrefix}__prediction_candle_${type}`, predictionSeries)
    seriesVisible.set(`${seriesKeyPrefix}__prediction_candle_${type}`, true)
    return
  }

  const predictionCloseSeries = chart.addSeries(LineSeries, {
    color: style.line,
    lineWidth: 2,
    lineStyle: style.lineStyle,
    priceScaleId: 'right'
  })
  predictionCloseSeries.setData(getPredictionCloseRows(rows, type))
  seriesMap.set(`${seriesKeyPrefix}__prediction_close_${type}`, predictionCloseSeries)
  seriesVisible.set(`${seriesKeyPrefix}__prediction_close_${type}`, true)
}

function addOverlaySeries(
  rows: any[],
  indicator: { type: OverlayIndicatorType; period: number; sourceField: 'open' | 'high' | 'low' | 'close' },
  indicatorIndex: number,
  seriesKeyPrefix: string
) {
  if (!chart) return
  if (String(indicator.type).startsWith('pred_')) {
    addPredictionOverlay(rows, indicator.type as PredictionOverlayType, seriesKeyPrefix, true)
    return
  }
  let overlayData: Array<{ time: number; value: number }> = []

  if (indicator.type === 'atr6' || indicator.type === 'atr12') {
    overlayData = computeResearchIndicatorData(rows, indicator.type)
  } else if (indicator.period > 1) {
    overlayData = computeMovingAverageData(rows, indicator.type, indicator.period, indicator.sourceField)
  }

  if (!overlayData.length) return

  const colorByType: Record<string, string> = {
    sma: '#f5c542',
    ema: '#ff7043',
    atr6: '#7e57c2',
    atr12: '#26c6da'
  }

  const overlaySeries = chart.addSeries(LineSeries, {
    color: colorByType[indicator.type] || ['#f5c542', '#ff7043', '#7e57c2', '#26c6da'][indicatorIndex % 4],
    lineWidth: 2,
    priceScaleId: 'right'
  })
  overlaySeries.setData(overlayData)
  seriesMap.set(`${seriesKeyPrefix}__overlay_${indicator.type}_${indicator.period}_${indicatorIndex}`, overlaySeries)
  seriesVisible.set(`${seriesKeyPrefix}__overlay_${indicator.type}_${indicator.period}_${indicatorIndex}`, true)
}

function computeRsiData(rows: any[], period = 14): Array<{ time: number; value: number }> {
  if (!Array.isArray(rows) || rows.length <= period) return []
  const points: Array<{ time: number; value: number }> = []
  let gainSum = 0
  let lossSum = 0
  for (let i = 1; i <= period; i += 1) {
    const diff = Number(rows[i].close) - Number(rows[i - 1].close)
    if (diff >= 0) gainSum += diff
    else lossSum -= diff
  }
  let avgGain = gainSum / period
  let avgLoss = lossSum / period
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss
  points.push({ time: rows[period].time, value: 100 - 100 / (1 + rs) })

  for (let i = period + 1; i < rows.length; i += 1) {
    const diff = Number(rows[i].close) - Number(rows[i - 1].close)
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    points.push({ time: rows[i].time, value: 100 - 100 / (1 + rs) })
  }
  return points
}

function computeMacdData(rows: any[]) {
  if (!Array.isArray(rows) || rows.length < 35) {
    return { macd: [], signal: [], histogram: [] } as const
  }
  const ema12 = computeMovingAverageData(rows, 'ema', 12)
  const ema26 = computeMovingAverageData(rows, 'ema', 26)
  const ema12Map = new Map(ema12.map((point) => [point.time, point.value]))
  const ema26Map = new Map(ema26.map((point) => [point.time, point.value]))
  const macd: Array<{ time: number; value: number }> = []
  rows.forEach((row) => {
    const fast = ema12Map.get(row.time)
    const slow = ema26Map.get(row.time)
    if (!Number.isFinite(fast) || !Number.isFinite(slow)) return
    macd.push({ time: row.time, value: Number(fast) - Number(slow) })
  })
  const signalRows = macd.map((point) => ({ time: point.time, close: point.value }))
  const signal = computeMovingAverageData(signalRows, 'ema', 9)
  const signalMap = new Map(signal.map((point) => [point.time, point.value]))
  const histogram = macd
    .filter((point) => signalMap.has(point.time))
    .map((point) => ({
      time: point.time,
      value: point.value - Number(signalMap.get(point.time))
    }))
  return { macd, signal, histogram } as const
}

function computeStochasticData(rows: any[], period = 14) {
  if (!Array.isArray(rows) || rows.length < period) {
    return { k: [], d: [] } as const
  }
  const k: Array<{ time: number; value: number }> = []
  for (let i = period - 1; i < rows.length; i += 1) {
    const slice = rows.slice(i - period + 1, i + 1)
    const highs = slice.map((row) => Number(row.high)).filter((value) => Number.isFinite(value))
    const lows = slice.map((row) => Number(row.low)).filter((value) => Number.isFinite(value))
    const close = Number(rows[i].close)
    if (!highs.length || !lows.length || !Number.isFinite(close)) continue
    const highestHigh = Math.max(...highs)
    const lowestLow = Math.min(...lows)
    const value = highestHigh === lowestLow ? 50 : ((close - lowestLow) / (highestHigh - lowestLow)) * 100
    k.push({ time: rows[i].time, value })
  }
  const dRows = k.map((point) => ({ time: point.time, close: point.value }))
  const d = computeMovingAverageData(dRows, 'sma', 3)
  return { k, d } as const
}

function applyThemeOptions() {
  if (!chart) return
  const dark = props.theme === 'dark'
  chart.applyOptions({
    height: props.height,
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: dark ? '#d2dbd4' : '#1a1d21',
      attributionLogo: false
    },
    grid: {
      vertLines: { color: dark ? 'rgba(229,236,231,0.08)' : 'rgba(0,0,0,0.06)' },
      horzLines: { color: dark ? 'rgba(229,236,231,0.08)' : 'rgba(0,0,0,0.06)' }
    },
    crosshair: {
      mode: CrosshairMode.Normal
    },
    rightPriceScale: {
      visible: true,
      borderColor: dark ? 'rgba(229,236,231,0.2)' : 'rgba(0,0,0,0.2)'
    },
    leftPriceScale: {
      visible: false
    },
    timeScale: {
      borderColor: dark ? 'rgba(229,236,231,0.2)' : 'rgba(0,0,0,0.2)',
      timeVisible: true,
      secondsVisible: false,
      tickMarkFormatter: (time: any) => formatXAxisDate(toTimestamp(time) * 1000)
    },
    localization: {
      timeFormatter: (time: number) => formatXAxisDate(time * 1000)
    }
  })
}

function getPreferredBarSpacing(): number {
  if (props.interval === '15m' && props.timeframe === '1D') return 36
  if (props.interval === '15m' && props.timeframe === '5D') return 26
  if (props.interval === '15m') return 20
  if (props.interval === '30m' && props.timeframe === '1D') return 30
  if (props.interval === '30m' && props.timeframe === '5D') return 22
  if (props.interval === '30m') return 18
  if (props.interval === '1h' && props.timeframe === '1M') return 18
  if (props.interval === '1h') return 14
  if (props.interval === '4h') return 11
  if (props.interval === '1D') return 8
  if (props.interval === '5D') return 7
  if (props.interval === '1W') return 6
  return 5
}

function getPreferredVisibleBars(totalBars: number): number | null {
  const width = chartContainer.value?.clientWidth || chartContainer.value?.offsetWidth || 1200
  const spacing = getPreferredBarSpacing()
  const byWidth = Math.max(12, Math.floor(width / Math.max(10, spacing)))
  const longRangeTimeframes = new Set(['2Y', '3Y', '5Y', '72M', 'ALL'])
  if (props.interval === '15m' && props.timeframe === '1D') return Math.min(totalBars, Math.max(12, byWidth - 2))
  if (props.interval === '15m' && props.timeframe === '5D') return Math.min(totalBars, Math.max(18, byWidth + 4))
  if (props.interval === '15m') return Math.min(totalBars, Math.max(24, byWidth + 8))
  if (props.interval === '30m' && props.timeframe === '1D') return Math.min(totalBars, Math.max(14, byWidth))
  if (props.interval === '30m' && props.timeframe === '5D') return Math.min(totalBars, Math.max(20, byWidth + 4))
  if (props.interval === '30m') return Math.min(totalBars, Math.max(26, byWidth + 6))
  if (props.interval === '1h' && props.timeframe === '1M') return Math.min(totalBars, Math.max(28, byWidth + 6))
  if (props.interval === '1h') return Math.min(totalBars, Math.max(34, byWidth + 8))
  if (props.interval === '4h') return Math.min(totalBars, Math.max(26, byWidth + 4))
  if (props.interval === '1D' && longRangeTimeframes.has(String(props.timeframe || ''))) return null
  if (props.interval === '1D') return Math.min(totalBars, 120)
  return null
}

function showAllLoadedBars(rows: any[]) {
  if (!chart || !Array.isArray(rows) || !rows.length) return
  const firstTime = Number(rows[0]?.time)
  const lastTime = Number(rows[rows.length - 1]?.time)
  if (!Number.isFinite(firstTime) || !Number.isFinite(lastTime) || lastTime < firstTime) return
  const width = chartContainer.value?.clientWidth || chartContainer.value?.offsetWidth || 1200
  const targetSpacing = Math.max(0.5, Math.min(getPreferredBarSpacing(), width / Math.max(rows.length + 4, 24)))
  chart.applyOptions({
    timeScale: {
      barSpacing: targetSpacing,
      minBarSpacing: Math.max(0.5, Math.min(2, targetSpacing)),
      rightOffset: 0
    }
  })
  chart.timeScale().setVisibleRange({
    from: firstTime,
    to: lastTime
  })
}

function applyPreferredViewport(totalBars: number) {
  if (!chart || totalBars <= 0) return
  const primaryRows = rawData.value[props.symbols[0]] || []
  const viewportKey = [
    props.symbols.join(','),
    props.timeframe,
    props.interval,
    props.chartType,
    props.indicatorPane?.engine || '',
    props.indicatorPane?.period || 0
  ].join('|')
  if (viewportKey === lastAppliedViewportKey) return
  lastAppliedViewportKey = viewportKey

  try {
    chart.applyOptions({
      timeScale: {
        barSpacing: getPreferredBarSpacing(),
        minBarSpacing: Math.max(6, Math.floor(getPreferredBarSpacing() * 0.75)),
        rightOffset: 4
      }
    })
    const barsToShow = getPreferredVisibleBars(totalBars)
    if (barsToShow) {
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, totalBars - barsToShow),
        to: totalBars + 2
      })
      return
    }
    showAllLoadedBars(primaryRows)
  } catch {
    showAllLoadedBars(primaryRows)
  }
}

function applyPredVisibility() {
  const predTypes: PredictionOverlayType[] = ['pred_bilstm', 'pred_lstm', 'pred_arima']
  predTypes.forEach((type) => {
    const predId = `overlay-${type.replace('pred_', 'pred-')}`
    const hidden = props.hiddenPredIds?.has(predId) ?? false
    // find all series keys for this pred type
    seriesMap.forEach((series, key) => {
      if (key.includes(`prediction_candle_${type}`) || key.includes(`prediction_close_${type}`)) {
        series.applyOptions({ visible: !hidden })
      }
    })
  })
}

function buildSeries() {
  if (!chart) return
  clearSeries()

  if (!props.symbols.length) return

  if (isIndicatorPane.value) {
    const symbol = props.symbols[0]
    const rows = rawData.value[symbol] || []
    const paneId = props.indicatorPane?.id || props.indicatorPane?.engine || 'indicator'
    const engine = props.indicatorPane?.engine

    if (engine === 'rsi') {
      const rsi = computeRsiData(rows, props.indicatorPane?.period || 14)
      const rsiSeries = chart.addSeries(LineSeries, {
        color: '#ff9800',
        lineWidth: 2,
        priceScaleId: 'right',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 }
      })
      rsiSeries.setData(rsi)
      seriesMap.set(`${paneId}__rsi`, rsiSeries)
      const overbought = chart.addSeries(LineSeries, {
        color: 'rgba(239,83,80,0.8)',
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: 'right'
      })
      overbought.setData(rsi.map((d) => ({ time: d.time, value: 70 })))
      seriesMap.set(`${paneId}__rsi70`, overbought)
      const oversold = chart.addSeries(LineSeries, {
        color: 'rgba(38,166,154,0.8)',
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: 'right'
      })
      oversold.setData(rsi.map((d) => ({ time: d.time, value: 30 })))
      seriesMap.set(`${paneId}__rsi30`, oversold)
    } else if (engine === 'macd') {
      const macd = computeMacdData(rows)
      const histogram = chart.addSeries(HistogramSeries, {
        priceScaleId: 'right',
        priceFormat: { type: 'price', precision: 4, minMove: 0.0001 }
      })
      histogram.setData(macd.histogram.map((point) => ({
        time: point.time,
        value: point.value,
        color: point.value >= 0 ? 'rgba(38,166,154,0.75)' : 'rgba(239,83,80,0.75)'
      })))
      seriesMap.set(`${paneId}__macd_hist`, histogram)
      const macdLine = chart.addSeries(LineSeries, {
        color: '#42a5f5',
        lineWidth: 2,
        priceScaleId: 'right',
        priceFormat: { type: 'price', precision: 4, minMove: 0.0001 }
      })
      macdLine.setData(macd.macd)
      seriesMap.set(`${paneId}__macd`, macdLine)
      const signalLine = chart.addSeries(LineSeries, {
        color: '#ffb300',
        lineWidth: 2,
        priceScaleId: 'right',
        priceFormat: { type: 'price', precision: 4, minMove: 0.0001 }
      })
      signalLine.setData(macd.signal)
      seriesMap.set(`${paneId}__macd_signal`, signalLine)
    } else if (engine === 'stoch') {
      const stoch = computeStochasticData(rows, props.indicatorPane?.period || 14)
      const kSeries = chart.addSeries(LineSeries, {
        color: '#7e57c2',
        lineWidth: 2,
        priceScaleId: 'right',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 }
      })
      kSeries.setData(stoch.k)
      seriesMap.set(`${paneId}__stoch_k`, kSeries)
      const dSeries = chart.addSeries(LineSeries, {
        color: '#26c6da',
        lineWidth: 2,
        priceScaleId: 'right',
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 }
      })
      dSeries.setData(stoch.d)
      seriesMap.set(`${paneId}__stoch_d`, dSeries)
      const upperLine = chart.addSeries(LineSeries, {
        color: 'rgba(239,83,80,0.8)',
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: 'right'
      })
      upperLine.setData(stoch.k.map((d) => ({ time: d.time, value: 80 })))
      seriesMap.set(`${paneId}__stoch_80`, upperLine)
      const lowerLine = chart.addSeries(LineSeries, {
        color: 'rgba(38,166,154,0.8)',
        lineWidth: 1,
        lineStyle: 2,
        priceScaleId: 'right'
      })
      lowerLine.setData(stoch.k.map((d) => ({ time: d.time, value: 20 })))
      seriesMap.set(`${paneId}__stoch_20`, lowerLine)
    } else if (engine === 'volume') {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceScaleId: 'right',
        priceFormat: { type: 'volume' }
      })
      volumeSeries.setData(rows.map((row: any, index: number) => ({
        time: row.time,
        value: Number(row.volume || 0),
        color: row.close >= row.open || (index > 0 && row.close >= rows[index - 1].close)
          ? 'rgba(38,166,154,0.75)'
          : 'rgba(239,83,80,0.75)'
      })))
      seriesMap.set(`${paneId}__volume`, volumeSeries)
    }
    applyPreferredViewport(rows.length)
    return
  }

  if (isCandleMode.value) {
    const symbol = props.symbols[0]
    const rows = rawData.value[symbol] || []
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: true,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceScaleId: 'right'
    })
    series.setData(rows.map((d: any) => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close
    })))
    seriesMap.set(symbol, series)
    seriesVisible.set(symbol, true)
    props.overlayIndicators.forEach((indicator, indicatorIndex) => {
      if (String(indicator.type).startsWith('pred_')) {
        addPredictionOverlay(rows, indicator.type as PredictionOverlayType, symbol, true)
        return
      }
      addOverlaySeries(rows, indicator, indicatorIndex, symbol)
    })
    applyPreferredViewport(rows.length)
    applyPredVisibility()
    return
  }

  props.symbols.forEach((symbol, index) => {
    if (props.hiddenSeries.has(symbol)) return
    const rows = rawData.value[symbol] || []
    if (!rows.length) return
    const values = rows.map((row: any) => Number(row.close)).filter((value: number) => Number.isFinite(value))
    const precision = computePrecision(values)
    const color = resolveColor(symbol, index)

    const commonOptions = {
      color,
      priceScaleId: 'right',
      priceFormat: { type: 'price', precision, minMove: Math.pow(10, -precision) }
    }

    let series: any
    if (props.chartType === 'area') {
      series = chart.addSeries(AreaSeries, {
        ...commonOptions,
        lineColor: color,
        topColor: `${color}55`,
        bottomColor: `${color}08`
      })
    } else if (props.chartType === 'bar') {
      series = chart.addSeries(HistogramSeries, {
        ...commonOptions,
        color
      })
    } else {
      series = chart.addSeries(LineSeries, {
        ...commonOptions,
        lineWidth: 2
      })
    }

    series.setData(rows.map((d: any) => ({ time: d.time, value: d.close })))
    seriesMap.set(symbol, series)
    seriesVisible.set(symbol, true)

    props.overlayIndicators.forEach((indicator, indicatorIndex) => {
      addOverlaySeries(rows, indicator, indicatorIndex, symbol)
    })
  })

  const primaryRows = rawData.value[props.symbols[0]] || []
  applyPreferredViewport(primaryRows.length)
}

type FetchContext = {
  dataSource: 'yahoo' | 'research' | 'economy'
  timeframe: string
  interval: string
  periodType: 'calendar' | 'fiscal'
  year: number
  rawMode: boolean
  cumulative: boolean
  sumberDana?: string
  kategoriPlant?: string
}

async function fetchSymbolData(symbol: string, ctx: FetchContext): Promise<{ rows: any[]; meta: { timezone?: string; currency?: string } | null }> {
  const cacheKey = [
    ctx.dataSource,
    symbol,
    ctx.timeframe,
    ctx.interval,
    ctx.periodType,
    String(ctx.year),
    ctx.rawMode ? '1' : '0',
    ctx.cumulative ? '1' : '0',
    ctx.sumberDana || '',
    ctx.kategoriPlant || ''
  ].join('|')
  const cached = responseCache.get(cacheKey)
  if (cached && Date.now() < cached.expiresAt) {
    return { rows: cached.rows, meta: cached.meta }
  }

  try {
    let res: Response
    if (ctx.dataSource === 'research') {
      const params = new URLSearchParams({
        timeframe: ctx.timeframe,
        interval: ctx.interval
      })
      res = await authFetch(`/api/research/data/${encodeURIComponent(symbol)}?${params.toString()}`)
    } else if (ctx.dataSource === 'economy') {
      const params = new URLSearchParams({
        timeframe: ctx.timeframe,
        interval: ctx.interval
      })
      res = await authFetch(`/api/economy/data/${encodeURIComponent(symbol)}?${params.toString()}`)
    } else {
      const params = new URLSearchParams({
        timeframe: ctx.timeframe,
        interval: ctx.interval,
        period_type: ctx.periodType,
        year: String(ctx.year),
        raw: ctx.rawMode ? 'true' : 'false',
        cumulative: ctx.cumulative ? 'true' : 'false'
      })
      if (ctx.sumberDana) params.set('sumber_dana', ctx.sumberDana)
      if (ctx.kategoriPlant) params.set('kategori_plant', ctx.kategoriPlant)
      res = await authFetch(`/api/procurement/data/${encodeURIComponent(symbol)}?${params.toString()}`)
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const rows = json.status === 'success' && Array.isArray(json.data) ? json.data : []
    const meta = json.meta
      ? {
          timezone: json.meta.timezone,
          currency: json.meta.currency
        }
      : null
    const ttlMs = ctx.dataSource === 'research'
      ? 60_000
      : ctx.dataSource === 'economy'
        ? 300_000
        : ['15m', '30m', '1h', '4h'].includes(ctx.interval) ? 15_000 : 120_000
    responseCache.set(cacheKey, {
      expiresAt: Date.now() + ttlMs,
      rows,
      meta
    })
    return { rows, meta }
  } catch (error) {
    emit('error', `Failed to load data for ${symbol}`)
    return { rows: [], meta: null }
  }
}

async function loadData() {
  const requestId = ++latestLoadRequestId
  const targetSymbols = (isCandleMode.value || isIndicatorPane.value)
    ? (props.symbols[0] ? [props.symbols[0]] : [])
    : props.symbols
  if (!targetSymbols.length) {
    rawData.value = {}
    buildSeries()
    emit('dataLoaded', {})
    return
  }

  const ctx: FetchContext = {
    dataSource: props.dataSource,
    timeframe: props.timeframe,
    interval: props.interval,
    periodType: props.periodType,
    year: props.year,
    rawMode: props.rawMode,
    cumulative: props.cumulative,
    sumberDana: props.sumberDana,
    kategoriPlant: props.kategoriPlant
  }

  const next: Record<string, any[]> = {}
  const nextMeta: Record<string, { timezone?: string; currency?: string }> = {}
  const settled = await Promise.allSettled(
    targetSymbols.map(async (symbol) => ({ symbol, payload: await fetchSymbolData(symbol, ctx) }))
  )
  if (requestId !== latestLoadRequestId) {
    return
  }
  settled.forEach((item) => {
    if (item.status === 'fulfilled') {
      next[item.value.symbol] = item.value.payload.rows
      if (item.value.payload.meta) {
        nextMeta[item.value.symbol] = item.value.payload.meta
      }
    }
  })
  rawData.value = next
  runtimeMetaBySymbol.value = nextMeta
  const firstSymbol = props.symbols[0]
  intradayDetected.value = firstSymbol ? detectIntradayFromRows(next[firstSymbol] || []) : false
  intradayDayBoundaryTimes.value = firstSymbol ? buildIntradayBoundarySet(next[firstSymbol] || []) : new Set<number>()
  buildSeries()
  emit('dataLoaded', next)
}

function clearAutoRefreshTimer() {
  if (autoRefreshTimer) {
    clearTimeout(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

function getAutoRefreshMs(): number {
  return isIntraday.value ? 15_000 : 60_000
}

function scheduleAutoRefresh() {
  clearAutoRefreshTimer()
  if (!props.symbols.length) return
  const delay = getAutoRefreshMs()
  autoRefreshTimer = setTimeout(async () => {
    await loadData()
    scheduleAutoRefresh()
  }, delay)
}

function recreateChart() {
  if (!chartContainer.value) return
  if (chart) {
    chart.remove()
    chart = null
  }
  chart = createChart(chartContainer.value, {
    width: chartContainer.value.clientWidth || chartContainer.value.offsetWidth || 800,
    height: props.height
  })
  applyThemeOptions()
  buildSeries()
}

function exportPng() {
  if (!chartContainer.value) return
  const canvas = chartContainer.value.querySelector('canvas') as HTMLCanvasElement | null
  if (!canvas) return
  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = `chart-${Date.now()}.png`
  link.click()
}

function exportCsv() {
  const rows = ['Time,' + props.symbols.join(',')]
  const times = new Set<number>()
  props.symbols.forEach((symbol) => {
    ;(rawData.value[symbol] || []).forEach((d: any) => times.add(d.time))
  })
  const sorted = Array.from(times).sort((a, b) => a - b)
  sorted.forEach((time) => {
    const dt = new Date(time * 1000).toISOString()
    const values = props.symbols.map((symbol) => {
      const row = (rawData.value[symbol] || []).find((d: any) => d.time === time)
      return row ? row.close : ''
    })
    rows.push(`${dt},${values.join(',')}`)
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `chart-data-${Date.now()}.csv`
  link.click()
}

function zoomIn() {
  if (!chart) return
  const ts = chart.timeScale()
  const range = ts.getVisibleLogicalRange()
  if (!range) return
  const center = (range.from + range.to) / 2
  const half = (range.to - range.from) / 4
  ts.setVisibleLogicalRange({ from: center - half, to: center + half })
}

function zoomOut() {
  if (!chart) return
  const ts = chart.timeScale()
  const range = ts.getVisibleLogicalRange()
  if (!range) {
    ts.fitContent()
    return
  }
  const center = (range.from + range.to) / 2
  const half = (range.to - range.from)
  ts.setVisibleLogicalRange({ from: center - half, to: center + half })
}

function fitContent() {
  if (!chart) return
  lastAppliedViewportKey = ''
  chart.timeScale().fitContent()
}

function resetPriceScale() {
  if (!chart) return
  try {
    chart.priceScale('right').applyOptions({
      autoScale: true,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1
      }
    })
  } catch {
    // no-op
  }
}

function resetViewport() {
  if (!chart) return
  lastAppliedViewportKey = ''
  resetPriceScale()
  const primaryRows = rawData.value[props.symbols[0]] || []
  applyPreferredViewport(primaryRows.length)
}

function syncViewportAfterPresetChange() {
  if (!chart) return
  lastAppliedViewportKey = ''
  const primaryRows = rawData.value[props.symbols[0]] || []
  if (!primaryRows.length) return
  const fullRangeTimeframes = new Set(['2Y', '3Y', '5Y', '72M', 'ALL'])
  if (fullRangeTimeframes.has(String(props.timeframe || ''))) {
    resetPriceScale()
    showAllLoadedBars(primaryRows)
    return
  }
  resetViewport()
}

function toggleSeries(seriesName: string) {
  const series = seriesMap.get(seriesName)
  if (!series) return
  const current = seriesVisible.get(seriesName) ?? true
  const next = !current
  series.applyOptions({ visible: next })
  seriesVisible.set(seriesName, next)
}

function panByPixels(deltaPx: number) {
  if (!chart) return
  try {
    const ts = chart.timeScale()
    const current = ts.scrollPosition()
    ts.scrollToPosition(current - deltaPx / 24, false)
  } catch {
    // no-op
  }
}

defineExpose({
  exportPng,
  exportCsv,
  zoomIn,
  zoomOut,
  fitContent,
  resetPriceScale,
  resetViewport,
  toggleSeries,
  panByPixels,
  refresh: loadData
})

watch(
  () => [props.height, props.theme, props.timezone] as const,
  () => {
    applyThemeOptions()
  }
)

watch(
  () => [props.chartType, props.hiddenSeries, props.colorOverrides, props.overlayIndicators, props.indicatorPane] as const,
  () => {
    buildSeries()
  },
  { deep: true }
)

watch(
  () => props.hiddenPredIds,
  () => {
    applyPredVisibility()
  },
  { deep: true }
)

watch(
  () => [
    props.symbols,
    props.dataSource,
    props.timeframe,
    props.interval,
    props.periodType,
    props.year,
    props.rawMode,
    props.cumulative,
    props.sumberDana,
    props.kategoriPlant
  ] as const,
  async (nextValues, previousValues) => {
    rawData.value = {}
    runtimeMetaBySymbol.value = {}
    await loadData()
    const rangeOrIntervalChanged =
      nextValues[2] !== previousValues?.[2] ||
      nextValues[3] !== previousValues?.[3]
    if (rangeOrIntervalChanged) {
      await nextTick()
      syncViewportAfterPresetChange()
    }
    scheduleAutoRefresh()
  },
  { deep: true }
)

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  recreateChart()
  if (chartContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      if (!chart || !chartContainer.value) return
      chart.applyOptions({
        width: chartContainer.value.clientWidth || chartContainer.value.offsetWidth || 800,
        height: props.height
      })
      lastAppliedViewportKey = ''
      const primaryRows = rawData.value[props.symbols[0]] || []
      applyPreferredViewport(primaryRows.length)
    })
    resizeObserver.observe(chartContainer.value)
  }
  await loadData()
  scheduleAutoRefresh()
})

onUnmounted(() => {
  clearAutoRefreshTimer()
  if (resizeObserver && chartContainer.value) {
    resizeObserver.unobserve(chartContainer.value)
  }
  resizeObserver = null
  if (chart) {
    chart.remove()
    chart = null
  }
})
</script>

<style scoped>
.chart-wrapper {
  width: 100%;
  min-height: 300px;
  height: 100%;
}

.chart-stage {
  min-width: 0;
  position: relative;
}

.lw-chart {
  width: 100%;
  height: 100%;
}

.chart-status-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 5;
  display: flex;
  gap: 6px;
  pointer-events: none;
}

.chart-status-pill {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(12, 18, 28, 0.82);
  color: #f5f7fb;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  backdrop-filter: blur(6px);
}

.chart-status-pill--muted {
  background: rgba(53, 65, 81, 0.78);
  color: #d7deea;
}
</style>
