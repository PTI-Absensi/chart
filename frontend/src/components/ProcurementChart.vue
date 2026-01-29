<template>
  <div class="chart-wrapper">
    <apexchart
      ref="chartRef"
      :type="apexChartType"
      :height="height"
      :options="chartOptions"
      :series="chartSeries"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { authFetch } from '../utils/auth'

// Props
const props = withDefaults(defineProps<{
  chartType?: 'line' | 'area' | 'bar' | 'candlestick'
  periodType?: 'calendar' | 'fiscal'
  year?: number
  height?: number
  symbols?: string[]
  normalize?: boolean
  logScale?: boolean
}>(), {
  chartType: 'line',
  periodType: 'calendar',
  year: 2025,
  height: 450,
  symbols: () => [],
  normalize: false,
  logScale: false
})

// Emits
const emit = defineEmits<{
  (e: 'dataLoaded', data: any): void
  (e: 'error', message: string): void
}>()

// Refs
const chartRef = ref<any>(null)
const loading = ref(false)
const rawData = ref<Record<string, any[]>>({})

// Color palette for multiple series
const colors = [
  '#2962ff', '#26a69a', '#ef5350', '#ab47bc', '#ff9800',
  '#00bcd4', '#8bc34a', '#e91e63', '#3f51b5', '#009688'
]

// Computed chart type for ApexCharts
const apexChartType = computed(() => {
  return props.chartType === 'candlestick' ? 'candlestick' : props.chartType
})

// Chart options
const chartOptions = computed(() => {
  const baseOptions: any = {
    chart: {
      id: 'procurement-chart',
      type: apexChartType.value,
      background: 'transparent',
      foreColor: '#d1d4dc',
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
      zoom: { enabled: true },
      animations: {
        enabled: true,
        speed: 400,
        dynamicAnimation: { enabled: true, speed: 350 }
      }
    },
    theme: { mode: 'dark' },
    colors: colors.slice(0, props.symbols.length || 1),
    stroke: {
      curve: 'smooth',
      width: props.chartType === 'candlestick' ? 1 : 2
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
      borderColor: '#1e222d',
      strokeDashArray: 0
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: { colors: '#d1d4dc' },
        datetimeFormatter: {
          year: 'yyyy',
          month: "MMM 'yy",
          day: 'dd MMM',
          hour: 'HH:mm'
        }
      },
      axisBorder: { color: '#2a2e39' },
      axisTicks: { color: '#2a2e39' }
    },
    yaxis: {
      logarithmic: props.logScale,
      labels: {
        style: { colors: '#d1d4dc' },
        formatter: (val: number) => {
          if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M'
          if (val >= 1000) return (val / 1000).toFixed(1) + 'K'
          return val?.toFixed(0) || '0'
        }
      }
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      x: { format: 'dd MMM yyyy' }
    },
    legend: {
      show: props.symbols.length > 1,
      position: 'top',
      horizontalAlign: 'left',
      labels: { colors: '#d1d4dc' }
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

  return props.symbols.map((symbol, index) => {
    const data = rawData.value[symbol] || []
    
    if (props.chartType === 'candlestick') {
      return {
        name: symbol,
        type: 'candlestick',
        data: data.map((d: any) => ({
          x: new Date(d.time * 1000),
          y: [d.open, d.high, d.low, d.close]
        }))
      }
    }

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

// Fetch data for a symbol
async function fetchSymbolData(symbol: string) {
  try {
    const params = new URLSearchParams({
      period_type: props.periodType,
      year: props.year.toString()
    })
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
  if (props.symbols.length === 0) return

  loading.value = true
  const newData: Record<string, any[]> = {}

  for (const symbol of props.symbols) {
    if (!rawData.value[symbol]) {
      newData[symbol] = await fetchSymbolData(symbol)
    } else {
      newData[symbol] = rawData.value[symbol]
    }
  }

  rawData.value = newData
  loading.value = false
  emit('dataLoaded', newData)
}

// Watch for symbol changes
watch(() => props.symbols, () => {
  loadData()
}, { deep: true })

// Watch for period/year changes
watch([() => props.periodType, () => props.year], () => {
  // Clear cache and reload
  rawData.value = {}
  loadData()
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

// Expose methods
defineExpose({
  exportPng,
  exportCsv,
  zoomIn,
  zoomOut,
  refresh: loadData
})

// Initial load
onMounted(() => {
  if (props.symbols.length > 0) {
    loadData()
  }
})
</script>

<style scoped>
.chart-wrapper {
  width: 100%;
  min-height: 300px;
}
</style>
