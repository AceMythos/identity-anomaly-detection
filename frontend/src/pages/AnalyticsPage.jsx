import { motion } from 'framer-motion'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import GlassCard from '../components/glass/GlassCard'

const trendData = [
  { date: 'Mon', events: 420, anomalies: 12, fp: 3 },
  { date: 'Tue', events: 380, anomalies: 18, fp: 5 },
  { date: 'Wed', events: 450, anomalies: 8, fp: 2 },
  { date: 'Thu', events: 410, anomalies: 22, fp: 7 },
  { date: 'Fri', events: 390, anomalies: 15, fp: 4 },
  { date: 'Sat', events: 280, anomalies: 25, fp: 8 },
  { date: 'Sun', events: 310, anomalies: 20, fp: 6 },
]

const modelData = [
  { model: 'Isolation Forest', accuracy: 94, precision: 91, recall: 88, f1: 89 },
  { model: 'LOF', accuracy: 88, precision: 85, recall: 82, f1: 83 },
  { model: 'One-Class SVM', accuracy: 82, precision: 79, recall: 76, f1: 77 },
  { model: 'Elliptic Envelope', accuracy: 78, precision: 74, recall: 70, f1: 72 },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null
  return (
    <div className="chart-tooltip">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>{entry.name}: {entry.value}</p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 pt-3">
      <div className="max-w-[1440px] mx-auto">
        <h1 className="text-lg font-semibold text-white mb-1">Analytics</h1>
        <p className="text-sm text-white/50 mb-5">Deep-dive metrics across all detection models</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-white/80 mb-4">Detection Trends (7-day)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="ana" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="events" name="Events" stroke="#3b82f6" strokeWidth={2} fill="url(#ana)" strokeLinecap="round" />
                  <Area type="monotone" dataKey="anomalies" name="Anomalies" stroke="#ef4444" strokeWidth={2} fill="none" strokeLinecap="round" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="text-sm font-semibold text-white/80 mb-4">Model Performance Comparison</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="model" type="category" stroke="rgba(255,255,255,0.15)" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="accuracy" name="Accuracy" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="precision" name="Precision" fill="#8b5cf6" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="recall" name="Recall" fill="#f59e0b" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {modelData.map((m, i) => (
            <motion.div key={m.model} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass-card-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2 h-2 rounded-full ${m.accuracy >= 90 ? 'bg-green-500' : m.accuracy >= 80 ? 'bg-amber-400' : 'bg-red-400'}`} />
                <h4 className="text-sm font-semibold text-white/80">{m.model}</h4>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Accuracy', value: `${m.accuracy}%`, color: m.accuracy >= 90 ? 'text-green-400' : 'text-amber-400' },
                  { label: 'Precision', value: `${m.precision}%`, color: 'text-blue-400' },
                  { label: 'Recall', value: `${m.recall}%`, color: 'text-purple-400' },
                  { label: 'F1 Score', value: `${m.f1}%`, color: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-white/40">{s.label}</p>
                    <p className={`font-semibold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
