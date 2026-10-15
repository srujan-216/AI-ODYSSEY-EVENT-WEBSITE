import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Activity, Database, ShieldCheck, Trophy, type LucideIcon } from 'lucide-react'
import { RequireAdmin } from '../components/RequireAdmin'
import { useAuth, displayNameFor } from '../lib/auth'
import { useResults } from '../admin/useResults'
import { ResultsUploader } from '../admin/ResultsUploader'
import { ResultsEditor } from '../admin/ResultsEditor'
import { TRACK_LABEL } from '../lib/cases'
import { useCountUp, useTilt } from '../lib/hooks'

export function Admin() {
  return (
    <RequireAdmin>
      <AdminInner />
    </RequireAdmin>
  )
}

function AdminInner() {
  const { profile } = useAuth()
  const { rows, loading, refresh } = useResults()

  const stats = useMemo(() => {
    const real = rows.filter((r) => !r.is_demo)
    const uniq = new Set(real.map((r) => `${r.team_name.toLowerCase()}|${r.track}`))
    return {
      teams: uniq.size,
      records: real.length,
      topScore: real.reduce((m, r) => Math.max(m, r.score), 0),
      recent: [...rows]
        .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))
        .slice(0, 5),
      junior: rows.filter((r) => r.track === 'junior').length,
      senior: rows.filter((r) => r.track === 'senior').length,
    }
  }, [rows])

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-cyber-violet" size={22} />
          <span className="section-title inline-flex items-center gap-2">
            <span className="live-dot" />
            Private · Investigator access
          </span>
        </div>
        <h1 className="h-display text-3xl md:text-4xl text-white glow-text mt-1">
          Investigation Control Room
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Signed in as{' '}
          <span className="text-cyber-cyan">{displayNameFor(profile)}</span>{profile?.email && profile?.email !== displayNameFor(profile) && (
            <span className="text-slate-500 text-xs"> &nbsp;({profile.email})</span>
          )} ·{' '}
          <span className="chip chip-violet">{profile?.role?.toUpperCase()}</span>
        </p>
      </motion.div>

      {/* HUD rail */}
      <div className="glass rounded-xl px-4 py-3 mt-6 flex flex-wrap items-center justify-between gap-3 text-[0.7rem] font-display uppercase tracking-widest">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="text-cyber-cyan">[OPS //</span>
          <span className="text-white">Control Room</span>
          <span className="text-cyber-cyan">//]</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span className="text-cyber-success inline-flex items-center gap-1.5">
            <span className="live-dot" /> LIVE FEED
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500 tabular-nums">
            {new Date().toISOString().slice(11, 19)}Z
          </span>
        </div>
      </div>

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-6 stage-3d">
        <OverviewCard icon={Database} label="Teams on record" value={stats.teams} tone="cyan" />
        <OverviewCard icon={Activity} label="Total records" value={stats.records} tone="violet" />
        <OverviewCard icon={Trophy} label="Highest score" value={stats.topScore} tone="amber" />
        <OverviewCard
          icon={Database}
          label="Jr / Adv split"
          value={`${stats.junior} / ${stats.senior}`}
          tone="cyan"
          raw
        />
      </div>

      {/* Recent updates */}
      <div className="glass rounded-2xl p-6 mt-6 relative overflow-hidden">
        <span aria-hidden className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyber-cyan/50" />
        <span aria-hidden className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyber-cyan/50" />
        <div className="section-title">// Recent updates</div>
        <h3 className="h-display text-lg text-white mt-1">Last 5 edits</h3>
        <ul className="mt-3 divide-y divide-white/5">
          {loading && (
            <li className="py-3 text-slate-400 text-sm">Loading…</li>
          )}
          {!loading && stats.recent.length === 0 && (
            <li className="py-3 text-slate-500 text-sm">No records yet.</li>
          )}
          {stats.recent.map((r) => (
            <li
              key={r.id}
              className="py-3 flex items-center justify-between text-sm gap-3 hover:bg-cyber-cyan/[0.03] -mx-2 px-2 rounded transition-colors"
            >
              <div>
                <span className="font-display text-white">{r.team_name}</span>{' '}
                <span className={r.track === 'junior' ? 'chip ml-2' : 'chip chip-violet ml-2'}>
                  {TRACK_LABEL[r.track]}
                </span>
                <span className="chip ml-2 font-mono text-[0.65rem]">
                  Case 0{r.case_number}
                </span>
                {r.is_solved ? (
                  <span className="chip chip-success ml-2 text-[0.65rem]">Solved</span>
                ) : (
                  <span className="chip ml-2 text-[0.65rem] text-slate-400">In progress</span>
                )}
                {r.is_demo && <span className="chip chip-amber ml-2">Demo</span>}
              </div>
              <div className="text-xs text-slate-500 shrink-0">
                score <span className="text-cyber-cyan tabular-nums">{r.score}</span>
                {r.updated_at && (
                  <>
                    {' · '}
                    {new Date(r.updated_at).toLocaleString()}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 space-y-6">
        <ResultsUploader existing={rows} onImported={refresh} />
        <ResultsEditor rows={rows} onChanged={refresh} />
      </div>
    </section>
  )
}

interface OCProps {
  icon: LucideIcon
  label: string
  value: number | string
  tone: 'cyan' | 'violet' | 'amber'
  raw?: boolean
}
function OverviewCard({ icon: Icon, label, value, tone, raw }: OCProps) {
  const colors =
    tone === 'violet'
      ? 'bg-cyber-violet/10 border-cyber-violet/40 text-cyber-violet'
      : tone === 'amber'
      ? 'bg-cyber-amber/10 border-cyber-amber/40 text-cyber-amber'
      : 'bg-cyber-cyan/10 border-cyber-cyan/40 text-cyber-cyan'
  const tilt = useTilt({ max: 6 })
  const n = useCountUp(typeof value === 'number' ? value : 0, 1200)
  const display = raw || typeof value !== 'number' ? value : n
  return (
    <div
      ref={tilt.ref}
      onPointerMove={tilt.onMove}
      onPointerLeave={tilt.onLeave}
      style={tilt.style}
      className="glass rounded-xl p-5 flex items-center gap-4 relative overflow-hidden group hover:border-cyber-cyan/40 transition-colors"
    >
      <span
        aria-hidden
        className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity"
        style={{
          background:
            tone === 'violet' ? '#a78bfa' : tone === 'amber' ? '#fbbf24' : '#22d3ee',
        }}
      />
      <div className={`w-10 h-10 rounded-lg border grid place-items-center ${colors} relative`}>
        <Icon size={18} />
      </div>
      <div className="relative">
        <div className="text-[0.6rem] tracking-[0.3em] uppercase text-slate-500">{label}</div>
        <div className="h-display text-2xl text-white tabular-nums">{display}</div>
      </div>
    </div>
  )
}
