import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposableMap, Geographies, Geography, Marker, useMapContext,
} from 'react-simple-maps'
import GlassCard from '../glass/GlassCard'

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const locations = [
  { name: 'Moscow', country: 'Russia', coords: [37.6173, 55.7558], risk: 94, user: 'James Smith', severity: 'critical' },
  { name: 'New York', country: 'US', coords: [-74.0060, 40.7128], risk: 8, user: 'James Smith', severity: 'normal' },
  { name: 'Berlin', country: 'Germany', coords: [13.4050, 52.5200], risk: 91, user: 'Alice Chen', severity: 'critical' },
  { name: 'London', country: 'UK', coords: [-0.1278, 51.5074], risk: 62, user: 'Eve Contractor', severity: 'high' },
  { name: 'Singapore', country: 'Singapore', coords: [103.8198, 1.3521], risk: 35, user: 'Diana Martinez', severity: 'medium' },
  { name: 'San Francisco', country: 'US', coords: [-122.4194, 37.7749], risk: 5, user: 'Bob Smith', severity: 'normal' },
]

const travelPaths = [
  { from: 'New York', to: 'Moscow', risk: 94, user: 'James Smith', type: 'Impossible Travel', distance: '7,510 km', timeGap: '14 min' },
  { from: 'San Francisco', to: 'Berlin', risk: 91, user: 'Alice Chen', type: 'TOR Exit Node', distance: '8,920 km', timeGap: '32 min' },
]

function arcPath(x1, y1, x2, y2, curvature = 0.35) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const cx = mx + dy * curvature
  const cy = my - dx * curvature * 0.5
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
}

function ArcsLayer({ paths, onHover, hovered }) {
  const { projection } = useMapContext()

  return (
    <g>
      {paths.map(p => {
        const fromPx = projection(p.from.coords)
        const toPx = projection(p.to.coords)
        if (!fromPx || !toPx) return null
        const d = arcPath(fromPx[0], fromPx[1], toPx[0], toPx[1])

        return (
          <g key={p.id}>
            <motion.path
              d={d}
              fill="none"
              stroke="url(#travelGrad)"
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 5px rgba(239,68,68,0.35))' }}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: 0.5, ease: 'easeInOut' }}
              onMouseEnter={() => onHover?.(p.id)}
              onMouseLeave={() => onHover?.(null)}
            />
            <motion.path
              d={d}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={0.5}
              strokeDasharray="2 6"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: 0.5, ease: 'easeInOut' }}
            />
            <circle r={3.5} fill="#ef4444" style={{ filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.7))' }}>
              <animateMotion dur="3.5s" repeatCount="indefinite" path={d} />
            </circle>
          </g>
        )
      })}
    </g>
  )
}

export default function WorldMap() {
  const [hoveredDot, setHoveredDot] = useState(null)
  const [hoveredPath, setHoveredPath] = useState(null)

  const locMap = useMemo(() => {
    const m = {}
    locations.forEach(l => { m[l.name] = l })
    return m
  }, [])

  const paths = useMemo(() => travelPaths.map(p => ({
    ...p,
    from: locMap[p.from],
    to: locMap[p.to],
    id: `path-${p.from}-${p.to}`.replace(/\s/g, ''),
  })), [locMap])

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white/80">Global Login Origins</h3>
          <span className="live-dot" />
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/35">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Attack Path</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Flagged</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Normal</span>
        </div>
      </div>

      <div className="relative w-full" style={{ aspectRatio: '2.1/1' }}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 120, center: [15, 35] }}
          style={{ width: '100%', height: '100%' }}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={0.6}
                />
              ))
            }
          </Geographies>

          <ArcsLayer paths={paths} onHover={setHoveredPath} hovered={hoveredPath} />

          {locations.map(loc => (
            <Marker key={loc.name} coordinates={loc.coords}>
              <g
                onMouseEnter={() => setHoveredDot(loc.name)}
                onMouseLeave={() => setHoveredDot(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  r={loc.severity === 'critical' ? 6 : loc.severity === 'high' ? 4.5 : 3.5}
                  fill={loc.severity === 'critical' ? '#ef4444' : loc.severity === 'high' ? '#f59e0b' : '#3b82f6'}
                  opacity={0.95}
                  style={{
                    filter: loc.severity === 'critical'
                      ? 'drop-shadow(0 0 8px rgba(239,68,68,0.6))'
                      : loc.severity === 'high'
                      ? 'drop-shadow(0 0 5px rgba(245,158,11,0.4))'
                      : undefined,
                  }}
                />
                <circle
                  r={loc.severity === 'critical' ? 8 : loc.severity === 'high' ? 6 : 4}
                  fill="none"
                  stroke={loc.severity === 'critical' ? '#ef4444' : loc.severity === 'high' ? '#f59e0b' : '#3b82f6'}
                  strokeWidth={1.5}
                  opacity={0.3}
                  className="animate-ping"
                  style={{ animationDuration: '2.5s' }}
                />
                {loc.severity === 'critical' && (
                  <motion.circle
                    r={14}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={1}
                    initial={{ opacity: 0.4, scale: 1 }}
                    animate={{ opacity: 0, scale: 2 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </g>
            </Marker>
          ))}
        </ComposableMap>

        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <linearGradient id="travelGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>

        <AnimatePresence>
          {hoveredPath && (() => {
            const p = paths.find(x => x.id === hoveredPath)
            if (!p) return null
            return (
              <motion.div
                key="path-tooltip"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute top-2 right-2 chart-tooltip !p-2.5 !min-w-[180px]"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs font-semibold text-white/90">{p.type}</span>
                </div>
                <p className="text-xs text-white/70">
                  <span className="text-blue-400">{p.from.name}</span>
                  <span className="px-1">→</span>
                  <span className="text-red-400">{p.to.name}</span>
                </p>
                <p className="text-xs text-white/50 mt-0.5">{p.user} · {p.distance} · {p.timeGap}</p>
              </motion.div>
            )
          })()}

          {hoveredDot && (() => {
            const loc = locMap[hoveredDot]
            if (!loc) return null
            return (
              <motion.div
                key="dot-tooltip"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="absolute bottom-2 left-2 chart-tooltip !p-2.5"
              >
                <p className="text-xs font-semibold text-white/90">{loc.user}</p>
                <p className="text-xs text-white/60">{loc.name}, {loc.country}</p>
                <span className="text-[10px] font-bold" style={{
                  color: loc.severity === 'critical' ? '#ef4444' : loc.severity === 'high' ? '#f59e0b' : '#4ade80'
                }}>
                  Risk: {loc.risk}
                </span>
              </motion.div>
            )
          })()}
        </AnimatePresence>
      </div>
    </GlassCard>
  )
}
