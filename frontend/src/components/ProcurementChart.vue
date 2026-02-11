<template>
  <div class="chart-wrapper">
    <apexchart
      v-if="chartReady"
      :key="chartKey"
      ref="chartRef"
      :type="apexChartType"
      :height="height"
      :options="chartOptions"
      :series="chartSeries"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { authFetch } from '../utils/auth'

// Props
const props = withDefaults(defineProps<{
  chartType?: 'line' | 'area' | 'bar'
  periodType?: 'calendar' | 'fiscal'
  year?: number
  height?: number
  symbols?: string[]
  hiddenSeries?: Set<string>
  colorOverrides?: Record<string, string>
  normalize?: boolean
  logScale?: boolean
  rawMode?: boolean
  cumulative?: boolean
  singleScale?: boolean
  scaleSide?: 'left' | 'right'
  yAxisOverride?: { min?: number; max?: number }
  yAxisBySymbolOverride?: Record<string, { min?: number; max?: number }>
  symbolMeta?: Record<string, { name?: string; description?: string; unit?: string }>
  sumberDana?: string
  kategoriPlant?: string
  theme?: 'dark' | 'light'
}>(), {
  chartType: 'line',
  periodType: 'calendar',
  year: 2025,
  height: 450,
  symbols: () => [],
  hiddenSeries: () => new Set(),
  colorOverrides: () => ({}),
  normalize: false,
  logScale: false,
  rawMode: false,
  cumulative: false,
  singleScale: false,
  scaleSide: 'left',
  yAxisOverride: undefined,
  yAxisBySymbolOverride: undefined,
  symbolMeta: () => ({}),
  sumberDana: '',
  kategoriPlant: '',
  theme: 'dark'
})

// Emits
const emit = defineEmits<{
  (e: 'dataLoaded', data: any): void
  (e: 'error', message: string): void
}>()

// Refs
const chartRef = ref<any>(null)
const chartReady = ref(false)
let isUnmounted = false
const loading = ref(false)
const rawData = ref<Record<string, any[]>>({})

// Color palette for multiple series
const colors = [
  '#2962ff', '#26a69a', '#ef5350', '#ab47bc', '#ff9800',
  '#00bcd4', '#8bc34a', '#e91e63', '#3f51b5', '#009688'
]

function toRgba(hex: string, alpha: number) {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function resolveColor(symbol: string, index: number): string {
  const base = props.colorOverrides?.[symbol] || colors[index % colors.length]
  return props.hiddenSeries.has(symbol) ? toRgba(base, 0.35) : base
}

// Computed chart type for ApexCharts
const apexChartType = computed(() => props.chartType)
const chartKey = computed(() => {
  const symbolsKey = props.symbols.join('|')
  return `${props.chartType}-${symbolsKey}-${props.logScale ? 1 : 0}-${props.normalize ? 1 : 0}-${props.theme}`
})

const themeTokens = computed(() => {
  const isDark = props.theme === 'dark'
  return {
    foreColor: isDark ? '#d2dbd4' : '#1a1d21',
    text: isDark ? '#d2dbd4' : '#4b5563',
    grid: isDark ? 'rgba(229, 236, 231, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    gridSoft: isDark ? 'rgba(229, 236, 231, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    crosshair: isDark ? '#48c1b4' : '#2563eb',
    tooltip: isDark ? 'dark' : 'light'
  }
})

const numberShortId = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1
})

const currencyShortId = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1
})

type CurrencyScale = { divisor: number; suffix: string; label: string }

function formatCountShort(val: number): string {
  if (!Number.isFinite(val)) return '0'
  if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B'
  if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M'
  if (val >= 1e3) return (val / 1e3).toFixed(0) + 'K'
  return val.toFixed(0)
}

function getCurrencyScale(maxVal: number): CurrencyScale {
  if (!Number.isFinite(maxVal) || maxVal <= 0) return { divisor: 1, suffix: '', label: 'Rp' }
  if (maxVal >= 1e12) return { divisor: 1e12, suffix: 'T', label: 'Triliun' }
  if (maxVal >= 1e9) return { divisor: 1e9, suffix: 'M', label: 'Miliar' }
  if (maxVal >= 1e6) return { divisor: 1e6, suffix: 'Jt', label: 'Juta' }
  if (maxVal >= 1e3) return { divisor: 1e3, suffix: 'Rb', label: 'Ribu' }
  return { divisor: 1, suffix: '', label: 'Rp' }
}

