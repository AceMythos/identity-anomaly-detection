import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, CheckCircle, Shield, FileText } from 'lucide-react'
import GlassCard from '../glass/GlassCard'
import SeverityBadge from '../common/SeverityBadge'
import { investigationData as defaultData } from '../../data/mockData'

function EventTimeline({ timeline }) {
  const iconMap = {
    x: { icon: X, color: '#ef4444', bg: 'bg-red-500/10' },
    check: { icon: CheckCircle, color: '#22c55e', bg: 'bg-green-500/10' },
    shield: { icon: Shield, color: '#f59e0b', bg: 'bg-amber-500/10' },
    file: { icon: FileText, color: '#ef4444', bg: 'bg-red-500/10' },
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Event Timeline</h4>
      <div className="relative">
        <div className="absolute left-[13px] top-3 bottom-3 w-px bg-white/[0.06]" />
        <div className="space-y-4">
          {timeline.map((event, i) => {
            const mapped = iconMap[event.icon] || iconMap.x
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-3"
              >
                <div className={`w-7 h-7 rounded-full ${mapped.bg} flex items-center justify-center flex-shrink-0 z-10`}>
                  <mapped.icon size={12} style={{ color: mapped.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white/80">{event.event}</span>
                    {event.severity === 'critical' && (
                      <SeverityBadge severity="critical" label="Critical" />
                    )}
                    {event.severity === 'high' && !event.event.includes('Failed') && (
                      <SeverityBadge severity="high" label="High" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs font-mono text-white/40">{event.time}</span>
                    <span className="text-xs text-white/40">{event.country}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FeatureContributionChart({ contributions }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-4">Feature Contribution</h4>
      <div className="space-y-3">
        {contributions.map((item, i) => (
          <div key={item.feature}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white/70">{item.feature}</span>
              <motion.span
                className="text-sm font-bold"
                style={{ color: item.color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                +{item.value}
              </motion.span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / 50) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AIExplanation({ explanation, confidence }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">AI Analysis</h4>
      <div className="glass-card-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-white/50">Ensemble Model Confidence</span>
          <div className="flex items-center gap-2">
            <motion.div
              className="h-1.5 w-20 rounded-full bg-white/[0.06] overflow-hidden"
            >
              <motion.div
                className="h-full rounded-full bg-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
              />
            </motion.div>
            <span className="text-sm font-bold text-purple-400">{confidence}%</span>
          </div>
        </div>
        <div className="text-sm text-white/60 leading-relaxed whitespace-pre-line">
          {explanation}
        </div>
      </div>
    </div>
  )
}

function UserBaseline({ baseline }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">User Baseline</h4>
      <div className="glass-card-sm p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-white/40">Avg Login Time</p>
            <p className="text-sm font-medium text-white/80">{baseline.avgLoginHour}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Avg Logout Time</p>
            <p className="text-sm font-medium text-white/80">{baseline.avgLogoutHour}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Logins/Day</p>
            <p className="text-sm font-medium text-white/80">{baseline.avgLoginsPerDay}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">MFA Enabled</p>
            <p className="text-sm font-medium text-white/80">{baseline.mfaEnabled ? 'Yes' : 'No'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-white/40 mb-1">Known Countries</p>
            <div className="flex gap-1">
              {baseline.countries.map((c) => (
                <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60">{c}</span>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-white/40 mb-1">Known Devices</p>
            <div className="space-y-1">
              {baseline.devices.map((d) => (
                <p key={d} className="text-xs text-white/60">{d}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MitreCard({ mitreId, mitreName, mitreDescription }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">MITRE ATT&CK</h4>
      <div className="glass-card-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400">{mitreId}</span>
          <span className="text-sm font-medium text-white/80">{mitreName}</span>
        </div>
        <p className="text-xs text-white/50 leading-relaxed">{mitreDescription}</p>
        <button className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors">
          View in MITRE ATT&CK →
        </button>
      </div>
    </div>
  )
}

export default function InvestigationDrawer({ isOpen, onClose, data, alert }) {
  const d = data || defaultData
  const overlay = alert || null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-xl z-50 overflow-y-auto"
            style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="min-h-full glass p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Investigation</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white/70 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="glass-card-sm p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={overlay?.severity || d.severity} pulse />
                  <span className="text-xs text-white/40">{overlay?.mitreId || d.mitreId}</span>
                </div>
                <div className="text-right">
                  <motion.span
                    className={`text-3xl font-bold ${(overlay?.riskScore || d.riskScore) >= 70 ? 'text-red-400' : (overlay?.riskScore || d.riskScore) >= 40 ? 'text-amber-400' : 'text-green-400'}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                  >
                    {overlay?.riskScore || d.riskScore}
                  </motion.span>
                  <div className="text-[10px] text-white/30 font-medium">RISK SCORE</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-white/40">User</p>
                  <p className="font-medium text-white/90">{overlay?.displayName || d.displayName}</p>
                  <p className="text-xs text-white/40">@{overlay?.user || d.user}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40">Alert Type</p>
                  <p className="font-medium text-white/90">{overlay?.type || d.mitreName}</p>
                  <p className="text-xs text-white/40">{overlay?.description || `Triggered: ${d.mitreId}`}</p>
                </div>
              </div>

                <div className="glass-divider my-4" />

                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <p className="text-xs text-white/40">IP Address</p>
                    <p className="font-mono text-white/80">{d.ip}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">ASN</p>
                    <p className="text-white/80">{d.asn}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Country</p>
                    <p className="font-medium text-red-400">{d.country}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Previous Country</p>
                    <p className="text-white/80">{d.previousCountry}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Device</p>
                    <p className="text-white/80">{d.device}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Browser</p>
                    <p className="text-white/80">{d.browser}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Operating System</p>
                    <p className="text-white/80">{d.os}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Distance</p>
                    <p className="font-medium text-red-400">{d.distanceKm.toLocaleString()} km</p>
                  </div>
                </div>

                <div className="glass-divider my-4" />

                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle size={14} className="text-red-400" />
                  <span className="text-red-400 font-medium">Impossible Travel Detected</span>
                  <span className="text-white/50">
                    — {d.previousCity} → {d.city} in {d.timeSincePreviousLogin} min
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <EventTimeline timeline={d.timeline} />
                <FeatureContributionChart contributions={d.featureContributions} />
                <MitreCard mitreId={d.mitreId} mitreName={d.mitreName} mitreDescription={d.mitreDescription} />
                <AIExplanation explanation={d.aiExplanation} confidence={d.confidence} />
                <UserBaseline baseline={d.baseline} />
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t border-white/[0.06]">
                <button className="flex-1 px-4 py-2.5 rounded-xl bg-blue-500/15 text-blue-400 font-medium text-sm hover:bg-blue-500/25 transition-all">
                  Investigate
                </button>
                <button className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 font-medium text-sm hover:bg-white/10 transition-all">
                  Add Note
                </button>
                <button className="px-4 py-2.5 rounded-xl bg-white/5 text-white/60 font-medium text-sm hover:bg-white/10 transition-all">
                  Export
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
