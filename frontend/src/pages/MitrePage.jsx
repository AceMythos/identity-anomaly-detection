import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import GlassCard from '../components/glass/GlassCard'

const techniques = [
  { id: 'T1078', name: 'Valid Accounts', tactic: 'Defense Evasion', desc: 'Adversaries may steal credentials to access systems. Detected via impossible travel, off-hours access, and new device anomalies.', alerts: 4, severity: 'critical' },
  { id: 'T1090.003', name: 'Multi-hop Proxy', tactic: 'Command and Control', desc: 'TOR and VPN detection — authentication from known anonymization exit nodes.', alerts: 2, severity: 'critical' },
  { id: 'T1110.003', name: 'Password Spraying', tactic: 'Credential Access', desc: 'Multiple failed authentication attempts across accounts detected within short time windows.', alerts: 1, severity: 'high' },
  { id: 'T1110', name: 'Brute Force', tactic: 'Credential Access', desc: 'Repeated login attempts against a single account exceeding threshold.', alerts: 1, severity: 'high' },
  { id: 'T1484', name: 'Domain Policy Modification', tactic: 'Defense Evasion', desc: 'Service accounts operating outside their established behavioral baselines.', alerts: 1, severity: 'high' },
  { id: 'T1078.001', name: 'Default Accounts', tactic: 'Defense Evasion', desc: 'First-time logins from previously unseen devices or locations.', alerts: 1, severity: 'medium' },
]

export default function MitrePage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 pt-3">
      <div className="max-w-[1440px] mx-auto">
        <h1 className="text-lg font-semibold text-white mb-1">MITRE ATT&CK Mapping</h1>
        <p className="text-sm text-white/50 mb-5">All detected anomalies mapped to the MITRE ATT&CK framework</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {techniques.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass-card-sm p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  t.severity === 'critical' ? 'bg-red-500/10 text-red-400' : t.severity === 'high' ? 'bg-red-500/8 text-red-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {t.id}
                </span>
                <span className="text-xs text-white/40 uppercase tracking-wider">{t.tactic}</span>
              </div>
              <h3 className="text-sm font-semibold text-white/90 mb-1">{t.name}</h3>
              <p className="text-xs text-white/50 leading-relaxed mb-3">{t.desc}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">{t.alerts} alert{t.alerts > 1 ? 's' : ''} detected</span>
                <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                  View in MITRE <ExternalLink size={10} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
