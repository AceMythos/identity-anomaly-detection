import { motion } from 'framer-motion'
import GlassCard from '../components/glass/GlassCard'
import SeverityBadge from '../components/common/SeverityBadge'

const baselines = [
  { user: 'James Smith', avgLogin: '09:15', avgLogout: '17:45', countries: ['US'], devices: ['Chrome/macOS', 'Chrome/Win'], loginsPerDay: 4.2, mfa: true, risk: 94, status: 'critical' },
  { user: 'Alice Chen', avgLogin: '08:30', avgLogout: '18:00', countries: ['US'], devices: ['Firefox/macOS', 'Chrome/Win'], loginsPerDay: 3.8, mfa: true, risk: 91, status: 'critical' },
  { user: 'Bob Smith', avgLogin: '09:00', avgLogout: '17:30', countries: ['US'], devices: ['Chrome/Win', 'Edge/Win'], loginsPerDay: 5.1, mfa: true, risk: 82, status: 'high' },
  { user: 'Charlie Davis', avgLogin: '10:00', avgLogout: '19:00', countries: ['US'], devices: ['Firefox/Linux'], loginsPerDay: 3.2, mfa: true, risk: 55, status: 'medium' },
  { user: 'Diana Martinez', avgLogin: '07:30', avgLogout: '16:30', countries: ['IN'], devices: ['Chrome/Win'], loginsPerDay: 2.1, mfa: false, risk: 35, status: 'low' },
  { user: 'Eve Contractor', avgLogin: '09:30', avgLogout: '17:00', countries: ['GB'], devices: ['Safari/macOS'], loginsPerDay: 6.5, mfa: false, risk: 62, status: 'medium' },
]

export default function BehaviorPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 pt-3">
      <div className="max-w-[1440px] mx-auto">
        <h1 className="text-lg font-semibold text-white mb-1">User Behavior Baselines</h1>
        <p className="text-sm text-white/50 mb-5">ML-generated behavioral profiles compared against current activity</p>

        <div className="glass-card-sm overflow-hidden">
          <table className="table-glass w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>Avg Login</th>
                <th>Avg Logout</th>
                <th className="hidden md:table-cell">Countries</th>
                <th className="hidden lg:table-cell">Devices</th>
                <th>Logins/Day</th>
                <th>MFA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {baselines.map((b, i) => (
                <motion.tr key={b.user} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <td>
                    <span className="text-sm font-medium text-white/90">{b.user}</span>
                  </td>
                  <td className="text-sm text-white/70 font-mono">{b.avgLogin}</td>
                  <td className="text-sm text-white/70 font-mono">{b.avgLogout}</td>
                  <td className="hidden md:table-cell">
                    <div className="flex gap-1">{b.countries.map(c => <span key={c} className="badge badge-info">{c}</span>)}</div>
                  </td>
                  <td className="hidden lg:table-cell text-xs text-white/50">{b.devices.join(', ')}</td>
                  <td className="text-sm text-white/70">{b.loginsPerDay}</td>
                  <td>
                    {b.mfa ? (
                      <span className="text-xs text-green-400 font-medium">On</span>
                    ) : (
                      <span className="text-xs text-amber-400 font-medium">Off</span>
                    )}
                  </td>
                  <td><SeverityBadge severity={b.status} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
