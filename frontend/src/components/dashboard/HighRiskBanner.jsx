import { motion } from 'framer-motion'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import GlassCard from '../glass/GlassCard'

export default function HighRiskBanner({ onInvestigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="glass-card-sm p-4 mb-4"
      style={{
        borderLeft: '3px solid #ef4444',
        boxShadow: '0 0 30px rgba(239,68,68,0.1), 0 12px 30px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex items-center gap-4">
        <div className="p-2.5 rounded-xl bg-red-500/10">
          <AlertTriangle size={20} className="text-red-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="badge badge-critical">CRITICAL</span>
            <span className="text-sm font-semibold text-white/90">Impossible Travel Detected</span>
          </div>
          <p className="text-sm text-white/60 mt-0.5">
            <span className="font-medium text-red-400">James Smith</span> — Login from Moscow, RU
            14 min after New York, US session. 7,510 km impossible travel.
          </p>
        </div>
        <div className="text-right">
          <motion.span
            className="text-2xl font-bold text-red-400"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 10, delay: 0.3 }}
          >
            94
          </motion.span>
          <div className="text-[10px] text-white/30 font-medium">RISK</div>
        </div>
        <button
          onClick={onInvestigate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-all"
        >
          Investigate
          <ArrowRight size={14} />
        </button>
      </div>
    </motion.div>
  )
}
