import { useEffect, useRef, useState } from 'react'
import type { CaseConfig } from '../lib/cases'

interface Props {
  cases: CaseConfig[]
  spinning: boolean
  /** Case index that just landed; triggers the stop + confetti. */
  landedIndex?: number | null
  color: 'cyan' | 'violet'
}

/**
 * CoinToss — the hard-case assignment UI.
 *
 * A thick metallic coin flips end-over-end (rotateX) while `spinning` is
 * true. When `landedIndex` is provided, the coin settles with the chosen
 * face up: 0 → front (H1), 1 → back (H2). The two faces are rendered as
 * two sides of the same 3D card via `transform-style: preserve-3d`.
 */
export function CoinToss({ cases, spinning, landedIndex, color }: Props) {
  const stroke = color === 'violet' ? '#a78bfa' : '#22d3ee'
  const accent = color === 'violet' ? '#60a5fa' : '#38bdf8'

  // Target angle: 0deg shows the front, 180deg shows the back.
  // While spinning, we drive a fast tumble; on land we snap to the
  // nearest multiple of 360 that lands the correct face up.
  const [angle, setAngle] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (spinning) {
      // Fast continuous tumble (CSS keyframe would be cheaper, but we want to
      // hand the final angle back for the deterministic settle).
      let last = performance.now()
      const spd = 1.6 // deg per ms
      const tick = (t: number) => {
        const dt = t - last
        last = t
        setAngle((a) => a + spd * dt)
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }

    if (landedIndex != null && !spinning) {
      // Settle: pick the nearest angle >= current that terminates on the
      // right face. 0 → front (0deg mod 360), 1 → back (180deg mod 360).
      setAngle((a) => {
        const target = landedIndex === 1 ? 180 : 0
        const base = Math.ceil(a / 360) * 360
        // Overshoot a touch for drama (2 extra flips).
        return base + 720 + target
      })
    }
  }, [spinning, landedIndex])

  const faceSize = 220

  return (
    <div
      className="relative mx-auto select-none"
      style={{ width: faceSize + 32, maxWidth: '96vw', perspective: '1200px' }}
    >
      {/* Soft stage glow */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${stroke}${spinning ? '55' : '22'} 0%, transparent 65%)`,
          transition: 'opacity 0.6s',
        }}
      />

      <div
        className="relative mx-auto"
        style={{
          width: faceSize,
          height: faceSize,
          maxWidth: '82vw',
          aspectRatio: '1 / 1',
          transformStyle: 'preserve-3d',
          transition: spinning
            ? 'none'
            : 'transform 0.7s cubic-bezier(0.2, 0.9, 0.3, 1.1)',
          transform: `rotateX(${angle}deg)`,
        }}
      >
        <CoinFace case_={cases[0]} stroke={stroke} accent={accent} />
        <CoinFace case_={cases[1]} stroke={stroke} accent={accent} back />
      </div>

      {/* Edge shadow — a thin ellipse at the base so the coin "sits" */}
      <div
        aria-hidden
        className="mx-auto mt-3 h-2 rounded-full"
        style={{
          width: faceSize * 0.55,
          background: `radial-gradient(ellipse at center, ${stroke}44, transparent 70%)`,
        }}
      />
    </div>
  )
}

function CoinFace({
  case_,
  stroke,
  accent,
  back,
}: {
  case_: CaseConfig
  stroke: string
  accent: string
  back?: boolean
}) {
  return (
    <div
      className="absolute inset-0 rounded-full flex items-center justify-center"
      style={{
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateX(180deg)' : 'none',
        background: `radial-gradient(circle at 32% 28%, #fef3c7 0%, #fbbf24 32%, #92400e 72%, #451a03 100%)`,
        boxShadow: `0 0 32px ${stroke}66, inset 0 0 24px rgba(0,0,0,0.6), inset 0 4px 8px rgba(255,255,255,0.35)`,
        border: `3px solid #78350f`,
      }}
    >
      {/* Beveled rim */}
      <div
        className="absolute inset-2 rounded-full pointer-events-none"
        style={{
          border: `2px dashed ${accent}aa`,
          opacity: 0.55,
        }}
      />
      <div className="relative text-center flex flex-col items-center gap-1 drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]">
        <div
          className="font-display font-black tracking-[0.3em] text-[9px]"
          style={{ color: '#451a03' }}
        >
          HARD
        </div>
        <div
          className="font-display font-black leading-none"
          style={{
            color: '#451a03',
            fontSize: 'clamp(2rem, 10vw, 3.5rem)',
            letterSpacing: '0.02em',
          }}
        >
          {case_.label}
        </div>
        <div
          className="font-display font-bold tracking-[0.28em] text-[8px]"
          style={{ color: '#78350f' }}
        >
          AI ODYSSEY
        </div>
      </div>
    </div>
  )
}
