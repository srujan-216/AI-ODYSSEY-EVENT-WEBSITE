import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Fingerprint, Shield } from 'lucide-react'

export function Tracks() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 relative overflow-hidden">
      {/* Background cursive */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      >
        <div
          className="absolute -top-10 -right-10 font-hand text-red-900/10 whitespace-nowrap rotate-[-6deg]"
          style={{ fontSize: 'clamp(10rem, 20vw, 20rem)' }}
        >
          choose a unit
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-baseline justify-between flex-wrap gap-4 mb-14">
          <div>
            <div className="font-mono text-[0.65rem] tracking-[0.3em] uppercase text-red-500 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full breath" />
              Clearance review · 00:00:08
            </div>
            <h1 className="font-serif italic text-stone-50 text-4xl md:text-6xl leading-tight">
              Pick <span className="scribble">your</span> file.
            </h1>
            <p className="mt-4 text-stone-400 max-w-xl leading-relaxed">
              Two investigation units. One sealed case per team. Both files are
              on the table — your academic year decides which one you can open.
            </p>
          </div>
          <div className="font-hand text-xl text-red-500">
            — don't mix the folders.
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-2 stage-3d">
          <CaseFolder
            to="/dashboard/junior"
            unit="Unit · 01"
            name="The Mystery Squad"
            years="1st & 2nd Year"
            cases={5}
            tone="cyan"
            tagline="Entry grade"
            desc="Clean reasoning. Well-defined evidence. Surprises you can work with."
            stamp="Open"
            rotate="-rotate-2"
          />
          <CaseFolder
            to="/dashboard/senior"
            unit="Unit · 02"
            name="The Mystery Masters"
            years="3rd & 4th Year"
            cases={5}
            tone="red"
            tagline="Adversarial grade"
            desc="Layered intel. Misdirection. Tighter time budgets. Harder decisions."
            stamp="Hot"
            rotate="rotate-2"
          />
        </div>
      </div>
    </section>
  )
}

interface Props {
  to: string
  unit: string
  name: string
  years: string
  cases: number
  tone: 'cyan' | 'red'
  tagline: string
  desc: string
  stamp: string
  rotate: string
}

function CaseFolder({
  to,
  unit,
  name,
  years,
  cases,
  tone,
  tagline,
  desc,
  stamp,
  rotate,
}: Props) {
  const tab =
    tone === 'red'
      ? 'bg-red-600 text-stone-50'
      : 'bg-cyan-500 text-stone-900'
  const accent = tone === 'red' ? 'text-red-600' : 'text-cyan-600'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, type: 'spring', stiffness: 140, damping: 18 }}
      whileHover={{ y: -8, rotate: 0, scale: 1.015 }}
      className={`relative paper ${rotate} transition-shadow hover:shadow-[0_40px_60px_-20px_rgba(0,0,0,0.75)]`}
    >
      {/* Folder tab */}
      <div
        className={`absolute -top-6 left-8 ${tab} px-5 py-2 font-display font-bold tracking-widest uppercase text-xs`}
        style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}
      >
        {unit}
      </div>

      {/* Washi tape top right */}
      <span className="tape tape-red" style={{ top: -8, right: 60, transform: 'rotate(8deg)' }} />

      {/* Classified stamp */}
      <span
        className="absolute top-6 right-6 stamp stamp-tilt"
        style={{ fontSize: '0.65rem' }}
      >
        {stamp}
      </span>

      <div className="p-8 pt-14">
        <div className="flex items-center gap-3 text-[0.65rem] font-mono tracking-widest uppercase text-stone-600">
          <span>Division</span>
          <span className="text-stone-500">/</span>
          <span>{years}</span>
        </div>
        <h2 className="font-serif italic text-stone-900 text-3xl md:text-4xl mt-2 leading-tight">
          {name}
        </h2>
        <div className={`mt-1 font-hand text-xl ${accent}`}>{tagline}</div>

        <p className="mt-6 text-stone-700 leading-relaxed max-w-md">{desc}</p>

        {/* Fingerprint + case bars */}
        <div className="mt-8 grid grid-cols-[auto,1fr] gap-6 items-center">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 rounded-full border-2 ${
                tone === 'red' ? 'border-red-600' : 'border-cyan-600'
              } grid place-items-center ${accent}`}
            >
              {tone === 'red' ? <Shield size={22} /> : <Fingerprint size={22} />}
            </div>
            <div>
              <div className="font-mono text-[0.55rem] tracking-widest uppercase text-stone-600">
                Case files
              </div>
              <div className={`font-serif italic text-5xl ${accent} leading-none`}>
                {String(cases).padStart(2, '0')}
              </div>
            </div>
          </div>
          <div className="flex items-end gap-1 h-14">
            {Array.from({ length: cases }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 ${
                  tone === 'red' ? 'bg-red-600/70' : 'bg-cyan-600/70'
                }`}
                style={{ height: `${30 + i * 12}%` }}
              />
            ))}
          </div>
        </div>

        {/* Barcode */}
        <div className="barcode mt-6 opacity-80" />

        {/* CTA */}
        <div className="mt-8 pt-6 border-t border-stone-900/15 flex items-center justify-end">
          <Link
            to={to}
            className={`group inline-flex items-center gap-3 px-5 py-3 font-display font-bold tracking-widest uppercase text-xs transition-transform hover:-translate-y-0.5 ${
              tone === 'red'
                ? 'bg-red-600 text-stone-50'
                : 'bg-stone-900 text-stone-50'
            }`}
            style={{
              clipPath: 'polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)',
            }}
          >
            Open folder
            <ArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
        </div>
      </div>

      {/* Dog-eared corner */}
      <div
        aria-hidden
        className="absolute bottom-0 right-0 w-10 h-10"
        style={{
          background:
            'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.4) 65%, transparent 70%)',
        }}
      />
    </motion.div>
  )
}
