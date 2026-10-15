import { useEffect, useMemo, useRef, useState } from 'react'
import type { CaseConfig } from '../lib/cases'

interface WheelProps {
  cases: CaseConfig[]
  /** Angle of rotation to animate to. External state so parent controls the stop. */
  rotation: number
  spinning: boolean
  color: 'cyan' | 'violet'
  /** Case index that just landed — triggers confetti burst for one tick. */
  landedIndex?: number | null
}

/**
 * Animated circular case wheel. The ticker is fixed at the top (12 o'clock).
 * Rotation is applied to the wheel group. On land, a brief confetti burst
 * fires via a canvas overlay.
 */
export function Wheel({ cases, rotation, spinning, color, landedIndex }: WheelProps) {
  const size = 460
  const r = size / 2
  const segments = cases.length
  const sliceAngle = 360 / segments
  const stroke = color === 'violet' ? '#a78bfa' : '#22d3ee'
  const accent = color === 'violet' ? '#60a5fa' : '#38bdf8'

  const paths = useMemo(
    () => cases.map((c, i) => buildSegment(i, segments, r, c, i % 2 === 0 ? stroke : accent)),
    [cases, segments, r, stroke, accent],
  )

  // Smooth transition timing matched to the spin duration
  const transition = spinning
    ? 'transform 5.6s cubic-bezier(0.1, 0.75, 0.1, 1)'
    : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' // slight back-overshoot on settle

  // Burst canvas state
  const [burstKey, setBurstKey] = useState(0)
  useEffect(() => {
    if (landedIndex != null) setBurstKey((k) => k + 1)
  }, [landedIndex])

  return (
    // Outer frame reserves breathing room for the ticker/OPEN tag at the top
    // and the HUD corner markers around the rim, so nothing clips the parent
    // panel's washi tape or padding.
    <div
      className="relative mx-auto stage-3d select-none pt-8 pb-2 px-2"
      style={{ width: size + 32, maxWidth: '96vw' }}
    >
      {/* Inner stage — the wheel's own bounding box */}
      <div
        className="relative mx-auto"
        style={{ width: size, maxWidth: '92vw', aspectRatio: '1 / 1' }}
      >
      {/* AMBIENT GLOW — contained to the wheel bounds, blurred inward */}
      <div
        aria-hidden
        className="absolute inset-[-4%] rounded-full transition-all duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${stroke}${spinning ? '55' : '26'} 0%, transparent 65%)`,
          filter: `blur(${spinning ? 24 : 14}px)`,
        }}
      />

      {/* Counter-rotating accent rings — closer to the rim so they don't bleed */}
      <div
        aria-hidden
        className="absolute inset-[-4%] rounded-full border opacity-50 pointer-events-none"
        style={{
          borderColor: `${stroke}88`,
          borderStyle: 'dashed',
          animation: `spin ${spinning ? 5 : 42}s linear infinite`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-[-1%] rounded-full border opacity-40 pointer-events-none"
        style={{
          borderColor: `${accent}99`,
          borderStyle: 'dotted',
          animation: `spin ${spinning ? 3.5 : 32}s linear infinite reverse`,
        }}
      />

      {/* HUD corner markers — now hugging the rim, inside the frame padding */}
      <HudCorners color={stroke} />

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="relative block"
        style={{
          filter: `drop-shadow(0 0 ${spinning ? 48 : 26}px ${stroke}88)`,
          transition: 'filter 0.6s ease',
        }}
      >
        <defs>
          <radialGradient id="wheelCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#030611" />
            <stop offset="60%" stopColor="#060a1a" />
            <stop offset="100%" stopColor="#0a1026" />
          </radialGradient>
          <linearGradient id="hub" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} />
            <stop offset="100%" stopColor={accent} />
          </linearGradient>
          <radialGradient id="hubCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="40%" stopColor={stroke} stopOpacity="0.9" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.3" />
          </radialGradient>
        </defs>

        {/* Outer rings */}
        <circle
          cx={r}
          cy={r}
          r={r - 2}
          fill="url(#wheelCore)"
          stroke={stroke}
          strokeOpacity="0.55"
          strokeWidth="1.5"
        />
        <circle
          cx={r}
          cy={r}
          r={r - 8}
          fill="none"
          stroke={stroke}
          strokeOpacity="0.2"
          strokeWidth="0.6"
        />

        {/* Rotating wheel group */}
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: `${r}px ${r}px`,
            transition,
          }}
        >
          {paths.map((p, i) => {
            const midAngle = i * sliceAngle + sliceAngle / 2 - 90
            const labelR = r - 58
            const lx = r + labelR * Math.cos((midAngle * Math.PI) / 180)
            const ly = r + labelR * Math.sin((midAngle * Math.PI) / 180)
            return (
              <g key={cases[i].number}>
                <path
                  d={p.d}
                  fill={p.fill}
                  stroke="rgba(3,6,17,0.75)"
                  strokeWidth="2.5"
                />
                {/* Slice labels: ONE group that translates to (lx,ly) then
                    rotates together, so CASE + number share the same frame
                    of reference and stay vertically aligned at every slice
                    angle. */}
                <g transform={`translate(${lx} ${ly}) rotate(${midAngle + 90})`}>
                  <text
                    y={-16}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-display"
                    fontSize={9}
                    fill="rgba(3,6,17,0.7)"
                    fontWeight={700}
                    style={{ letterSpacing: '0.35em' }}
                  >
                    CASE
                  </text>
                  <text
                    y={6}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-display"
                    fontSize={26}
                    fontWeight={800}
                    fill="#030611"
                    style={{ letterSpacing: '0.04em' }}
                  >
                    {cases[i].label}
                  </text>
                  <text
                    y={26}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="font-display"
                    fontSize={9}
                    fontWeight={800}
                    fill={cases[i].difficulty === 'hard' ? '#7c2d12' : '#064e3b'}
                    style={{ letterSpacing: '0.3em' }}
                  >
                    {cases[i].difficulty === 'hard' ? 'HARD' : 'EASY'}
                  </text>
                </g>
              </g>
            )
          })}
          {/* Single decorative inner-arc ring, drawn once (not per slice) */}
          <circle
            cx={r}
            cy={r}
            r={r - 22}
            fill="none"
            stroke="#030611"
            strokeOpacity={0.35}
            strokeWidth="0.8"
            strokeDasharray="2 6"
          />
        </g>

        {/* Hub — a glowing core */}
        <circle cx={r} cy={r} r={56} fill="#030611" stroke={stroke} strokeOpacity="0.7" />
        <circle
          cx={r}
          cy={r}
          r={44}
          fill="url(#hubCore)"
          opacity={spinning ? 0.95 : 0.85}
          style={{ transition: 'opacity 0.6s' }}
        />
        <circle
          cx={r}
          cy={r}
          r={30}
          fill="none"
          stroke="#fff"
          strokeOpacity={0.35}
          strokeWidth="0.6"
        />
        <text
          x={r}
          y={r - 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-display"
          fontSize={9}
          fill="#030611"
          fontWeight={800}
          style={{ letterSpacing: '0.28em' }}
        >
          AI ODYSSEY
        </text>
        <text
          x={r}
          y={r + 11}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-display"
          fontSize={7.5}
          fill="#030611"
          fontWeight={700}
          style={{ letterSpacing: '0.3em' }}
        >
          CODEHUNT
        </text>

        {/* Rim tick marks */}
        {Array.from({ length: 72 }).map((_, i) => {
          const a = (i * 5 - 90) * (Math.PI / 180)
          const x1 = r + (r - 4) * Math.cos(a)
          const y1 = r + (r - 4) * Math.sin(a)
          const x2 = r + (r - 12) * Math.cos(a)
          const y2 = r + (r - 12) * Math.sin(a)
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={stroke}
              strokeOpacity={i % 6 === 0 ? 0.8 : 0.22}
              strokeWidth={i % 6 === 0 ? 1.75 : 0.75}
            />
          )
        })}
      </svg>

      {/* Pointer / ticker — anchored to the inner stage's top edge so the
          OUTER frame's pt-8 keeps it clear of the parent panel's tape. */}
      <div
        aria-hidden
        className={`absolute left-1/2 -translate-x-1/2 -translate-y-full transition-transform duration-500 ${
          landedIndex != null ? 'animate-[bounce_0.6s_ease-out_1]' : ''
        }`}
        style={{ top: 0 }}
        key={burstKey}
      >
        <div
          className="w-0 h-0 mx-auto"
          style={{
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: `26px solid ${stroke}`,
            filter: `drop-shadow(0 0 10px ${stroke})`,
          }}
        />
      </div>

      {/* Confetti burst on land — kept inside the inner stage */}
      {landedIndex != null && (
        <ConfettiBurst key={burstKey} color={stroke} accent={accent} />
      )}
      </div>
      {/* /inner stage */}
    </div>
  )
}

