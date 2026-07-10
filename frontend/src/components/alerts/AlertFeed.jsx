import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ExternalLink } from 'lucide-react'
import GlassCard, { GlassCardSm } from '../glass/GlassCard'
import SeverityBadge from '../common/SeverityBadge'
import { alerts } from '../../data/mockData'

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
const sortedAlerts = [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = Math.floor((now - d) / 60000)
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return d.toLocaleDateString()
}

export default function AlertFeed({ onAlertClick }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/80">Recent Alerts</h3>
        <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
          View All
        </button>
      </div>
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        <AnimatePresence>
          {sortedAlerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
              onClick={() => onAlertClick?.(alert)}
              className="group flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.04] cursor-pointer transition-all"
            >
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                alert.severity === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                alert.severity === 'high' ? 'bg-red-400' :
                alert.severity === 'medium' ? 'bg-amber-400' : 'bg-green-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-sm font-medium text-white/80 truncate">{alert.type}</span>
                </div>
                <p className="text-xs text-white/50 truncate">{alert.description}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-white/40 flex items-center gap-1">
                    <Clock size={10} />
                    {formatTime(alert.timestamp)}
                  </span>
                  <span className="text-xs text-white/40">{alert.user}</span>
                  <span className="text-xs font-mono text-white/30">{alert.mitreId}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-sm font-bold ${
                  alert.riskScore >= 70 ? 'text-red-400' :
                  alert.riskScore >= 40 ? 'text-amber-400' : 'text-green-400'
                }`}>
                  {alert.riskScore}
                </span>
                <div className="text-[10px] text-white/30 font-medium mt-0.5">RISK</div>
              </div>
              <ExternalLink size={14} className="text-white/20 group-hover:text-white/50 mt-1 transition-colors flex-shrink-0" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GlassCard>
  )
}
