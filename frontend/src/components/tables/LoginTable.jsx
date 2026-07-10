import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ChevronDown } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import SeverityBadge from '../common/SeverityBadge'
import { recentLogins } from '../../data/mockData'

const statusConfig = {
  blocked: { className: 'badge-critical', label: 'Blocked' },
  flagged: { className: 'badge-high', label: 'Flagged' },
  allowed: { className: 'badge-low', label: 'Allowed' },
}

export default function LoginTable({ onRowClick }) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('desc')

  const filtered = recentLogins.filter(
    (r) =>
      r.user.toLowerCase().includes(search.toLowerCase()) ||
      r.displayName.toLowerCase().includes(search.toLowerCase()) ||
      r.ip.includes(search)
  )

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0
    const valA = a[sortField]
    const valB = b[sortField]
    if (typeof valA === 'number') return sortDir === 'asc' ? valA - valB : valB - valA
    return sortDir === 'asc'
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA))
  })

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null
    return <ChevronDown size={12} className={`inline ml-0.5 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/80">Recent Logins</h3>
        <div className="relative w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search logins..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input w-full pl-8 pr-3 py-1.5 text-xs"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="table-glass w-full">
          <thead>
            <tr>
              <th className="cursor-pointer hover:text-white/60" onClick={() => toggleSort('user')}>
                User <SortIcon field="user" />
              </th>
              <th className="cursor-pointer hover:text-white/60" onClick={() => toggleSort('ip')}>
                IP Address <SortIcon field="ip" />
              </th>
              <th>Country</th>
              <th>Device</th>
              <th>OS</th>
              <th className="cursor-pointer hover:text-white/60" onClick={() => toggleSort('riskScore')}>
                Risk Score <SortIcon field="riskScore" />
              </th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onRowClick?.(row)}
                className="cursor-pointer"
              >
                <td>
                  <div>
                    <span className="text-sm font-medium text-white/80">{row.displayName}</span>
                    <span className="text-xs text-white/40 ml-2">@{row.user}</span>
                  </div>
                </td>
                <td className="font-mono text-xs">{row.ip}</td>
                <td>{row.country}</td>
                <td className="text-xs">{row.device}</td>
                <td className="text-xs">{row.os}</td>
                <td>
                  <span className={`font-bold text-sm ${
                    row.riskScore >= 70 ? 'text-red-400' :
                    row.riskScore >= 40 ? 'text-amber-400' : 'text-green-400'
                  }`}>
                    {row.riskScore}
                  </span>
                </td>
                <td>
                  <SeverityBadge
                    severity={row.status === 'blocked' ? 'critical' : row.status === 'flagged' ? 'high' : 'low'}
                    label={statusConfig[row.status]?.label || row.status}
                  />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
        <span className="text-xs text-white/40">{sorted.length} results</span>
        <div className="flex gap-1">
          <button className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all">Previous</button>
          <button className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/20 text-blue-400">1</button>
          <button className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all">2</button>
          <button className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all">Next</button>
        </div>
      </div>
    </GlassCard>
  )
}
