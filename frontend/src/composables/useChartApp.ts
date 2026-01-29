import { onMounted, onUnmounted } from 'vue'
import { initChartApp, destroyChartApp } from '../legacy/chart-app'

export function useChartApp() {
  onMounted(() => {
    initChartApp()
  })

  onUnmounted(() => {
    destroyChartApp()
  })
}
