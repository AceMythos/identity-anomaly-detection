import { motion } from 'framer-motion'

const severityConfig = {
  critical: { className: 'badge-critical', label: 'Critical' },
  high: { className: 'badge-high', label: 'High' },
  medium: { className: 'badge-medium', label: 'Medium' },
  low: { className: 'badge-low', label: 'Low' },
  info: { className: 'badge-info', label: 'Info' },
}

export default function SeverityBadge({ severity = 'info', label, pulse = false }) {
  const config = severityConfig[severity] || severityConfig.info

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`badge ${config.className} ${pulse ? 'animate-pulse-glow' : ''}`}
    >
      {pulse && (
        <span className={`w-1.5 h-1.5 rounded-full bg-current animate-pulse`} />
      )}
      {label || config.label}
    </motion.span>
  )
}
