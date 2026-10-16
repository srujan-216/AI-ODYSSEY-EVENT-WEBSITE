import { useEffect, useState } from 'react'
import { Clock, Timer } from 'lucide-react'

interface Props {
  /** Target hour (0-23) in the viewer's local wall-clock, defaults to 16 (4pm). */
  hour?: number
  /** Target minute, defaults to 0. */
  minute?: number
  /** Visual density. "chip" = inline pill. "panel" = larger standalone block. */
  variant?: 'chip' | 'panel'
  /** Short descriptive label shown next to the count. */
  label?: string
  /** Optional override className on the outer wrapper. */
  className?: string
}

/**
 * Live countdown to today's deadline (default: 16:00 local).
 *
 * Ticks every second. If the deadline has already passed in the viewer's
 * timezone, the component swaps to a muted "deadline passed" state rather
 * than silently rolling to tomorrow — this is an event-day countdown, not a
 * recurring daily one.
 *
 * Pure display: the server does not enforce the cutoff; coordinators can
 * still record a late submission from the Control Room.
 */
export function DeadlineCountdown({
  hour = 16,
  minute = 0,
  variant = 'chip',
  label = 'Report deadline',
  className = '',
}: Props) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const target = (() => {
    const d = new Date()
    d.setHours(hour, minute, 0, 0)
    return d.getTime()
  })()

  const remainingMs = target - now
  const passed = remainingMs <= 0
  const { h, m, s } = splitDuration(Math.abs(remainingMs))

  // Severity: >1h = normal, 15-60m = warn, <15m = urgent, passed = muted.
  const severity = passed
    ? 'muted'
    : remainingMs < 15 * 60_000
    ? 'urgent'
    : remainingMs < 60 * 60_000
    ? 'warn'
    : 'normal'

  const palette = PALETTE[severity]
  const timeStr = formatHMS(h, m, s)
  const targetLabel = formatTargetTime(hour, minute)

  if (variant === 'panel') {
    return (
      <div
        className={`rounded-xl border px-4 py-3 flex items-center gap-4 ${palette.panel} ${className}`}
      >
        <Timer size={22} className={palette.icon} />
        <div className="min-w-0">
          <div className={`text-[0.6rem] font-mono tracking-[0.3em] uppercase ${palette.sub}`}>
            {label} · {targetLabel}
          </div>
          <div
            className={`font-display font-bold text-2xl sm:text-3xl tabular-nums leading-tight ${palette.text}`}
          >
            {passed ? 'Deadline passed' : timeStr}
          </div>
          {passed && (
            <div className="text-[0.6rem] text-slate-400 mt-0.5">
              Late by {timeStr}. Coordinators may still accept hand-ins.
            </div>
          )}
        </div>
      </div>
    )
  }

  // chip variant
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[0.65rem] font-mono tracking-widest uppercase tabular-nums ${palette.chip} ${className}`}
      title={`${label} · ${targetLabel}`}
    >
      <Clock size={11} className={palette.icon} />
      {passed ? (
        <span>Deadline passed</span>
      ) : (
        <>
          <span className="opacity-70">{label}</span>
          <span className={`font-bold ${palette.text}`}>{timeStr}</span>
        </>
      )}
    </span>
  )
}

type Severity = 'normal' | 'warn' | 'urgent' | 'muted'

const PALETTE: Record<
  Severity,
  { chip: string; panel: string; text: string; sub: string; icon: string }
> = {
  normal: {
    chip: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
    panel: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
    text: 'text-emerald-200',
    sub: 'text-emerald-300/80',
    icon: 'text-emerald-300',
  },
  warn: {
    chip: 'border-amber-500/50 bg-amber-500/10 text-amber-200',
    panel: 'border-amber-500/50 bg-amber-500/10 text-amber-100',
    text: 'text-amber-200',
    sub: 'text-amber-300/80',
    icon: 'text-amber-300',
  },
  urgent: {
    chip: 'border-red-500/60 bg-red-500/15 text-red-200 animate-pulse',
    panel: 'border-red-500/60 bg-red-500/15 text-red-100',
    text: 'text-red-200',
    sub: 'text-red-300/80',
    icon: 'text-red-300',
  },
  muted: {
    chip: 'border-slate-600/50 bg-slate-700/30 text-slate-400',
    panel: 'border-slate-600/50 bg-slate-700/30 text-slate-300',
    text: 'text-slate-300',
    sub: 'text-slate-500',
    icon: 'text-slate-500',
  },
}

function splitDuration(ms: number): { h: number; m: number; s: number } {
  const total = Math.floor(ms / 1000)
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  }
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function formatHMS(h: number, m: number, s: number): string {
  if (h >= 1) return `${h}h ${pad(m)}m ${pad(s)}s`
  if (m >= 1) return `${pad(m)}:${pad(s)}`
  return `${pad(s)}s`
}

function formatTargetTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 === 0 ? 12 : hour % 12
  return minute === 0
    ? `${h12}:00 ${period}`
    : `${h12}:${pad(minute)} ${period}`
}