function formatCurrencyScaled(val: number, scale: CurrencyScale, mode: 'axis' | 'tooltip' = 'axis'): string {
  if (!Number.isFinite(val)) return 'Rp 0'
  if (scale.divisor === 1) return currencyShortId.format(val)
  const suffix = mode === 'tooltip' ? scale.label : scale.suffix
  return `Rp ${numberShortId.format(val / scale.divisor)} ${suffix}`.trim()
}

const dateFormatterId = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
})

// Chart options
const chartOptions = computed(() => {
  const tokens = themeTokens.value
  const primarySymbol = props.symbols.find((s) => getUnit(s) === 'Rp') || props.symbols[0]
  const primaryUnit = primarySymbol ? getUnit(primarySymbol) : ''
  const primaryScale = currencyScaleGlobal.value

  const formatYAxisValue = (symbol: string | undefined, val: number, mode: 'axis' | 'tooltip' = 'axis') => {
    const unit = symbol ? getUnit(symbol) : primaryUnit
    if (unit === 'Rp') {
      const scale = props.singleScale ? primaryScale : (currencyScaleBySymbol.value[symbol || ''] || primaryScale)
      return formatCurrencyScaled(val, scale, mode)
    }
    return formatCountShort(val)
  }

  const unitLabel = (symbol: string | undefined) => {
    const unit = symbol ? getUnit(symbol) : primaryUnit
    if (unit !== 'Rp') return ''
    const scale = props.singleScale ? primaryScale : (currencyScaleBySymbol.value[symbol || ''] || primaryScale)
    return scale.label && scale.label !== 'Rp' ? `Rp (${scale.label})` : 'Rp'
  }
  const hasRightAxis = props.singleScale
    ? props.scaleSide === 'right'
    : props.symbols.some((_, index) => index % 2 === 1)
  const hasLeftAxis = props.singleScale
    ? props.scaleSide === 'left'
    : props.symbols.length > 0
  const leftPad = props.singleScale && props.scaleSide === 'right'
    ? 18
    : (hasLeftAxis ? 18 : 0)

  const baseOptions: any = {
    chart: {
      id: 'procurement-chart',
      type: apexChartType.value,
      width: '100%',
      background: 'transparent',
      foreColor: tokens.foreColor,
      fontFamily: "'Inter', sans-serif",
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true
        }
      },
      zoom: { 
        enabled: true,
        type: 'x',
        autoScaleYaxis: false
      },
      // Add margins for better spacing
      offsetX: 0,
      offsetY: 0,
      // Selection to add right padding by default
      selection: {
        enabled: true,
        xaxis: {
          // Will be set dynamically to show data + 5% padding on right
        }
      },
      animations: {
        enabled: true,
        speed: 400,
        dynamicAnimation: { enabled: true, speed: 350 }
      }
    },
    theme: { mode: props.theme },
    legend: { 
      show: true,
      position: 'top',
      horizontalAlign: 'left',
      floating: true,
      offsetX: -30,
      offsetY: -5,
      labels: { colors: tokens.foreColor, fontSize: '9px' },
      markers: { width: 8, height: 8, radius: 4 },
      itemMargin: { horizontal: 6, vertical: 4 },
      formatter: (seriesName: string) => {
        const meta = props.symbolMeta?.[seriesName]
        const desc = meta?.description || meta?.name
        if (!desc) return seriesName
        return `${seriesName}<br><span class="legend-desc">${desc}</span>`
      },
      onItemClick: { toggleDataSeries: true },
      onItemHover: { highlightDataSeries: true }
    },
    colors: props.symbols.map((symbol, index) => resolveColor(symbol, index)),
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: props.chartType === 'area' ? 'gradient' : 'solid',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100]
      }
    },
    grid: {
      borderColor: tokens.gridSoft,
      strokeDashArray: 4,
      xaxis: {
        lines: { show: true }
      },
      yaxis: {
        lines: { show: true }
      },
      padding: {
        right: hasRightAxis ? 18 : 0,
        left: leftPad,
        top: props.singleScale ? 18 : 0,
        bottom: 0
      }
    },
    xaxis: {
      type: 'datetime',
      min: xAxisBounds.value.min,
      max: xAxisBounds.value.max,
      labels: {
        style: { colors: tokens.text },
        datetimeUTC: false,
        formatter: (val: string, timestamp?: number) => {
          const ts = typeof timestamp === 'number' ? timestamp : Number(val)
          return Number.isFinite(ts) ? dateFormatterId.format(new Date(ts)) : val
        }
      },
      axisBorder: { color: tokens.grid },
      axisTicks: { color: tokens.grid },
      tickAmount: 12,
      crosshairs: {
        show: true,
        position: 'back',
        stroke: {
          color: tokens.crosshair,
          width: 1,
          dashArray: 4
        }
      }
    },
    // Y-axes: single scale if enabled, otherwise one per series
    yaxis: props.singleScale || props.symbols.length <= 1
      ? {
          opposite: props.scaleSide === 'right',
          logarithmic: props.logScale,
          min: props.yAxisOverride?.min ?? yAxisBounds.value.min,
          max: props.yAxisOverride?.max ?? yAxisBounds.value.max,
          axisBorder: { show: true, offsetX: 0 },
          axisTicks: { show: true, offsetX: 0 },
          labels: {
            style: { colors: tokens.text },
            maxWidth:60,  // Limit width for cleaner layout
            offsetX: props.scaleSide === 'right' ? 0 : -12,
            formatter: (val: number) => formatYAxisValue(primarySymbol, val)
          },
          title: {
            text: unitLabel(primarySymbol),
            style: { color: tokens.text }
          },
          tooltip: { enabled: true }
        }
      : props.symbols.map((symbol, index) => ({
          seriesName: symbol,
          opposite: index % 2 === 1, // Alternate left/right
          logarithmic: props.logScale,
          min: props.yAxisBySymbolOverride?.[symbol]?.min ?? yAxisBoundsBySymbol.value[symbol]?.min,
          max: props.yAxisBySymbolOverride?.[symbol]?.max ?? yAxisBoundsBySymbol.value[symbol]?.max,
          axisTicks: { show: true, offsetX: 0 },
          axisBorder: { show: true, color: resolveColor(symbol, index), offsetX: 0 },
          labels: {
            style: { colors: resolveColor(symbol, index) },
            maxWidth: 60,  // Limit width
            offsetX: index % 2 === 1 ? 0 : -12,
            formatter: (val: number) => formatYAxisValue(symbol, val)
          },
          title: {
            text: unitLabel(symbol) ? `${symbol} (${unitLabel(symbol)})` : symbol,
            style: { color: resolveColor(symbol, index) }
          },
          tooltip: { enabled: true }
        })),
    tooltip: {
      theme: tokens.tooltip,
      shared: true,
      intersect: false,
      x: {
        formatter: (val: number) => dateFormatterId.format(new Date(val))
      },
      y: {
        formatter: (val: number, opts: any) => {
          const seriesName = opts?.w?.globals?.seriesNames?.[opts.seriesIndex]
          return formatYAxisValue(seriesName, val, 'tooltip')
        }
      }
    },
    dataLabels: { enabled: false },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#26a69a',
          downward: '#ef5350'
        }
      },
      bar: {
        columnWidth: '60%'
      }
    }
  }

  return baseOptions
})

