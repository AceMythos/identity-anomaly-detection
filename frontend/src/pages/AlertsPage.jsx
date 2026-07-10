import { useState } from 'react'
import { motion } from 'framer-motion'
import { Filter, Clock } from 'lucide-react'
import GlassCard from '../components/glass/GlassCard'
import SeverityBadge from '../components/common/SeverityBadge'

const filters = ['All', 'Critical', 'High', 'Medium', 'Low', 'Acknowledged']

const allAlerts = [
  { id: 1, severity: 'critical', user: 'jsmith', displayName: 'James Smith', type: 'Impossible Travel', description: 'Login from Moscow 14 min after New York', timestamp: '2026-07-10T02:16:33Z', riskScore: 94, status: 'new', mitre: 'T1078' },
  { id: 2, severity: 'critical', user: 'alice.c', displayName: 'Alice Chen', type: 'TOR Exit Node', description: 'Authentication via known TOR exit node', timestamp: '2026-07-10T01:45:12Z', riskScore: 91, status: 'new', mitre: 'T1090.003' },
  { id: 3, severity: 'high', user: 'b.smith', displayName: 'Bob Smith', type: 'Password Spraying', description: '12 failed logins across 5 accounts', timestamp: '2026-07-10T00:22:08Z', riskScore: 82, status: 'acknowledged', mitre: 'T1110.003' },
  { id: 4, severity: 'high', user: 'svc_backup', displayName: 'Backup Service', type: 'Service Abuse', description: 'Service account login at 03:14 AM', timestamp: '2026-07-09T23:58:44Z', riskScore: 78, status: 'new', mitre: 'T1484' },
  { id: 5, severity: 'medium', user: 'eve.contractor', displayName: 'Eve Contractor', type: 'New Device', description: 'First login from unknown device', timestamp: '2026-07-09T22:10:30Z', riskScore: 62, status: 'new', mitre: 'T1078.001' },
  { id: 6, severity: 'medium', user: 'charlie.d', displayName: 'Charlie Davis', type: 'Off-Hours Access', description: 'Login at 02:30 AM - baseline is 09:15 AM', timestamp: '2026-07-09T21:05:17Z', riskScore: 55, status: 'dismissed', mitre: 'T1078' },
  { id: 7, severity: 'low', user: 'diana.m', displayName: 'Diana Martinez', type: 'New Country', description: 'First login from Singapore', timestamp: '2026-07-09T19:30:22Z', riskScore: 35, status: 'new', mitre: 'T1078' },
]

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = Math.floor((now - d) / 60000)
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return d.toLocaleDateString()
}

export default function AlertsPage() {
  const [activeFilter, setActiveFilter] = useState('All')

  const filtered = activeFilter === 'All'
    ? allAlerts
    : activeFilter === 'Acknowledged'
    ? allAlerts.filter(a => a.status === 'acknowledged')
    : allAlerts.filter(a => a.severity === activeFilter.toLowerCase())

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 pt-3"
    >
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-white">Alerts</h1>
            <p className="text-sm text-white/50">{filtered.length} alerts ({allAlerts.filter(a => a.status === 'new').length} new)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40 flex items-center gap-1"><Clock size={12} /> Last 24 hours</span>
            <button className="glass-input flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/60">
              <Filter size={12} /> Filter
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeFilter === f ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <GlassCard className="overflow-hidden">
          <table className="table-glass w-full">
            <thead>
              <tr>
                <th>Severity</th>
                <th>User</th>
                <th>Type</th>
                <th className="hidden md:table-cell">Description</th>
                <th>Risk</th>
                <th>MITRE</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((alert, i) => (
                <motion.tr
                  key={alert.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td><SeverityBadge severity={alert.severity} pulse={alert.status === 'new'} /></td>
                  <td className="font-medium text-white/90">{alert.displayName}</td>
                  <td><span className="text-white/70">{alert.type}</span></td>
                  <td className="hidden md:table-cell text-white/50 max-w-[200px] truncate">{alert.description}</td>
                  <td>
                    <span className={`font-bold text-sm ${alert.riskScore >= 70 ? 'text-red-400' : alert.riskScore >= 40 ? 'text-amber-400' : 'text-green-400'}`}>
                      {alert.riskScore}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-white/30">{alert.mitre}</td>
                  <td className="text-xs text-white/40">{formatTime(alert.timestamp)}</td>
                  <td>
                    {alert.status === 'new' ? (
                      <span className="badge badge-new">New</span>
                    ) : alert.status === 'acknowledged' ? (
                      <span className="badge badge-info">Acked</span>
                    ) : (
                      <span className="badge badge-low">Dismissed</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      </div>
    </motion.div>
  )
}
