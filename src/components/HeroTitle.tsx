/**
 * HeroTitle — "AI ODYSSEY × CODEHUNT"
 *
 * Two mirrored forensic scan-fills converge in the middle:
 *   • AI ODYSSEY  — red stroked outline (0.6s@0.6s) with a red gradient
 *                   fill unmasked RIGHT -> LEFT (1.6s@1.1s), red scan bar
 *                   travelling in sync, then a one-shot brightness pulse.
 *   • ×           — italic serif red glyph, drops in with a spring
 *                   overshoot (0.6s@1.1s).
 *   • CODEHUNT    — amber stroked outline (0.6s@0.9s) with an amber
 *                   gradient fill unmasked LEFT -> RIGHT (1.6s@1.4s),
 *                   cyan/amber scan bar in sync, final pulse.
 *
 * The two scan bars travel in opposing directions, so the overall effect
 * reads like a decoder sweeping from both edges of the hero and resolving
 * the full title. All timing lives in CSS keyframes (see .hero-* in
 * index.css) — reduced-motion collapses everything to a static readable
 * title with no mask, no scan bar.
 */
export function HeroTitle() {
  return (
    <h1
      className="font-display font-black text-stone-50 leading-[0.86] tracking-[-0.045em]"
      style={{ fontSize: 'clamp(3.4rem, 13vw, 11rem)' }}
      aria-label="AI ODYSSEY × CODEHUNT"
    >
      {/* AI ODYSSEY — layered glyph stack, scan R->L in red */}
      <span className="block">
        <AiOdyssey />
      </span>

      {/* × CODEHUNT — layered glyph stack, scan L->R in amber */}
      <span className="flex items-baseline gap-4 md:gap-6">
        <span
          className="font-serif italic font-bold hero-x text-red-500"
          style={{ fontSize: 'clamp(2.4rem, 9vw, 8rem)' }}
        >
          ×
        </span>
        <CodeHunt />
      </span>
    </h1>
  )
}

function AiOdyssey() {
  const word = 'AI ODYSSEY' // non-breaking space keeps the pair together
  return (
    <span className="relative inline-block hero-ai">
      {/* Base — red outline, transparent interior */}
      <span aria-hidden>{word}</span>

      {/* Progressive fill — exact same glyphs stacked on top */}
      <span className="hero-ai-fill" aria-hidden>
        {word}
      </span>

      {/* Scanning beam — mirrors the mask reveal direction */}
      <span className="hero-ai-scan-bar" aria-hidden />
    </span>
  )
}

function CodeHunt() {
  const word = 'CODEHUNT'
  return (
    <span className="relative inline-block hero-code">
      {/* Base — amber outline, transparent interior */}
      <span aria-hidden>{word}</span>

      {/* Progressive fill — exact same glyphs stacked on top */}
      <span className="hero-code-fill" aria-hidden>
        {word}
      </span>

      {/* Scanning beam — matches the mask animation */}
      <span className="hero-scan-bar" aria-hidden />
    </span>
  )
}
