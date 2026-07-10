import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './components/layout/Sidebar'
import TopNavbar from './components/layout/TopNavbar'
import HighRiskBanner from './components/dashboard/HighRiskBanner'
import KpiRow from './components/dashboard/KpiRow'
import ChartGrid from './components/dashboard/ChartGrid'
import AlertFeed from './components/alerts/AlertFeed'
import LoginTable from './components/tables/LoginTable'
import InvestigationDrawer from './components/investigation/InvestigationDrawer'

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activePage, setActivePage] = useState('dashboard')
  const [investigationOpen, setInvestigationOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState(null)

  const handleAlertClick = useCallback((alert) => {
    setSelectedAlert(alert)
    setInvestigationOpen(true)
  }, [])

  const handleInvestigate = useCallback(() => {
    setSelectedAlert(null)
    setInvestigationOpen(true)
  }, [])

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

          <AnimatePresence mode="wait">
            {activePage === 'dashboard' && (
              <motion.main
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="p-5 pt-3"
              >
                <div className="max-w-[1440px] mx-auto">
                  <HighRiskBanner onInvestigate={handleInvestigate} />
                  <KpiRow />

                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
                    <div className="xl:col-span-2">
                      <ChartGrid />
                    </div>
                    <div className="space-y-5">
                      <AlertFeed onAlertClick={handleAlertClick} />
                    </div>
                  </div>

                  <LoginTable onRowClick={handleAlertClick} />
                </div>
              </motion.main>
            )}
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
