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
          <div className="mt-4 px-3 py-3 rounded-xl bg-white/[0.03] space-y-2.5">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] font-semibold text-white">
                OP
              </div>
              <div>
                <p className="text-sm font-medium text-white/80">Operator</p>
                <p className="text-xs text-white/40">Analyst</p>
              </div>
            </div>
            <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">ML Models</div>
            {[
              { name: 'Isolation Forest', weight: '0.35', status: 'ok' },
              { name: 'LOF', weight: '0.25', status: 'ok' },
              { name: 'One-Class SVM', weight: '0.20', status: 'ok' },
              { name: 'Elliptic Envelope', weight: '0.20', status: 'warning' },
            ].map((m, i) => (
              <motion.div
                key={m.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${m.status === 'ok' ? 'bg-green-500' : 'bg-amber-400'}`} />
                  <span className="text-[11px] text-white/60 truncate">{m.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-white/30 font-mono">{m.weight}</span>
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                </div>
              </motion.div>
            ))}
            <div className="pt-2 mt-1 border-t border-white/[0.06] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">Inference</span>
                <span className="text-[10px] text-green-400 font-mono">8ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">Events/min</span>
                <span className="text-[10px] text-white/60 font-mono">327</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">Accuracy</span>
                <span className="text-[10px] text-green-400 font-mono">96.4%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/40">Model</span>
                <span className="text-[10px] text-white/60 font-mono">v1.4.2</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  )
}
