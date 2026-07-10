import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import TopNavbar from './components/layout/TopNavbar'
import HighRiskBanner from './components/dashboard/HighRiskBanner'
import KpiRow from './components/dashboard/KpiRow'
import ChartGrid from './components/dashboard/ChartGrid'
import AlertFeed from './components/alerts/AlertFeed'
import WorldMap from './components/dashboard/WorldMap'
import LoginTable from './components/tables/LoginTable'
import InvestigationDrawer from './components/investigation/InvestigationDrawer'
import useDashboardData from './hooks/useDashboardData'
import AlertsPage from './pages/AlertsPage'
import UsersPage from './pages/UsersPage'
import AnalyticsPage from './pages/AnalyticsPage'
import BehaviorPage from './pages/BehaviorPage'
import MitrePage from './pages/MitrePage'
import ReportsPage from './pages/ReportsPage'

function SettingsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 pt-3">
      <div className="max-w-[1440px] mx-auto">
        <h1 className="text-lg font-semibold text-white mb-1">Settings</h1>
        <p className="text-sm text-white/50">System configuration and preferences</p>
        <div className="mt-5 glass-card-sm p-5">
          <p className="text-sm text-white/60">System configuration panel. Integration settings, notification preferences, and ML model tuning will be available here.</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activePage, setActivePage] = useState('dashboard')
  const [investigationOpen, setInvestigationOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const { data, loading, error } = useDashboardData()

  const handleAlertClick = useCallback((alert) => {
    setSelectedAlert(alert)
    setInvestigationOpen(true)
  }, [])

  const handleInvestigate = useCallback(() => {
    setSelectedAlert(null)
    setInvestigationOpen(true)
  }, [])

  const dashboard = data || {
    kpis: { totalEvents: 0, anomalies: 0, highRiskUsers: 0, usersMonitored: 0,
            totalEventsChange: 0, anomaliesChange: 0, highRiskChange: 0 },
    anomalyTrend: [], riskDistribution: [], userActivity: [],
    topReasons: [], recentLogins: [], alerts: [], scatterData: [],
  }

  const pages = {
    dashboard: (
      <motion.main key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="p-5 pt-3">
        <div className="max-w-[1440px] mx-auto">
          <HighRiskBanner onInvestigate={handleInvestigate} />
          <KpiRow
            totalEvents={dashboard.kpis.totalEvents}
            anomalies={dashboard.kpis.anomalies}
            highRiskUsers={dashboard.kpis.highRiskUsers}
            usersMonitored={dashboard.kpis.usersMonitored}
            eventsChange={dashboard.kpis.totalEventsChange}
            anomalyChange={dashboard.kpis.anomaliesChange}
          />
          <div className="mb-5"><WorldMap /></div>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
            <div className="xl:col-span-2">
              <ChartGrid
                anomalyTrend={dashboard.anomalyTrend}
                riskDistribution={dashboard.riskDistribution}
                userActivity={dashboard.userActivity}
                topReasons={dashboard.topReasons}
              />
            </div>
            <div className="space-y-5">
              <AlertFeed alerts={dashboard.alerts} onAlertClick={handleAlertClick} />
            </div>
          </div>
          <LoginTable logins={dashboard.recentLogins} onRowClick={handleAlertClick} />
        </div>
      </motion.main>
    ),
    alerts: <AlertsPage key="alerts" />,
    users: <UsersPage key="users" />,
    investigations: <AlertsPage key="investigations" />,
    analytics: <AnalyticsPage key="analytics" />,
    behavior: <BehaviorPage key="behavior" />,
    mitre: <MitrePage key="mitre" />,
    reports: <ReportsPage key="reports" />,
    settings: <SettingsPage key="settings" />,
  }

  return (
    <div className="min-h-screen bg-navy-950 bg-ambient">
      <div className="relative z-10 min-h-screen bg-grid bg-radial-glow">
        <Sidebar
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          activePage={activePage}
          setActivePage={setActivePage}
        />

        <div
          className="transition-all duration-300 min-h-screen"
          style={{ marginLeft: sidebarCollapsed ? 72 : 256 }}
        >
          <TopNavbar />

          {error && (
            <div className="mx-5 mt-3 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 text-sm border border-red-500/20">
              Backend offline — running in demo mode with mock data: {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {pages[activePage]}
          </AnimatePresence>
        </div>

        <InvestigationDrawer
          isOpen={investigationOpen}
          onClose={() => setInvestigationOpen(false)}
          alert={selectedAlert}
        />
      </div>
    </div>
  )
}
