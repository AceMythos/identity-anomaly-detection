import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ScatterChart, Scatter,
} from 'recharts'
import GlassCard, { GlassCardSm } from '../glass/GlassCard'
import { anomalyTrend, riskDistribution, userActivityData, topAnomalyReasons, riskScoreTimeline, scatterData } from '../../data/mockData'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null
  return (
    <div className="chart-tooltip">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

function AnomalyTrendChart() {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/80">Anomalies Over Time</h3>
        <div className="flex items-center gap-3 text-xs text-white/40">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Anomalies
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-400" /> False Positives
          </span>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={anomalyTrend}>
            <defs>
              <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fpGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 12 }} />
            <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="anomalies" stroke="#3b82f6" strokeWidth={2} fill="url(#anomalyGrad)" />
            <Area type="monotone" dataKey="falsePositives" stroke="#f97316" strokeWidth={2} fill="url(#fpGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}

function RiskDistributionChart() {
  const COLORS = ['#dc2626', '#ef4444', '#f59e0b', '#22c55e']

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold text-white/80 mb-4">Risk Distribution</h3>
      <div className="h-56 flex items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={riskDistribution}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {riskDistribution.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-2 ml-2">
          {riskDistribution.map((item, i) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
              <span className="text-white/50">{item.name}</span>
              <span className="text-white/80 font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  )
}

function RiskGauge() {
  const score = 74
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const progress = circumference * (1 - score / 100)

  const getColor = (s) => {
    if (s >= 70) return '#ef4444'
    if (s >= 40) return '#f59e0b'
    return '#22c55e'
  }

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold text-white/80 mb-2">Overall Risk Gauge</h3>
      <div className="flex flex-col items-center justify-center h-56">
        <div className="relative">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <motion.circle
              cx="80" cy="80" r={radius}
              fill="none"
              stroke={getColor(score)}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: progress }}
              transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
              transform="rotate(-90 80 80)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <motion.p
                className="text-3xl font-bold text-white"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                {score}
              </motion.p>
              <p className="text-xs text-white/50">Risk Score</p>
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-white/50">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Low
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Med
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> High
          </span>
        </div>
      </div>
    </GlassCard>
  )
}

function UserActivityChart() {
  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold text-white/80 mb-4">User Activity by Hour</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={userActivityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="hour" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
            <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="normal" name="Normal" fill="#1e3a5f" radius={[3, 3, 0, 0]} />
            <Bar dataKey="anomalous" name="Anomalous" fill="#ef4444" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}

function TopAnomalyReasons() {
  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold text-white/80 mb-4">Top Anomaly Reasons</h3>
      <div className="space-y-3">
        {topAnomalyReasons.map((item) => (
          <div key={item.reason}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white/70">{item.reason}</span>
              <span className="text-xs text-white/50">{item.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${item.percentage}%` }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

function RiskScoreTimelineChart() {
  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold text-white/80 mb-4">Risk Score Timeline</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={riskScoreTimeline}>
            <defs>
              <linearGradient id="avgRiskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="maxRiskGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 12 }} />
            <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 12 }} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="avgRisk" name="Avg Risk" stroke="#3b82f6" strokeWidth={2} fill="url(#avgRiskGrad)" />
            <Area type="monotone" dataKey="maxRisk" name="Max Risk" stroke="#ef4444" strokeWidth={2} fill="url(#maxRiskGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}

function ScatterRiskChart() {
  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold text-white/80 mb-4">Risk Score vs Login Frequency</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="loginFrequency" name="Logins/Day" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
            <YAxis dataKey="riskScore" name="Risk Score" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              data={scatterData.filter(d => !d.isAnomaly)}
              fill="rgba(59,130,246,0.3)"
              r={4}
            />
            <Scatter
              data={scatterData.filter(d => d.isAnomaly)}
              fill="#ef4444"
              r={6}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  )
}

export default function ChartGrid() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AnomalyTrendChart />
        </div>
        <RiskDistributionChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UserActivityChart />
        <TopAnomalyReasons />
        <RiskScoreTimelineChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RiskGauge />
        <ScatterRiskChart />
      </div>
    </div>
  )
}
