/**
 * HeroMagnifier — a big SVG magnifying glass that glides across the hero
 * title after both halves finish decoding (~3.4s–7.6s). Carries:
 *   • a bright rim with a pulsing drop-shadow glow
 *   • a crosshair reticle inside the lens
 *   • a wooden handle at ~45°
 *
 * Travels in CSS (see .hero-magnifier in index.css). A sibling .hero-spotlight
 * provides the subtle wash of light underneath — no mask, no backdrop filter,
 * so performance stays smooth on low-end devices.
 */
export function HeroMagnifier() {
  return (
    <>
      <div className="hero-spotlight" aria-hidden />
      <div className="hero-magnifier" aria-hidden>
        <svg viewBox="0 0 160 160" className="w-full h-full">
          <defs>
            <radialGradient id="lensInner" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <linearGradient id="rim" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="handle" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="50%" stopColor="#422006" />
              <stop offset="100%" stopColor="#1c0a00" />
            </linearGradient>
          </defs>

          {/* Handle */}
          <g transform="rotate(45 80 80)">
            <rect
              x="95"
              y="74"
              width="54"
              height="12"
              rx="4"
              fill="url(#handle)"
              stroke="#1c0a00"
              strokeWidth="1.5"
            />
            <rect x="137" y="76" width="10" height="8" rx="2" fill="#0c0a09" />
          </g>

          {/* Rim ring (pulses via animated drop-shadow) */}
          <g className="hero-mag-rim">
            <circle
              cx="70"
              cy="70"
              r="52"
              fill="none"
              stroke="url(#rim)"
              strokeWidth="6"
            />
            <circle
              cx="70"
              cy="70"
              r="48"
              fill="none"
              stroke="rgba(251,191,36,0.4)"
              strokeWidth="1"
            />
          </g>

          {/* Lens interior — subtle inner glow */}
          <circle cx="70" cy="70" r="48" fill="url(#lensInner)" />

          {/* Reticle */}
          <g stroke="rgba(239,68,68,0.75)" strokeWidth="1.2" fill="none">
            <line x1="70" y1="26" x2="70" y2="40" />
            <line x1="70" y1="100" x2="70" y2="114" />
            <line x1="26" y1="70" x2="40" y2="70" />
            <line x1="100" y1="70" x2="114" y2="70" />
            <circle cx="70" cy="70" r="6" />
            <line x1="68" y1="70" x2="72" y2="70" />
            <line x1="70" y1="68" x2="70" y2="72" />
          </g>

          {/* Faint tick marks around rim */}
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i * 15 * Math.PI) / 180
            const x1 = 70 + 44 * Math.cos(a)
            const y1 = 70 + 44 * Math.sin(a)
            const x2 = 70 + 48 * Math.cos(a)
            const y2 = 70 + 48 * Math.sin(a)
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(251,191,36,0.5)"
                strokeWidth={i % 3 === 0 ? 1.4 : 0.8}
              />
            )
          })}

          {/* Highlight glint on the glass */}
          <ellipse
            cx="48"
            cy="48"
            rx="18"
            ry="8"
            fill="rgba(255,255,255,0.22)"
            transform="rotate(-30 48 48)"
          />
        </svg>
      </div>
    </>
  )
}