// Chart series data
const chartSeries = computed(() => {
  if (props.symbols.length === 0) {
    return []
  }

  return props.symbols.map((symbol) => {
    const data = rawData.value[symbol] || []

    let values = data.map((d: any) => d.close)
    
    // Normalize if enabled
    if (props.normalize && values.length > 0) {
      const firstVal = values[0]
      if (firstVal > 0) {
        values = values.map((v: number) => (v / firstVal) * 100)
      }
    }

    return {
      name: symbol,
      data: data.map((d: any, i: number) => ({
        x: new Date(d.time * 1000),
        y: props.normalize ? values[i] : d.close
      }))
    }
  })
})

const xAxisBounds = computed(() => {
  if (props.symbols.length === 0) return { min: undefined, max: undefined }
  const times: number[] = []
  props.symbols.forEach((symbol) => {
    const data = rawData.value[symbol] || []
    data.forEach((d: any) => {
      if (typeof d.time === 'number') times.push(d.time)
    })
  })
  if (times.length === 0) return { min: undefined, max: undefined }
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const range = Math.max(maxTime - minTime, 7 * 24 * 60 * 60)
  const paddedMax = maxTime + Math.round(range * 0.05)
  return { min: minTime * 1000, max: paddedMax * 1000 }
})

function getUnit(symbol: string): string {
  return props.symbolMeta?.[symbol]?.unit || ''
}

