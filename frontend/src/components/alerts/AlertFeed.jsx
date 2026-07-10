import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ExternalLink, CheckCircle, XCircle } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
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
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white/80">Recent Alerts</h3>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">
            {alerts.filter(a => a.status === 'new').length} new
          </span>
        </div>
        <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
          View All
        </button>
      </div>
      <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
        <AnimatePresence>
          {sortedAlerts.map((alert, i) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.025, duration: 0.25 }}
              onClick={() => onAlertClick?.(alert)}
              className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] cursor-pointer transition-all"
            >
              <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                alert.severity === 'critical' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                alert.severity === 'high' ? 'bg-red-400' :
                alert.severity === 'medium' ? 'bg-amber-400' : 'bg-green-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-sm font-medium text-white/80 truncate">{alert.displayName}</span>
                  <span className="text-xs text-white/40">{alert.type}</span>
                </div>
                <p className="text-xs text-white/50 truncate">{alert.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-white/35 flex items-center gap-1">
                    <Clock size={10} />
                    {formatTime(alert.timestamp)}
                  </span>
                  <span className="text-xs font-mono text-white/25">{alert.mitreId}</span>
                  {alert.status === 'acknowledged' && (
                    <span className="text-[10px] flex items-center gap-0.5 text-blue-400">
                      <CheckCircle size={10} /> Acked
                    </span>
                  )}
                  {alert.status === 'dismissed' && (
                    <span className="text-[10px] flex items-center gap-0.5 text-white/30">
                      <XCircle size={10} /> Dismissed
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-sm font-bold ${
                  alert.riskScore >= 70 ? 'text-red-400' :
                  alert.riskScore >= 40 ? 'text-amber-400' : 'text-green-400'
                }`}>
                  {alert.riskScore}
                </span>
                <div className="text-[10px] text-white/25 font-medium">RISK</div>
              </div>
              <ExternalLink size={13} className="text-white/15 group-hover:text-white/40 mt-1 transition-colors flex-shrink-0" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GlassCard>
  )
}
