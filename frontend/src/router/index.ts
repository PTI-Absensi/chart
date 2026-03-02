import type { RouteRecordRaw } from 'vue-router'
import ChartPage from '../pages/ChartPage.vue'
import DfgPage from '../pages/DfgPage.vue'
import ProcessTimePage from '../pages/ProcessTimePage.vue'
import LoginPage from '../pages/LoginPage.vue'
import DataSourcesPage from '../pages/DataSourcesPage.vue'
import ChartBuilderPage from '../pages/ChartBuilderPage.vue'
import DashboardsPage from '../pages/DashboardsPage.vue'
import DashboardReportPage from '../pages/DashboardReportPage.vue'
import TemplatesPage from '../pages/TemplatesPage.vue'
import AdminPage from '../pages/AdminPage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: LoginPage },
  { path: '/', name: 'chart', component: ChartPage },
  { path: '/sources', name: 'sources', component: DataSourcesPage },
  { path: '/builder', name: 'builder', component: ChartBuilderPage },
  { path: '/dashboards', name: 'dashboards', component: DashboardsPage },
  { path: '/dashboard-report', name: 'dashboard-report', component: DashboardReportPage },
  { path: '/templates', name: 'templates', component: TemplatesPage },
  { path: '/admin', name: 'admin', component: AdminPage },
  { path: '/dfg', name: 'dfg', component: DfgPage },
  { path: '/process-time', name: 'process-time', component: ProcessTimePage }
]

export default routes
