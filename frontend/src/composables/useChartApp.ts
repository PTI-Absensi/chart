import { onMounted } from 'vue'
import { initChartApp } from '../legacy/chart-app'

export function useChartApp() {
  onMounted(() => {
    initChartApp()
  })
}