const currencyScaleBySymbol = computed<Record<string, CurrencyScale>>(() => {
  const scales: Record<string, CurrencyScale> = {}
  props.symbols.forEach((symbol) => {
    if (getUnit(symbol) !== 'Rp') return
    const data = rawData.value[symbol] || []
    const maxVal = data.reduce((max, d) => Math.max(max, Number(d.close) || 0), 0)
    scales[symbol] = getCurrencyScale(maxVal)
  })
  return scales
})

const currencyScaleGlobal = computed<CurrencyScale>(() => {
  let maxVal = 0
  props.symbols.forEach((symbol) => {
    if (getUnit(symbol) !== 'Rp') return
    const data = rawData.value[symbol] || []
    const localMax = data.reduce((max, d) => Math.max(max, Number(d.close) || 0), 0)
    if (localMax > maxVal) maxVal = localMax
  })
  return getCurrencyScale(maxVal)
})

const yAxisBounds = computed(() => {
  if (props.symbols.length === 0) return { min: undefined, max: undefined }
  const values: number[] = []
  props.symbols.forEach((symbol) => {
    const data = rawData.value[symbol] || []
    data.forEach((d: any) => {
      if (typeof d.close === 'number') values.push(d.close)
    })
  })
  if (values.length === 0) return { min: undefined, max: undefined }
  let minVal = Math.min(...values)
  let maxVal = Math.max(...values)
  if (props.logScale) {
    minVal = Math.max(minVal, 1)
  }
  const range = Math.max(maxVal - minVal, 1)
  const pad = range * 0.05
  const paddedMin = minVal >= 0 ? Math.max(0, minVal - pad) : minVal - pad
  return { min: paddedMin, max: maxVal + pad }
})

const yAxisBoundsBySymbol = computed(() => {
  const bounds: Record<string, { min?: number; max?: number }> = {}
  props.symbols.forEach((symbol) => {
    const data = rawData.value[symbol] || []
    if (data.length === 0) {
      bounds[symbol] = { min: undefined, max: undefined }
      return
    }
    const values = data.map((d: any) => d.close).filter((v: any) => typeof v === 'number')
    if (values.length === 0) {
      bounds[symbol] = { min: undefined, max: undefined }
      return
    }
    let minVal = Math.min(...values)
    let maxVal = Math.max(...values)
    if (props.logScale) {
      minVal = Math.max(minVal, 1)
    }
    const range = Math.max(maxVal - minVal, 1)
    const pad = range * 0.05
    const paddedMin = minVal >= 0 ? Math.max(0, minVal - pad) : minVal - pad
    bounds[symbol] = { min: paddedMin, max: maxVal + pad }
  })
  return bounds
})

// Fetch data for a symbol
async function fetchSymbolData(symbol: string) {
  try {
    const params = new URLSearchParams({
      period_type: props.periodType,
      year: props.year.toString(),
      raw: props.rawMode ? 'true' : 'false',
      cumulative: props.cumulative ? 'true' : 'false'
    })
    // Add optional filters
    if (props.sumberDana) params.set('sumber_dana', props.sumberDana)
    if (props.kategoriPlant) params.set('kategori_plant', props.kategoriPlant)
    
    const url = `/procurement/data/${symbol}?${params}`
    console.log('Fetching:', url)
    const res = await authFetch(url)
    const json = await res.json()
    console.log('Response for', symbol, ':', json)
    if (json.status === 'success' && json.data) {
      console.log('Data count:', json.data.length)
      return json.data
    }
    return []
  } catch (err) {
    console.error(`Error fetching data for ${symbol}:`, err)
    emit('error', `Failed to load data for ${symbol}`)
    return []
  }
}

// Load all symbol data
async function loadData() {
  if (isUnmounted || !chartReady.value || props.symbols.length === 0) return

  loading.value = true
  const newData: Record<string, any[]> = {}

  for (const symbol of props.symbols) {
    if (isUnmounted) return
    if (!rawData.value[symbol]) {
      newData[symbol] = await fetchSymbolData(symbol)
    } else {
      newData[symbol] = rawData.value[symbol]
    }
  }

  if (isUnmounted) return
  rawData.value = newData
  loading.value = false
  emit('dataLoaded', newData)
}

