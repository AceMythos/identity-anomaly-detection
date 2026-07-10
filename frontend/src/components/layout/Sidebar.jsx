import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, AlertTriangle, Users, Search, BarChart3,
  Activity, Shield, FileText, Settings, ChevronLeft, ChevronRight,
} from 'lucide-react'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: AlertTriangle, label: 'Alerts', id: 'alerts', badge: 12 },
  { icon: Users, label: 'Users', id: 'users' },
  { icon: Search, label: 'Investigations', id: 'investigations' },
  { icon: BarChart3, label: 'Analytics', id: 'analytics' },
  { icon: Activity, label: 'User Behavior', id: 'behavior' },
  { icon: Shield, label: 'MITRE ATT&CK', id: 'mitre' },
  { icon: FileText, label: 'Reports', id: 'reports' },
]

const bottomItems = [
  { icon: Settings, label: 'Settings', id: 'settings' },
]

const systemStatus = {
  label: 'All Systems Operational',
  color: '#22c55e',
}

export default function Sidebar({ collapsed, setCollapsed, activePage, setActivePage }) {
  return (
    <motion.aside
      initial={{ width: collapsed ? 72 : 256 }}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="h-screen flex flex-col py-4 px-3 sidebar fixed left-0 top-0 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-2 mb-6 mt-1">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <span className="font-semibold text-sm text-white/90">Sentinel</span>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-all"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={18} />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 text-left"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {!collapsed && item.badge && (
              <span className="text-[11px] font-semibold bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="pt-4 border-t border-white/[0.06]">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePage(item.id)}
            className={`sidebar-item ${activePage === item.id ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={18} />
            {!collapsed && (
              <span>{item.label}</span>
            )}
          </button>
        ))}

        {!collapsed && (
          <div className="mt-4 px-3 py-3 rounded-xl bg-white/[0.03]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs font-semibold text-white">
                OP
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Operator</p>
                <p className="text-xs text-white/40">Analyst</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.06]">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: systemStatus.color }} />
              <span className="text-xs text-white/50">{systemStatus.label}</span>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
