import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, Trophy } from 'lucide-react'
import { useGlobalParallax } from '../lib/hooks'
import { HeroTitle } from '../components/HeroTitle'
import { TitleAnnotations } from '../components/TitleAnnotations'
import { HeroMagnifier } from '../components/HeroMagnifier'
import { DeadlineCountdown } from '../components/DeadlineCountdown'

/**
 * Landing — cinematic detective board.
 *
 * Hero is the title + a single tilted classified evidence folder with a
 * recovered transcript. One suspicious timestamp — "02:14" — is highlighted
 * and tagged by a cyan anomaly connector. Nothing else competes with it.
 *
 * Reports are evaluated OFFLINE by coordinators; the site handles the
 * assignment loop only.
 */
export function Landing() {
  const p = useGlobalParallax()
  const tx = (f: number) => `${(p.x * f).toFixed(2)}px`
  const ty = (f: number) => `${(p.y * f).toFixed(2)}px`

  return (
    <div className="relative overflow-hidden">
      {/* ───────────────── HERO ───────────────── */}
      <section className="relative grain vignette">
        {/* Subtle scanlines over the whole hero */}
        <div className="scanlines" aria-hidden />

        {/* Ambient drifting evidence pins */}
        <span className="ambient-pin"       style={{ top: '12%', left: '6%',  animationDelay: '0s'   }} aria-hidden />
        <span className="ambient-pin cyan"  style={{ top: '68%', left: '4%',  animationDelay: '-3s'  }} aria-hidden />
        <span className="ambient-pin amber" style={{ top: '30%', right: '8%', animationDelay: '-6s'  }} aria-hidden />
        <span className="ambient-pin"       style={{ top: '82%', right: '12%',animationDelay: '-9s'  }} aria-hidden />
        <span className="ambient-pin cyan"  style={{ top: '46%', right: '38%',animationDelay: '-4.5s' }} aria-hidden />

        {/* Corner HUD readout — hidden on small phones (overlaps title) */}
        <div
          className="hud-readout hidden sm:block"
          style={{ top: '1.25rem', right: '1.5rem' }}
          aria-hidden
        >
          <div>LAT&nbsp;<b>17.3850°&nbsp;N</b></div>
          <div>LON&nbsp;<b>78.4867°&nbsp;E</b></div>
          <div>CH&nbsp;<em>07</em>&nbsp;· SIG&nbsp;<b>NOMINAL</b></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-16 md:pt-14 md:pb-20 relative">
          {/* Case metadata — 0.3–0.8 s */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-3 mb-5 text-[0.65rem] tracking-[0.3em] uppercase text-stone-400 font-mono relative z-10"
          >
            <span className="w-2 h-2 bg-red-500 rounded-full breath" />
            <span>EMEL · MVSR</span>
            <span className="text-stone-600">/</span>
            <span>Case File · AI-ODY/0027-α</span>
            <span className="text-stone-600 hidden sm:inline">/</span>
            <span className="hidden sm:inline">SHIKHARA · SAMAVARTHAN</span>
          </motion.div>

          {/* Mega title — timing is CSS-driven inside HeroTitle. The magnifier
              sits over the title and glides back and forth continuously. */}
          <div className="relative z-10">
            <HeroTitle />
            <HeroMagnifier />
            <TitleAnnotations />
          </div>

          {/* ──────────────────────────────────────────────────────────
              "The clues are already there." — reworked to match the
              investigation-brief visual reference. Everything scoped to
              this section; the AI ODYSSEY × CODEHUNT title block above
              and the Procedure section below are untouched.
             ────────────────────────────────────────────────────────── */}
          <div className="clues-section mt-10 md:mt-14 grid gap-10 lg:grid-cols-[1.05fr,0.95fr] items-start">
            {/* LEFT COLUMN */}
            <div className="relative z-10">
              {/* MVSR breadcrumb row */}
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 2.3 }}
                className="flex flex-wrap items-center gap-3 mb-6 text-[0.68rem] tracking-[0.3em] uppercase font-mono"
              >
                <span className="w-2 h-2 bg-red-500 rounded-full breath" />
                <span className="text-stone-200">MVSR&nbsp;Engineering&nbsp;College</span>
                <span className="text-stone-600">—</span>
                <span className="text-stone-600">|</span>
                <span className="text-amber-400">A&nbsp;Half-Day&nbsp;Forensic&nbsp;Hunt</span>
              </motion.div>

              {/* Headline — two lines */}
              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 2.4, ease: [0.2, 0.65, 0.2, 1] }}
                className="font-serif italic text-stone-50 leading-[0.95] tracking-tight"
                style={{ fontSize: 'clamp(2.6rem, 6vw, 5rem)' }}
              >
                <span className="block">The clues are</span>
                <span className="block">
                  already there<span className="text-red-500">.</span>
                </span>
              </motion.h2>

              {/* Cyan → violet → red gradient rule */}
              <motion.svg
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 2.9 }}
                viewBox="0 0 600 20"
                preserveAspectRatio="none"
                className="w-full max-w-xl h-4 mt-3"
                aria-hidden
              >
                <defs>
                  <linearGradient id="cluesHeadlineRule" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%"  stopColor="#22d3ee" />
                    <stop offset="55%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M 4 10 Q 150 2, 300 10 T 596 10"
                  stroke="url(#cluesHeadlineRule)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.0, delay: 2.9, ease: 'easeOut' }}
                />
              </motion.svg>

              {/* Schedule badge — half-day window + live countdown */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 3.1 }}
                className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[0.72rem] tracking-[0.22em] uppercase"
              >
                <span className="inline-flex items-center gap-2 text-amber-400">
                  <Clock size={13} />
                  <span className="text-red-500">A&nbsp;Half-Day&nbsp;Forensic</span>
                  <span className="text-stone-300">Hunt</span>
                </span>
                <span className="text-stone-700">|</span>
                <span className="text-stone-200 tabular-nums">
                  10:30&nbsp;AM – 04:00&nbsp;PM&nbsp;deadline
                </span>
              </motion.div>

              {/* Live countdown — the one number the whole hall is watching */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 3.2 }}
                className="mt-4 max-w-md"
              >
                <DeadlineCountdown variant="panel" label="Report deadline" />
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 3.3 }}
                className="mt-6 text-stone-300 text-base md:text-lg max-w-xl leading-relaxed"
              >
                A half-day forensic hunt by <span className="text-stone-50">EMEL&nbsp;Club</span>,
                MVSR&nbsp;Engineering. Starts 10:30 AM, final reports due by
                <span className="text-amber-400">&nbsp;4:00 PM</span>. Each team
                is dealt a sealed PDF of hints — connect the dots, follow the
                leads, and crack the case.
              </motion.p>

              {/* Four investigation steps */}
              <motion.ol
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 3.5 }}
                className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-[0.62rem] font-mono uppercase tracking-widest"
              >
                {CONCEPT.map((c, i) => (
                  <li key={c} className="flex items-center gap-2 text-stone-300">
                    <span className="w-6 h-6 rounded-full bg-red-500 text-stone-50 font-display font-bold grid place-items-center text-[0.65rem]">
                      {i + 1}
                    </span>
                    <span className="max-w-[8rem] leading-tight">{c}</span>
                    {i < CONCEPT.length - 1 && (
                      <ArrowRight size={13} className="text-stone-600 ml-1" />
                    )}
                  </li>
                ))}
              </motion.ol>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 3.7 }}
                className="mt-10 flex flex-wrap items-center gap-6"
              >
                <Link to="/tracks" className="dossier-cta group">
                  <span>Open the Folder</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  to="/leaderboard"
                  className="inline-flex items-center gap-2 text-stone-300 hover:text-stone-50 font-display tracking-[0.2em] uppercase text-xs underline-offset-8 decoration-dotted decoration-stone-600 hover:decoration-red-500 transition-colors underline"
                >
                  <Trophy size={13} /> See the standings
                </Link>
              </motion.div>

            </div>

            {/* RIGHT COLUMN — enriched detective-board collage */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 2.6, ease: [0.2, 0.65, 0.2, 1] }}
              className="relative w-full max-w-[560px] mx-auto"
              style={{ transform: `translate3d(${tx(-6)}, ${ty(-4)}, 0)` }}
            >
              <EvidenceBoard />
            </motion.div>
          </div>
        </div>

      </section>

      {/* METHOD — dark paper procedure */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <div className="paper-dark rounded-sm p-8 md:p-12 relative overflow-hidden">
          <span className="absolute top-6 right-6 stamp stamp-tilt">Procedure · 04</span>
          <h2 className="font-serif italic text-stone-50 text-3xl md:text-4xl leading-tight mb-10 max-w-xl">
            How the hunt unfolds.
          </h2>
          <ol className="space-y-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[auto,1fr] gap-6 items-start group">
                <div
                  className="font-serif italic text-5xl md:text-6xl text-red-500/70 leading-none group-hover:text-red-500 transition-colors tabular-nums"
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="pt-1 border-l-2 border-stone-700 pl-6 group-hover:border-red-500 transition-colors">
                  <div className="font-display tracking-widest uppercase text-[0.65rem] text-stone-400 mb-1">
                    Step {i + 1}
                  </div>
                  <h3 className="font-serif text-xl md:text-2xl text-stone-50 italic">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-stone-400 text-sm max-w-2xl leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-12 pt-6 border-t border-stone-700/50 flex flex-wrap items-end justify-between gap-4">
            <div className="font-hand text-2xl text-red-500">
              — see you on the board.
            </div>
            <Link
              to="/tracks"
              className="inline-flex items-center gap-2 font-display tracking-widest uppercase text-xs text-stone-50 border-b-2 border-red-500 pb-1 hover:gap-4 transition-all"
            >
              Pick a division
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ─────────────────────── Evidence board ─────────────────────── */

/**
 * Investigation-brief collage — the photographic reference art pulled in as
 * a real image and cropped to show just the right side of the composition
 * (board + CASE FILE #0287-A + sticky notes + terminal + coordinates pin).
 *
 * We layer:
 *  1. the photo, with `object-position: right` so only the detective-board
 *     half is visible;
 *  2. a very subtle inset shadow + border frame so it reads as a mounted
 *     panel inside the dark hero;
 *  3. a scanline + grain overlay to match the rest of the hero;
 *  4. a tiny LIVE badge in the corner for parity with the status strip.
 */
function EvidenceBoard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 2.4, ease: [0.2, 0.65, 0.2, 1] }}
      className="relative w-full rounded-sm overflow-hidden
                 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.75)]
                 ring-1 ring-stone-700/50"
    >
      {/* Full image 2 — shown at its native aspect so nothing gets cropped */}
      <img
        src="/images/evidence-board.png"
        alt="AI Odyssey × CodeHunt — the clues are already there (detective board, classified case file, pinned MVSR photographs, handwritten notes, terminal readout, coordinates pin)"
        className="block w-full h-auto select-none pointer-events-none"
        draggable={false}
      />

      {/* Vignette for integration with the dark hero */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 65%, rgba(0,0,0,0.5) 100%)',
        }}
      />

      {/* Scanline overlay — matches the rest of the hero */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent 0 2px, rgba(255,255,255,0.03) 2px 3px)',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Corner LIVE badge */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.0, duration: 0.5 }}
        className="absolute top-3 left-3 flex items-center gap-2 px-2 py-1 bg-stone-950/80 border border-cyan-500/40 font-mono text-[0.55rem] tracking-[0.3em] uppercase text-cyan-300"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
        </span>
        LIVE · CH&nbsp;07
      </motion.div>

      {/* Case tag — bottom-right, parity with the status strip */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.2, duration: 0.5 }}
        className="absolute bottom-3 right-3 flex items-center gap-2 px-2 py-1 bg-stone-950/80 border border-stone-700 font-mono text-[0.55rem] tracking-[0.3em] uppercase text-stone-200"
      >
        <span className="text-amber-400">◉</span> AI-ODY/0027-α
      </motion.div>
    </motion.div>
  )
}

/* ─────────────────────── Data ─────────────────────── */

const CONCEPT = [
  'Receive a sealed PDF',
  'Follow the hints',
  'Connect the dots',
  'Submit a written report',
]

const STEPS = [
  {
    title: 'Pick your unit.',
    desc: 'Mystery Squad for 1st–2nd year. Mystery Masters for 3rd–4th year. One sealed case per team per unit.',
  },
  {
    title: 'Register your call-sign.',
    desc: 'Your team name becomes the handle for every case assignment and score.',
  },
  {
    title: 'Open your sealed PDF.',
    desc: 'The server deals you a case brief. Hints, timestamps, redacted fragments — chase them. One chance per team.',
  },
  {
    title: 'Connect the dots and report in.',
    desc: 'Investigate offline. When your reasoning is tight, submit the written report to coordinators. Verified scores land on the live leaderboard.',
  },
]