function HudCorners({ color }: { color: string }) {
  const s: React.CSSProperties = {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: color,
    opacity: 0.75,
  }
  // Corners now sit just outside the ring (–6%) — safely inside the frame
  // padding, so they never clip through the parent panel.
  return (
    <div aria-hidden className="absolute inset-[-6%] pointer-events-none">
      <span style={{ ...s, top: 0,    left: 0,  borderTop: '2px solid', borderLeft: '2px solid' }} />
      <span style={{ ...s, top: 0,    right: 0, borderTop: '2px solid', borderRight: '2px solid' }} />
      <span style={{ ...s, bottom: 0, left: 0,  borderBottom: '2px solid', borderLeft: '2px solid' }} />
      <span style={{ ...s, bottom: 0, right: 0, borderBottom: '2px solid', borderRight: '2px solid' }} />
    </div>
  )
}

function ConfettiBurst({ color, accent }: { color: string; accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const w = (cv.width = cv.clientWidth * devicePixelRatio)
    const h = (cv.height = cv.clientHeight * devicePixelRatio)
    const cx = w / 2
    const cy = h / 2
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    type P = {
      x: number
      y: number
      vx: number
      vy: number
      r: number
      life: number
      maxLife: number
      c: string
    }
    const colors = [color, accent, '#fbbf24', '#ffffff']
    const N = 80
    const parts: P[] = Array.from({ length: N }, () => {
      const a = Math.random() * Math.PI * 2
      const s = (3 + Math.random() * 7) * devicePixelRatio
      const maxLife = 60 + Math.floor(Math.random() * 50)
      return {
        x: cx,
        y: cy,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        r: (1.5 + Math.random() * 2.5) * devicePixelRatio,
        life: 0,
        maxLife,
        c: colors[Math.floor(Math.random() * colors.length)],
      }
    })

    let raf = 0
    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      let alive = 0
      for (const p of parts) {
        p.life++
        if (p.life > p.maxLife) continue
        alive++
        p.vy += 0.08 * devicePixelRatio
        p.vx *= 0.985
        p.vy *= 0.985
        p.x += p.vx
        p.y += p.vy
        const a = 1 - p.life / p.maxLife
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.c
        ctx.globalAlpha = a
        ctx.shadowBlur = 14
        ctx.shadowColor = p.c
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (alive > 0) raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [color, accent])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    />
  )
}

function buildSegment(
  i: number,
  n: number,
  r: number,
  _c: CaseConfig,
  fill: string,
) {
  const sliceAngle = (2 * Math.PI) / n
  const start = i * sliceAngle - Math.PI / 2
  const end = start + sliceAngle
  const x1 = r + r * Math.cos(start)
  const y1 = r + r * Math.sin(start)
  const x2 = r + r * Math.cos(end)
  const y2 = r + r * Math.sin(end)
  const largeArc = sliceAngle > Math.PI ? 1 : 0
  const d = `M ${r} ${r} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
  // Stagger alpha so neighbouring segments read apart
  const alpha = i % 2 === 0 ? 'dd' : 'aa'
  return { d, fill: fill + alpha }
}

/**
 * Compute the rotation needed to land case index `targetIndex` under the ticker
 * (which sits at the top). Adds 5 full rotations for drama.
 */
export function computeTargetRotation(
  currentRotation: number,
  targetIndex: number,
  totalCases: number,
): number {
  const sliceAngle = 360 / totalCases
  const mid = targetIndex * sliceAngle + sliceAngle / 2
  const needed = (360 - mid) % 360
  const spins = 5 * 360
  const base = Math.ceil(currentRotation / 360) * 360
  return base + spins + needed
}
