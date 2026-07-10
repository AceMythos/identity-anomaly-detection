import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Shield, AlertTriangle, MoreHorizontal } from 'lucide-react'

const users = [
  { name: 'James Smith', user: 'jsmith', dept: 'Engineering', role: 'Senior Developer', risk: 94, alerts: 3, status: 'critical', mfa: true, logins: 47, country: 'US' },
  { name: 'Alice Chen', user: 'alice.c', dept: 'Product', role: 'Product Manager', risk: 91, alerts: 2, status: 'critical', mfa: true, logins: 38, country: 'US' },
  { name: 'Bob Smith', user: 'b.smith', dept: 'Engineering', role: 'Developer', risk: 82, alerts: 1, status: 'high', mfa: true, logins: 52, country: 'US' },
  { name: 'Charlie Davis', user: 'charlie.d', dept: 'DevOps', role: 'SRE', risk: 55, alerts: 1, status: 'medium', mfa: true, logins: 29, country: 'US' },
  { name: 'Diana Martinez', user: 'diana.m', dept: 'Design', role: 'Designer', risk: 35, alerts: 1, status: 'low', mfa: false, logins: 18, country: 'IN' },
  { name: 'Eve Contractor', user: 'eve.c', dept: 'External', role: 'Contractor', risk: 62, alerts: 1, status: 'medium', mfa: false, logins: 24, country: 'GB' },
  { name: 'Admin Service', user: 'admin_sa', dept: 'IT', role: 'Service Account', risk: 19, alerts: 0, status: 'normal', mfa: true, logins: 156, country: 'US' },
  { name: 'Build Service', user: 'svc_build', dept: 'DevOps', role: 'Service Account', risk: 13, alerts: 0, status: 'normal', mfa: true, logins: 89, country: 'US' },
]

export default function UsersPage() {
  const [query, setQuery] = useState('')
  const filtered = users.filter(u => u.name.toLowerCase().includes(query.toLowerCase()) || u.user.includes(query))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 pt-3">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-white">Users</h1>
            <p className="text-sm text-white/50">{users.length} users monitored</p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users..." className="glass-input w-full pl-9 pr-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Users', value: users.length, change: '+2 this week', color: 'text-white' },
            { label: 'High Risk', value: users.filter(u => u.status === 'critical').length, change: '+1 today', color: 'text-red-400' },
            { label: 'MFA Disabled', value: users.filter(u => !u.mfa).length, change: 'action required', color: 'text-amber-400' },
            { label: 'Avg Risk Score', value: Math.round(users.reduce((s, u) => s + u.risk, 0) / users.length), change: '-5% vs baseline', color: 'text-green-400' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card-sm p-4">
              <p className="text-xs text-white/40 mb-1">{stat.label}</p>
              <p className={`text-2xl font-semibold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-white/30 mt-0.5">{stat.change}</p>
            </motion.div>
          ))}
        </div>

        <div className="glass-card-sm overflow-hidden">
          <table className="table-glass w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>Department</th>
                <th>Role</th>
                <th>Risk</th>
                <th>Alerts</th>
                <th>MFA</th>
                <th>Logins</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <motion.tr key={u.user} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] font-semibold text-white">
                        {u.name.split(' ').map(s => s[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white/90">{u.name}</p>
                        <p className="text-[10px] text-white/40">@{u.user}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm text-white/60">{u.dept}</td>
                  <td className="text-sm text-white/60">{u.role}</td>
                  <td>
                    <span className={`font-bold text-sm ${u.risk >= 70 ? 'text-red-400' : u.risk >= 40 ? 'text-amber-400' : 'text-green-400'}`}>
                      {u.risk}
                    </span>
                  </td>
                  <td>
                    {u.alerts > 0 ? (
                      <span className="badge badge-critical">{u.alerts}</span>
                    ) : (
                      <span className="text-white/30 text-xs">—</span>
                    )}
                  </td>
                  <td>
                    {u.mfa ? (
                      <span className="text-[10px] flex items-center gap-0.5 text-green-400"><Shield size={10} /> On</span>
                    ) : (
                      <span className="text-[10px] flex items-center gap-0.5 text-amber-400"><AlertTriangle size={10} /> Off</span>
                    )}
                  </td>
                  <td className="text-sm text-white/60">{u.logins}</td>
                  <td><MoreHorizontal size={14} className="text-white/20 hover:text-white/50 cursor-pointer" /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
