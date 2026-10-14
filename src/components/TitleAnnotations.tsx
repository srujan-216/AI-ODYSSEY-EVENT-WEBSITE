/**
 * TRACE · DECODE · REVEAL — the three forensic verbs that annotate the hero
 * title. Each one draws a short dashed guide-line to its label, staggered to
 * fire after the CODEHUNT fill resolves (~1.9s–2.6s).
 *
 * The labels sit *below* the title in a compact row so they never collide
 * with the glyphs; the connecting line is a single dashed SVG path that
 * stroke-dasharray reveals in.
 */
export function TitleAnnotations() {
  return (
    <div
      className="mt-4 md:mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono tracking-[0.35em] uppercase text-[0.62rem]"
      aria-hidden
    >
      <Annot delay={1.9} tone="cyan">
        Trace
      </Annot>
      <Dot />
      <Annot delay={2.2} tone="amber">
        Decode
      </Annot>
      <Dot />
      <Annot delay={2.5} tone="red">
        Reveal
      </Annot>
    </div>
  )
}

function Annot({
  delay,
  tone,
  children,
}: {
  delay: number
  tone: 'cyan' | 'amber' | 'red'
  children: React.ReactNode
}) {
  const color =
    tone === 'red' ? '#ef4444' : tone === 'amber' ? '#fbbf24' : '#22d3ee'
  return (
    <span
      className="hero-annot inline-flex items-center gap-2"
      style={{ animationDelay: `${delay}s`, color }}
    >
      <svg
        width="30"
        height="10"
        viewBox="0 0 30 10"
        className="shrink-0"
        aria-hidden
      >
        <path
          d="M0 5 L28 5"
          stroke={color}
          strokeWidth="1.25"
          strokeDasharray="2 3"
          fill="none"
          style={{ animationDelay: `${delay + 0.1}s` }}
        />
        <circle cx="28" cy="5" r="2" fill={color} />
      </svg>
      <span className="text-stone-200">{children}</span>
    </span>
  )
}

function Dot() {
  return <span className="text-stone-700" aria-hidden>·</span>
}
