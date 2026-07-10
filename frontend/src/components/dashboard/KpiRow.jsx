import { motion } from 'framer-motion'
import { Activity, AlertTriangle, Users, Shield } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import Sparkline from '../common/Sparkline'
import useAnimatedCounter from '../../hooks/useAnimatedCounter'
import { kpiData, sparklineData } from '../../data/mockData'

const kpiConfig = [
  {
    icon: Activity,
    label: 'Total Events',
    data: kpiData.totalEvents,
    color: '#3b82f6',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    format: true,
  },
  {
    icon: AlertTriangle,
    label: 'Anomalies',
    data: kpiData.anomalies,
    color: '#f59e0b',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    format: false,
  },
  {
    icon: Shield,
    label: 'High Risk Users',
    data: kpiData.highRiskUsers,
    color: '#ef4444',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    format: false,
  },
  {
    icon: Users,
    label: 'Users Monitored',
    data: kpiData.usersMonitored,
    color: '#22c55e',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
    format: false,
  },
]

function KPICardInner({ icon: Icon, label, data, color, iconBg, iconColor, format }) {
  const animatedValue = useAnimatedCounter(data.value)

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
        <div className="w-20 h-9">
          <Sparkline data={sparklineData} color={color} height={36} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-white mb-0.5 tracking-tight">
        {format ? animatedValue : animatedValue}
      </p>
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">{label}</p>
        <span className={`text-xs font-medium ${
          data.trend === 'up' ? 'text-red-400' : 'text-green-400'
        }`}>
          {data.trend === 'up' ? '↑' : '↓'} {Math.abs(data.change)}%
        </span>
      </div>
    </GlassCard>
  )
}

export default function KpiRow() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {kpiConfig.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <KPICardInner {...kpi} />
        </motion.div>
      ))}
    </div>
  )
}