// Watch for symbol changes
watch(() => props.symbols, () => {
  if (chartReady.value) loadData()
}, { deep: true })

// Watch for period/year/rawMode/filters changes
watch([
  () => props.periodType, 
  () => props.year, 
  () => props.rawMode,
  () => props.cumulative,
  () => props.sumberDana,
  () => props.kategoriPlant
], () => {
  // Clear cache and reload
  rawData.value = {}
  if (chartReady.value) loadData()
})

// Export chart as PNG
function exportPng() {
  if (chartRef.value) {
    chartRef.value.dataURI().then((uri: any) => {
      const link = document.createElement('a')
      link.href = uri.imgURI
      link.download = `chart-${Date.now()}.png`
      link.click()
    })
  }
}

// Export data as CSV
function exportCsv() {
  const rows = ['Time,' + props.symbols.join(',')]
  
  // Get all unique times
  const times = new Set<number>()
  props.symbols.forEach(symbol => {
    (rawData.value[symbol] || []).forEach((d: any) => times.add(d.time))
  })
  
  const sortedTimes = Array.from(times).sort()
  
  sortedTimes.forEach(time => {
    const date = new Date(time * 1000).toISOString().split('T')[0]
    const values = props.symbols.map(symbol => {
      const point = (rawData.value[symbol] || []).find((d: any) => d.time === time)
      return point ? point.close : ''
    })
    rows.push(date + ',' + values.join(','))
  })
  
  const csv = rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `chart-data-${Date.now()}.csv`
  link.click()
}

// Zoom controls
function zoomIn() {
  if (chartRef.value) {
    chartRef.value.zoomX(
      chartRef.value.w.globals.minX,
      chartRef.value.w.globals.maxX * 0.8
    )
  }
}

function zoomOut() {
  if (chartRef.value) {
    chartRef.value.resetSeries()
  }
}

// Toggle series visibility by name
function toggleSeries(seriesName: string) {
  if (chartRef.value) {
    chartRef.value.toggleSeries(seriesName)
  }
}

function panByPixels(deltaPx: number) {
  if (!chartRef.value) return
  const globals = chartRef.value.w?.globals
  if (!globals) return
  const minX = globals.minX
  const maxX = globals.maxX
  const gridWidth = globals.gridWidth || 0
  if (!minX || !maxX || gridWidth <= 0) return
  const range = maxX - minX
  if (range <= 0) return
  const dataMin = xAxisBounds.value.min ?? minX
  const dataMax = xAxisBounds.value.max ?? maxX
  const deltaMs = (deltaPx / gridWidth) * range
  let nextMin = minX - deltaMs
  let nextMax = maxX - deltaMs
  if (dataMin !== undefined && dataMax !== undefined) {
    const clampedMin = Math.max(dataMin, nextMin)
    const clampedMax = Math.min(dataMax, nextMax)
    const clampedRange = clampedMax - clampedMin
    if (clampedRange <= 0) return
    nextMin = clampedMin
    nextMax = clampedMax
  }
  chartRef.value.updateOptions(
    { xaxis: { min: nextMin, max: nextMax } },
    false,
    false,
    false
  )
}

// Expose methods
defineExpose({
  exportPng,
  exportCsv,
  zoomIn,
  zoomOut,
  toggleSeries,
  panByPixels,
  refresh: loadData
})

// Initial load
onMounted(() => {
  chartReady.value = true
  if (props.symbols.length > 0) {
    loadData()
  }
})

onUnmounted(() => {
  isUnmounted = true
  chartReady.value = false
})
</script>

<style scoped>
.chart-wrapper {
  width: 100%;
  min-height: 300px;
}

:deep(.apexcharts-legend-series) {
  align-items: center;
  overflow: visible;
  padding: 2px 0;
  min-height: 18px;
}

:deep(.apexcharts-legend) {
  overflow: visible;
  padding-left: 6px;
}

:deep(.apexcharts-legend-marker) {
  margin-left: 2px;
  margin-right: 6px;
  overflow: visible;
}

:deep(.apexcharts-legend-text) {
  line-height: 1.2;
  color: var(--ink);
}

:deep(.apexcharts-legend-text .legend-desc) {
  display: block;
  font-size: 0.7rem;
  color: var(--muted);
  margin-top: 2px;
}

:deep(.apexcharts-yaxis),
:deep(.apexcharts-yaxis-texts-g) {
  overflow: visible;
}
</style>
