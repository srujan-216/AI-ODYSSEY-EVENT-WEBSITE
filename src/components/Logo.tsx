interface LogoProps {
  size?: number
  withText?: boolean
}

export function Logo({ size = 32, withText = true }: LogoProps) {
  return (
    <div className="flex items-center gap-3">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden
        className="drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]"
      >
        <defs>
          <linearGradient id="lg1" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="20" stroke="url(#lg1)" strokeWidth="2" />
        <circle cx="24" cy="24" r="13" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.55" />
        <circle cx="24" cy="24" r="4" fill="#22d3ee" />
        <path d="M24 4v6M24 38v6M4 24h6M38 24h6" stroke="#22d3ee" strokeWidth="1.5" />
        <path
          d="M15 15l3 3M30 30l3 3M33 15l-3 3M18 30l-3 3"
          stroke="#a78bfa"
          strokeWidth="1.3"
          strokeOpacity="0.9"
        />
      </svg>
      {withText && (
        <div className="leading-none">
          <div className="font-display font-bold text-sm tracking-[0.22em] text-white">
            AI&nbsp;ODYSSEY
          </div>
          <div className="font-display text-[0.6rem] tracking-[0.38em] text-cyber-cyan/70 mt-0.5">
            × CODEHUNT
          </div>
        </div>
      )}
    </div>
  )
}
