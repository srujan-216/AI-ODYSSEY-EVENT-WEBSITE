import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  Database,
  ShieldCheck,
  Trophy,
  Timer,
  Hash,
  Scale,
  type LucideIcon,
} from 'lucide-react'
import { RequireAdmin } from '../components/RequireAdmin'
import { useAuth, displayNameFor } from '../lib/auth'
import { useResults } from '../admin/useResults'
import { ResultsUploader } from '../admin/ResultsUploader'
import { ResultsEditor, type ResultsEditorHandle } from '../admin/ResultsEditor'
import { LiveAssignments } from '../admin/LiveAssignments'
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
  const editorRef = useRef<ResultsEditorHandle>(null)
  const [showUploader, setShowUploader] = useState(false)

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
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-14">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <ShieldCheck className="text-cyber-violet shrink-0" size={22} />
          <span className="section-title inline-flex items-center gap-2 min-w-0">
            <span className="live-dot" />
            <span className="truncate">Private · Investigator access</span>
          </span>
        </div>
        <h1 className="h-display text-2xl sm:text-3xl md:text-4xl text-white glow-text mt-1">
          Investigation Control Room
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 break-words">
          Signed in as{' '}
          <span className="text-cyber-cyan">{displayNameFor(profile)}</span>
          {profile?.email && profile?.email !== displayNameFor(profile) && (
            <span className="text-slate-500 text-xs"> ({profile.email})</span>
          )}{' '}
          · <span className="chip chip-violet">{profile?.role?.toUpperCase()}</span>
        </p>
      </motion.div>

      {/* HUD rail */}
      <div className="glass rounded-xl px-3 sm:px-4 py-3 mt-6 flex flex-wrap items-center justify-between gap-3 text-[0.65rem] sm:text-[0.7rem] font-display uppercase tracking-widest">
        <div className="flex items-center gap-2 sm:gap-3 text-slate-400 min-w-0">
          <span className="text-cyber-cyan">[OPS //</span>
          <span className="text-white truncate">Control Room</span>
          <span className="text-cyber-cyan hidden sm:inline">//]</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-slate-400 min-w-0">
          <span className="text-cyber-success inline-flex items-center gap-1.5">
            <span className="live-dot" /> LIVE
          </span>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <span className="text-slate-500 tabular-nums hidden sm:inline">
            {new Date().toISOString().slice(11, 19)}Z
          </span>
        </div>
      </div>

      {/* Evaluation rubric — visible so coordinators enter scores on the right axis */}
      <div className="glass rounded-xl p-4 sm:p-5 mt-6 relative">
        <div className="section-title">// Evaluation rubric</div>
        <h3 className="h-display text-sm sm:text-base text-white mt-1 mb-3">
          Teams rank by three signals, in order
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <RubricRow
            icon={Hash}
            label="Cases solved"
            value="Most first"
            tone="cyan"
          />
          <RubricRow
            icon={Scale}
            label="Report correctness"
            value="Higher score first"
            tone="violet"
          />
          <RubricRow
            icon={Timer}
            label="Time taken"
            value="Submitted earlier first"
            tone="amber"
          />
        </div>
      </div>

      {/* Overview */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mt-6 stage-3d">
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

      {/* ============ LIVE SPIN FEED (the "front desk") ============ */}
      <div className="mt-6">
        <LiveAssignments
          results={rows}
          onRecord={(prefill) => editorRef.current?.startWithPrefill(prefill)}
        />
      </div>

      {/* Recent updates */}
      <div className="glass rounded-2xl p-5 sm:p-6 mt-6 relative overflow-hidden">
        <span
          aria-hidden
          className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyber-cyan/50"
        />
        <span
          aria-hidden
          className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyber-cyan/50"
        />
        <div className="section-title">// Recent updates</div>
        <h3 className="h-display text-base sm:text-lg text-white mt-1">Last 5 edits</h3>
        <ul className="mt-3 divide-y divide-white/5">
          {loading && <li className="py-3 text-slate-400 text-sm">Loading…</li>}
          {!loading && stats.recent.length === 0 && (
            <li className="py-3 text-slate-500 text-sm">No records yet.</li>
          )}
          {stats.recent.map((r) => (
            <li
              key={r.id}
              className="py-3 flex items-start sm:items-center justify-between text-sm gap-3 flex-col sm:flex-row hover:bg-cyber-cyan/[0.03] -mx-2 px-2 rounded transition-colors"
            >
              <div className="min-w-0 flex-wrap flex items-center gap-2">
                <span className="font-display text-white truncate">{r.team_name}</span>
                <span
                  className={
                    r.track === 'junior' ? 'chip' : 'chip chip-violet'
                  }
                >
                  {TRACK_LABEL[r.track]}
                </span>
                <span className="chip font-mono text-[0.65rem]">
                  Case 0{r.case_number}
                </span>
                {r.is_solved ? (
                  <span className="chip chip-success text-[0.65rem]">Solved</span>
                ) : (
                  <span className="chip text-[0.65rem] text-slate-400">
                    In progress
                  </span>
                )}
                {r.is_demo && <span className="chip chip-amber">Demo</span>}
              </div>
              <div className="text-xs text-slate-500 shrink-0 w-full sm:w-auto">
                score <span className="text-cyber-cyan tabular-nums">{r.score}</span>
                {r.updated_at && (
                  <>
                    {' · '}
                    <span className="whitespace-nowrap">
                      {new Date(r.updated_at).toLocaleString()}
                    </span>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ============ ADMIN TOOLS ============ */}
      <div className="mt-6 space-y-6">
        {/* Bulk upload — collapsed by default, prominent CTA to open */}
        <div className="glass rounded-2xl p-5 sm:p-6 md:p-8">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="section-title">// Bulk upload</div>
              <h2 className="h-display text-lg sm:text-xl md:text-2xl text-white mt-1">
                Bulk upload scores (CSV)
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl">
                Hand-held mode is above; this is the batch mode. Upload a CSV of
                team + track + case + score (and optionally completion time).
                Rows that match existing records are updated; invalid rows are
                reported and never saved.
              </p>
            </div>
            <button
              onClick={() => setShowUploader((s) => !s)}
              className={`cyber-btn text-xs ${
                showUploader ? 'cyber-btn-ghost' : 'cyber-btn-primary'
              }`}
            >
              {showUploader ? 'Hide uploader' : 'Open bulk upload'}
            </button>
          </div>
          {showUploader && (
            <div className="mt-5">
              <ResultsUploader existing={rows} onImported={refresh} />
            </div>
          )}
        </div>

        <ResultsEditor ref={editorRef} rows={rows} onChanged={refresh} />
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
      className="glass rounded-xl p-3 sm:p-5 flex items-center gap-3 sm:gap-4 relative overflow-hidden group hover:border-cyber-cyan/40 transition-colors"
    >
      <span
        aria-hidden
        className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity"
        style={{
          background:
            tone === 'violet' ? '#a78bfa' : tone === 'amber' ? '#fbbf24' : '#22d3ee',
        }}
      />
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg border grid place-items-center shrink-0 ${colors} relative`}
      >
        <Icon size={16} />
      </div>
      <div className="relative min-w-0">
        <div className="text-[0.55rem] sm:text-[0.6rem] tracking-[0.3em] uppercase text-slate-500 truncate">
          {label}
        </div>
        <div className="h-display text-xl sm:text-2xl text-white tabular-nums">
          {display}
        </div>
      </div>
    </div>
  )
}

function RubricRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone: 'cyan' | 'violet' | 'amber'
}) {
  const colors =
    tone === 'violet'
      ? 'bg-cyber-violet/10 border-cyber-violet/40 text-cyber-violet'
      : tone === 'amber'
      ? 'bg-cyber-amber/10 border-cyber-amber/40 text-cyber-amber'
      : 'bg-cyber-cyan/10 border-cyber-cyan/40 text-cyber-cyan'
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-8 h-8 rounded-md border grid place-items-center shrink-0 ${colors}`}
      >
        <Icon size={14} />
      </div>
      <div className="min-w-0">
        <div className="text-[0.6rem] tracking-[0.3em] uppercase text-slate-500">
          {label}
        </div>
        <div className="text-sm text-slate-200 mt-0.5">{value}</div>
      </div>
    </div>
  )
}
