import { motion } from 'framer-motion'
import { FileText, Download, Clock, BarChart3, Shield, Users } from 'lucide-react'

const reports = [
  { name: 'Weekly Anomaly Summary', type: 'PDF', date: '2026-07-10', size: '2.4 MB', icon: BarChart3, desc: 'Aggregated anomaly detection metrics and trends for the past 7 days.' },
  { name: 'User Risk Assessment', type: 'PDF', date: '2026-07-09', size: '1.8 MB', icon: Users, desc: 'Comprehensive risk scoring breakdown for all monitored users.' },
  { name: 'MITRE ATT&CK Coverage', type: 'PDF', date: '2026-07-08', size: '1.2 MB', icon: Shield, desc: 'Detected techniques mapped to the MITRE ATT&CK framework with severity analysis.' },
  { name: 'Model Performance Report', type: 'PDF', date: '2026-07-07', size: '3.1 MB', icon: BarChart3, desc: 'Ensemble model accuracy, precision, recall, and false positive analysis.' },
  { name: 'Compliance Summary', type: 'PDF', date: '2026-07-06', size: '0.9 MB', icon: Shield, desc: 'Compliance-relevant security events and access patterns.' },
]

export default function ReportsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 pt-3">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-semibold text-white mb-1">Reports</h1>
            <p className="text-sm text-white/50">Generated reports and exports</p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/15 text-blue-400 text-sm font-medium hover:bg-blue-500/25 transition-all">
            <FileText size={14} /> Generate Report
          </button>
        </div>

        <div className="space-y-2">
          {reports.map((r, i) => (
            <motion.div
              key={r.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card-sm p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/10 flex-shrink-0">
                <r.icon size={18} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white/90">{r.name}</h3>
                <p className="text-xs text-white/50 mt-0.5">{r.desc}</p>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-white/35">
                  <span className="flex items-center gap-1"><FileText size={10} /> {r.type}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {r.date}</span>
                  <span>{r.size}</span>
                </div>
              </div>
              <button className="p-2 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-all">
                <Download size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
