import type { RouteRecordRaw } from 'vue-router'
import ChartPage from '../pages/ChartPage.vue'
import DfgPage from '../pages/DfgPage.vue'
import ProcessTimePage from '../pages/ProcessTimePage.vue'
import LoginPage from '../pages/LoginPage.vue'
import DataSourcesPage from '../pages/DataSourcesPage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: LoginPage },
  { path: '/', name: 'chart', component: ChartPage },
  { path: '/sources', name: 'sources', component: DataSourcesPage },
  { path: '/dfg', name: 'dfg', component: DfgPage },
  { path: '/process-time', name: 'process-time', component: ProcessTimePage }
]

export default routes
