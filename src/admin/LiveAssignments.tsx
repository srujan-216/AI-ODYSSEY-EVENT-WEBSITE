import { useCallback, useEffect, useMemo, useState } from 'react'
import { Clock, Radio, Stamp, Users } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { ResultRow, TeamAssignment, Track } from '../lib/types'
import {
  difficultyFor,
  getAllCases,
  labelFor,
  titleFor,
  TRACK_LABEL,
} from '../lib/cases'

interface Props {
  results: ResultRow[]
  onRecord: (prefill: {
    team_name: string
    track: Track
    case_number: number
  }) => void
}

interface Enriched extends TeamAssignment {
  result?: ResultRow
}

/**
 * Live Assignments — the "front desk" of the control room.
 *
 * The second a team spins the wheel, the `assign_case()` RPC inserts a row
 * into `team_assignments`. Supabase realtime streams that insert here, so
 * admins see pickup timestamps the moment they happen. Each row's status
 * (sealed → submitted) is derived by joining against `results` client-side.
 *
 * Click a sealed row → fires `onRecord(...)` which the parent uses to prefill
 * the ResultsEditor modal with team + track + case, so the admin just types
 * the score when the offline report lands.
 */
export function LiveAssignments({ results, onRecord }: Props) {
  const [rows, setRows] = useState<TeamAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all')
  const [trackFilter, setTrackFilter] = useState<'all' | Track>('all')
  const [now, setNow] = useState(Date.now())

  // Ticking clock for elapsed time (updates every 15s — fine granularity for
  // 6-hour event; a per-second rerender here would be wasteful).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('team_assignments')
      .select('*')
      .order('assigned_at', { ascending: false })
      .limit(200)
    if (!error && data) setRows(data as TeamAssignment[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    if (!isSupabaseConfigured) return
    const ch = supabase
      .channel('live-assignments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_assignments' },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [load])

  // Index results by (team_name_lower + track + case_number) so each
  // assignment can be tagged "submitted" without an N² scan per render.
  const resultIndex = useMemo(() => {
    const m = new Map<string, ResultRow>()
    for (const r of results) {
      m.set(
        `${r.team_name.toLowerCase()}|${r.track}|${r.case_number}`,
        r,
      )
    }
    return m
  }, [results])

  const enriched: Enriched[] = useMemo(() => {
    return rows.map((a) => ({
      ...a,
      result: resultIndex.get(
        `${a.team_name.toLowerCase()}|${a.track}|${a.case_number}`,
      ),
    }))
  }, [rows, resultIndex])

  const visible = useMemo(() => {
    return enriched.filter((e) => {
      if (trackFilter !== 'all' && e.track !== trackFilter) return false
      if (filter === 'pending' && e.result?.is_solved) return false
      if (filter === 'submitted' && !e.result?.is_solved) return false
      return true
    })
  }, [enriched, filter, trackFilter])

  const pending = enriched.filter((e) => !e.result?.is_solved).length
  const uniqueTeams = new Set(
    enriched.map((e) => `${e.team_name.toLowerCase()}|${e.track}`),
  ).size

  // Per-case load: how many teams are on each case right now, and how many
  // of those have submitted. Confirms visually that multiple teams can hold
  // the same case concurrently — exactly what 40 teams × 8 cases needs.
  const caseLoad = useMemo(() => {
    const all = getAllCases()
    return all.map((c) => {
      const onCase = enriched.filter((e) => e.case_number === c.number)
      const active = onCase.filter((e) => !e.result?.is_solved).length
      const submitted = onCase.filter((e) => e.result?.is_solved).length
      return { case: c, active, submitted, total: onCase.length }
    })
  }, [enriched])

  return (
    <div className="glass rounded-2xl p-5 sm:p-6 md:p-8 relative overflow-hidden">
      <span
        aria-hidden
        className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyber-success/60"
      />
      <span
        aria-hidden
        className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyber-success/60"
      />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="section-title inline-flex items-center gap-2 flex-wrap">
            <span className="live-dot" />
            // Front desk
          </div>
          <h2 className="h-display text-lg sm:text-xl md:text-2xl text-white mt-1">
            Live spin feed
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl">
            Every spin from the two tracks arrives here the instant a team
            picks a case. Pickup timestamps are stamped by the server; click
            a pending row to record the score when the offline report lands.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[0.65rem] font-display uppercase tracking-widest shrink-0">
          <span className="chip chip-amber">
            <Clock size={11} /> {pending} pending
          </span>
          <span className="chip">
            <Users size={11} /> {uniqueTeams} teams
          </span>
        </div>
      </div>

      {/* ======= PER-CASE LOAD ======= */}
      <div className="mt-5">
        <div className="section-title mb-2">
          // Case load · teams currently holding each brief
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {caseLoad.map(({ case: c, active, submitted, total }) => {
            const hard = c.difficulty === 'hard'
            const hot = active >= 5
            return (
              <div
                key={c.number}
                className={`rounded-md border p-2 relative overflow-hidden ${
                  hard
                    ? 'border-cyber-amber/40 bg-cyber-amber/5'
                    : 'border-cyber-cyan/30 bg-cyber-cyan/5'
                }`}
                title={`${c.label} — ${c.title}: ${active} active, ${submitted} submitted (${total} total)`}
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span
                    className={`font-display font-bold text-sm ${
                      hard ? 'text-cyber-amber' : 'text-cyber-cyan'
                    }`}
                  >
                    {c.label}
                  </span>
                  <span
                    className={`font-display font-bold text-xl tabular-nums ${
                      hot
                        ? 'text-cyber-danger'
                        : active > 0
                        ? 'text-white'
                        : 'text-slate-500'
                    }`}
                  >
                    {active}
                  </span>
                </div>
                <div className="text-[0.55rem] text-slate-500 tabular-nums tracking-widest uppercase font-mono">
                  active · {submitted} done
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-[0.6rem] text-slate-500 mt-2 italic">
          Multiple teams on the same case is expected — the DB allows every
          case to be held in parallel; only each team's own "one at a time"
          rule is enforced.
        </p>
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(['all', 'pending', 'submitted'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md font-display tracking-widest uppercase text-[0.6rem] border transition-all ${
              filter === f
                ? 'bg-cyber-success/15 text-white border-cyber-success'
                : 'bg-white/[0.02] text-slate-400 border-white/5 hover:border-cyber-success/40'
            }`}
          >
            {f}
          </button>
        ))}
        <span className="w-px h-5 bg-white/10 mx-1" />
        {(['all', 'junior', 'senior'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setTrackFilter(f)}
            className={`px-3 py-1.5 rounded-md font-display tracking-widest uppercase text-[0.6rem] border transition-all ${
              trackFilter === f
                ? 'bg-cyber-cyan/15 text-white border-cyber-cyan'
                : 'bg-white/[0.02] text-slate-400 border-white/5 hover:border-cyber-cyan/40'
            }`}
          >
            {f === 'all' ? 'Both tracks' : TRACK_LABEL[f]}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="mt-4 max-h-[480px] overflow-auto rounded-lg border border-white/5">
        {loading && (
          <div className="p-6 text-center text-slate-500 text-sm">Loading…</div>
        )}
        {!loading && visible.length === 0 && (
          <div className="p-6 text-center text-slate-500 text-sm">
            <Radio size={22} className="mx-auto mb-2 text-slate-600" />
            No matching assignments yet. The feed will update the moment a
            team spins the wheel.
          </div>
        )}
        <ul>
          {visible.map((a) => {
            const diff =
              a.difficulty ?? difficultyFor(a.case_number)
            const submitted = Boolean(a.result?.is_solved)
            const elapsedMs =
              (a.result?.completion_time
                ? new Date(a.result.completion_time).getTime()
                : now) - new Date(a.assigned_at).getTime()
            return (
              <li
                key={a.id}
                className="border-t border-white/5 first:border-t-0 hover:bg-cyber-cyan/[0.04] transition-colors"
              >
                <div className="flex items-start gap-3 p-3 sm:p-4 flex-wrap sm:flex-nowrap">
                  <div className="shrink-0 w-10 h-10 rounded-md border border-cyber-cyan/40 bg-cyber-cyan/5 grid place-items-center font-mono text-xs text-cyber-cyan tabular-nums">
                    {labelFor(a.case_number)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-display text-white text-sm truncate max-w-[220px]">
                        {a.team_name}
                      </span>
                      <span
                        className={
                          a.track === 'junior'
                            ? 'chip text-[0.6rem]'
                            : 'chip chip-violet text-[0.6rem]'
                        }
                      >
                        {TRACK_LABEL[a.track]}
                      </span>
                      <span
                        className={
                          diff === 'hard'
                            ? 'chip chip-amber text-[0.6rem]'
                            : 'chip chip-success text-[0.6rem]'
                        }
                      >
                        {diff === 'hard' ? 'Hard' : 'Easy'}
                      </span>
                      {submitted ? (
                        <span className="chip chip-success text-[0.6rem]">
                          Submitted
                        </span>
                      ) : (
                        <span className="chip chip-amber text-[0.6rem]">
                          Awaiting report
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-300 truncate">
                      {titleFor(a.case_number)}
                    </div>
                    <div className="mt-1 text-[0.65rem] text-slate-500 font-mono tabular-nums flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>
                        pickup{' '}
                        <span className="text-slate-300">
                          {new Date(a.assigned_at).toLocaleTimeString()}
                        </span>
                      </span>
                      {submitted && a.result?.completion_time ? (
                        <span>
                          submitted{' '}
                          <span className="text-slate-300">
                            {new Date(
                              a.result.completion_time,
                            ).toLocaleTimeString()}
                          </span>
                        </span>
                      ) : null}
                      <span>
                        elapsed{' '}
                        <span
                          className={
                            submitted
                              ? 'text-cyber-success'
                              : 'text-cyber-amber'
                          }
                        >
                          {formatElapsed(elapsedMs)}
                        </span>
                      </span>
                      {submitted && a.result?.score != null ? (
                        <span>
                          score{' '}
                          <span className="text-cyber-cyan">
                            {a.result.score}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 w-full sm:w-auto">
                    {submitted ? (
                      <button
                        onClick={() =>
                          onRecord({
                            team_name: a.team_name,
                            track: a.track,
                            case_number: a.case_number,
                          })
                        }
                        className="cyber-btn cyber-btn-ghost text-[0.6rem] w-full sm:w-auto"
                        title="Edit the recorded submission"
                      >
                        Edit score
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          onRecord({
                            team_name: a.team_name,
                            track: a.track,
                            case_number: a.case_number,
                          })
                        }
                        className="cyber-btn cyber-btn-primary text-[0.6rem] w-full sm:w-auto"
                      >
                        <Stamp size={12} /> Record score
                      </button>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}
