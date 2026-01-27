import type { RouteRecordRaw } from 'vue-router'
import ChartPage from '../pages/ChartPage.vue'
import DfgPage from '../pages/DfgPage.vue'
import ProcessTimePage from '../pages/ProcessTimePage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'chart', component: ChartPage },
  { path: '/dfg', name: 'dfg', component: DfgPage },
  { path: '/process-time', name: 'process-time', component: ProcessTimePage }
]

export default routes
