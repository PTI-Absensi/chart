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
  normalize?: boolean
  logScale?: boolean
  rawMode?: boolean
  cumulative?: boolean
  singleScale?: boolean
  scaleSide?: 'left' | 'right'
  symbolMeta?: Record<string, { name?: string; description?: string }>
  sumberDana?: string
  kategoriPlant?: string
  theme?: 'dark' | 'light'
}>(), {
  chartType: 'line',
  periodType: 'calendar',
  year: 2025,
  height: 450,
  symbols: () => [],
  normalize: false,
  logScale: false,
  rawMode: false,
  cumulative: false,
  singleScale: false,
  scaleSide: 'left',
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

// Chart options
const chartOptions = computed(() => {
  const tokens = themeTokens.value
  const hasRightAxis = props.singleScale
    ? props.scaleSide === 'right'
    : props.symbols.some((_, index) => index % 2 === 1)
  const hasLeftAxis = props.singleScale
    ? props.scaleSide === 'left'
    : props.symbols.length > 0

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
    colors: colors.slice(0, props.symbols.length || 1),
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
        left: hasLeftAxis ? 18 : 0,
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
        format: 'dd MMM yyyy',
        datetimeFormatter: {
          year: 'yyyy',
          month: 'MMM yyyy',
          day: 'dd MMM yyyy',
          hour: 'HH:mm'
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
          min: yAxisBounds.value.min,
          max: yAxisBounds.value.max,
          axisBorder: { show: true, offsetX: 0 },
          axisTicks: { show: true, offsetX: 0 },
          labels: {
            style: { colors: tokens.text },
            maxWidth:60,  // Limit width for cleaner layout
            offsetX: props.scaleSide === 'right' ? 0 : -12,
            formatter: (val: number) => {
              if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B'
              if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M'
              if (val >= 1e3) return (val / 1e3).toFixed(0) + 'K'
              return val?.toFixed(0) || '0'
            }
          },
          tooltip: { enabled: true }
        }
      : props.symbols.map((symbol, index) => ({
          seriesName: symbol,
          opposite: index % 2 === 1, // Alternate left/right
          logarithmic: props.logScale,
          min: yAxisBoundsBySymbol.value[symbol]?.min,
          max: yAxisBoundsBySymbol.value[symbol]?.max,
          axisTicks: { show: true, offsetX: 0 },
          axisBorder: { show: true, color: colors[index % colors.length], offsetX: 0 },
          labels: {
            style: { colors: colors[index % colors.length] },
            maxWidth: 60,  // Limit width
            offsetX: index % 2 === 1 ? 0 : -12,
            formatter: (val: number) => {
              if (val >= 1e9) return (val / 1e9).toFixed(1) + 'B'
              if (val >= 1e6) return (val / 1e6).toFixed(1) + 'M'
              if (val >= 1e3) return (val / 1e3).toFixed(0) + 'K'
              return val?.toFixed(0) || '0'
            }
          },
          title: {
            text: symbol,
            style: { color: colors[index % colors.length] }
          },
          tooltip: { enabled: true }
        })),
    tooltip: {
      theme: tokens.tooltip,
      shared: true,
      intersect: false,
      x: { format: 'dd MMM yyyy' }
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
    
    const url = `/api/procurement/data/${symbol}?${params}`
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

// Expose methods
defineExpose({
  exportPng,
  exportCsv,
  zoomIn,
  zoomOut,
  toggleSeries,
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
