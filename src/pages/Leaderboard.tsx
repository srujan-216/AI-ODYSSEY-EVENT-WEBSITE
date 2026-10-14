import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Clock,
  Crown,
  Loader2,
  Medal,
  Trophy,
  X,
} from 'lucide-react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { LeaderboardEntry, Track } from '../lib/types'
import { TRACK_LABEL } from '../lib/cases'
import { useCountUp } from '../lib/hooks'

type Filter = 'all' | Track
type SortKey = 'rank' | 'team' | 'division' | 'score' | 'time' | 'status'
type SortDir = 'asc' | 'desc'

const SHOW_DEMO_BANNER =
  (import.meta.env.VITE_SHOW_DEMO_BANNER ?? 'true').toLowerCase() !== 'false'

export function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardEntry[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  // Column sort — the backend returns rows pre-sorted by rank; this adds a
  // client-side override when the user clicks a column header.
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const load = async () => {
    if (!isSupabaseConfigured) {
      setRows(SAMPLE_DEMO)
      setError('Backend not configured — showing locally-defined demo data.')
      return
    }
    const { data, error } = await supabase
      .from('leaderboard_public')
      .select('*')
      .order('score', { ascending: false })
      .order('completion_time', { ascending: true, nullsFirst: false })
      .order('updated_at', { ascending: true })
    if (error) {
      setError(error.message)
      setRows([])
      return
    }
    setError(null)
    setRows(data as LeaderboardEntry[])
  }

  useEffect(() => {
    load()
    if (!isSupabaseConfigured) return
    const ch = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results' },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    if (!rows) return null
    if (filter === 'all') return rows
    return rows.filter((r) => r.track === filter)
  }, [rows, filter])

  // Decorated rows: assign the "official" rank (backend-ordered) BEFORE
  // applying any client sort, so clicking column headers doesn't change the
  // numeric rank each team gets credited with.
  const decorated = useMemo(() => {
    if (!filtered) return null
    return filtered.map((r, i) => ({ row: r, rank: i + 1 }))
  }, [filtered])

  const sorted = useMemo(() => {
    if (!decorated) return null
    const arr = [...decorated]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'rank':
          return (a.rank - b.rank) * dir
        case 'team':
          return a.row.team_name.localeCompare(b.row.team_name) * dir
        case 'division':
          return a.row.track.localeCompare(b.row.track) * dir
        case 'score':
          return (a.row.score - b.row.score) * dir
        case 'time': {
          const at = a.row.completion_time ? +new Date(a.row.completion_time) : Infinity
          const bt = b.row.completion_time ? +new Date(b.row.completion_time) : Infinity
          return (at - bt) * dir
        }
        case 'status':
          return (a.row.status || '').localeCompare(b.row.status || '') * dir
      }
    })
    return arr
  }, [decorated, sortKey, sortDir])

  const demoOnly = useMemo(
    () => (sorted ? sorted.length > 0 && sorted.every((d) => d.row.is_demo) : false),
    [sorted],
  )

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(k)
      setSortDir(k === 'score' ? 'desc' : 'asc')
    }
  }

  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
      {/* ambient grid backdrop */}
      <div className="lb-grid-bg" aria-hidden />

      {/* ────── Header ────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative text-center mb-10"
      >
        <div className="section-title">// Real-time intelligence feed</div>
        <h1 className="h-display text-3xl md:text-5xl mt-2 text-white glow-text flex items-center justify-center gap-3">
          <Trophy className="text-cyber-cyan" size={34} /> Leaderboard
        </h1>
        <p className="text-slate-400 mt-3 max-w-xl mx-auto text-sm">
          Scores are sorted highest-first. Ties break by earliest recorded completion time,
          then by earliest update time. Click any column header to re-sort.
        </p>
      </motion.div>

      {/* ────── Demo banner ────── */}
      <AnimatePresence>
        {SHOW_DEMO_BANNER && demoOnly && !bannerDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.4 }}
            className="relative mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-400 px-4 py-3 text-xs flex items-start gap-2 overflow-hidden"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <p className="flex-1">
              <span className="font-display tracking-widest uppercase font-semibold">
                Demo data —
              </span>{' '}
              these are placeholder teams so the layout looks complete. They are clearly marked
              and will be replaced the moment coordinators upload real competition results.
            </p>
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 text-amber-400 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 rounded"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ────── Filters + count ────── */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-md font-display tracking-widest uppercase text-[0.65rem]
                          transition-all border focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan/60
                          ${
                            filter === f.value
                              ? 'bg-cyber-cyan/15 text-white border-cyber-cyan shadow-[0_0_14px_rgba(34,211,238,0.3)]'
                              : 'bg-white/[0.02] text-slate-400 border-cyber-cyan/40 hover:border-cyber-cyan hover:text-white'
                          }`}
              aria-pressed={filter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
        {rows && (
          <span className="px-3 py-1.5 rounded-md border border-cyber-cyan/60 text-cyber-cyan font-display tracking-widest uppercase text-[0.65rem]">
            {sorted?.length ?? 0} / {rows.length} teams
          </span>
        )}
      </div>

      {/* ────── Table / states ────── */}
      <div className="relative rounded-xl border border-cyber-cyan/20 bg-black/40 backdrop-blur-sm overflow-hidden">
        <HudCorners />

        {!sorted ? (
          <div className="p-10 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Decrypting intel…
          </div>
        ) : error && sorted.length === 0 ? (
          <div className="p-10 text-center text-cyber-danger text-sm">
            <AlertTriangle className="mx-auto mb-2" />
            {error}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            No results on record yet. The feed is live — scores will appear here the moment
            coordinators upload them.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.6rem] tracking-[0.3em] uppercase text-slate-400 border-b border-cyber-cyan/15">
                  <Th label="Rank"       k="rank"     sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} className="w-16 pl-5" />
                  <Th label="Team"       k="team"     sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Division"   k="division" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Status"     k="status"   sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Completion" k="time"     sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} />
                  <Th label="Score"      k="score"    sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" className="pr-5" />
                </tr>
              </thead>
              <LayoutGroup>
                <motion.tbody layout>
                  {sorted.map(({ row: r, rank }, i) => (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{
                        layout: { duration: 0.5, ease: [0.2, 0.65, 0.2, 1] },
                        opacity: { delay: Math.min(i * 0.02, 0.5), duration: 0.35 },
                        x: { delay: Math.min(i * 0.02, 0.5), duration: 0.35 },
                      }}
                      className={`border-b border-white/[0.04] hover:bg-cyber-cyan/[0.05] transition-colors
                                 ${rank <= 3 ? 'bg-gradient-to-r from-cyber-cyan/[0.05] to-transparent' : ''}`}
                    >
                      <td className="py-3.5 pl-5 pr-3">
                        <RankBadge rank={rank} />
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display font-medium text-white">
                            {r.team_name}
                          </span>
                          {r.is_demo ? (
                            <span className="chip chip-amber">Demo</span>
                          ) : (
                            <span className="chip chip-success">Official</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={r.track === 'junior' ? 'chip' : 'chip chip-violet'}>
                          {TRACK_LABEL[r.track]}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-300 text-xs font-mono">
                        {r.status || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3.5 px-3 text-[0.72rem] text-slate-400 font-mono whitespace-nowrap">
                        {r.completion_time ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock size={10} />
                            {formatDateTime(r.completion_time)}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3.5 pl-3 pr-5 text-right">
                        <ScoreCell rank={rank} score={r.score} />
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </LayoutGroup>
            </table>
          </div>
        )}
      </div>

      {/* Footnote */}
      <p className="mt-4 text-[0.7rem] text-slate-500 font-mono flex items-start gap-1.5">
        <span className="text-cyber-cyan">◉</span>
        <span>
          Realtime subscription — scores update the instant a coordinator records them. Only
          authenticated coordinators can create, edit or delete rows; this page is read-only.
        </span>
      </p>
    </section>
  )
}

/* ────────────────────── Sortable header cell ────────────────────── */

function Th({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  align = 'left',
  className = '',
}: {
  label: string
  k: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onClick: (k: SortKey) => void
  align?: 'left' | 'right'
  className?: string
}) {
  const active = sortKey === k
  return (
    <th scope="col" className={`py-3 px-3 ${className}`}>
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1.5 group transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan/60 rounded
                    ${align === 'right' ? 'ml-auto flex-row-reverse' : ''}
                    ${active ? 'text-cyber-cyan' : 'text-slate-400 hover:text-white'}`}
        aria-sort={
          active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
        }
      >
        <span>{label}</span>
        <motion.span
          initial={false}
          animate={{ rotate: active && sortDir === 'desc' ? 180 : 0, opacity: active ? 1 : 0.3 }}
          transition={{ duration: 0.25 }}
          className="inline-flex"
        >
          {active ? (
            sortDir === 'asc' ? (
              <ArrowUp size={10} />
            ) : (
              <ArrowDown size={10} />
            )
          ) : (
            <ArrowUp size={10} className="opacity-40" />
          )}
        </motion.span>
      </button>
    </th>
  )
}

/* ────────────────────── Rank badge ────────────────────── */

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex items-center gap-1 text-cyber-amber font-display font-semibold">
        <Crown size={14} /> 01
      </span>
    )
  if (rank === 2)
    return (
      <span className="inline-flex items-center gap-1 text-slate-200 font-display font-semibold">
        <Medal size={14} /> 02
      </span>
    )
  if (rank === 3)
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 font-display font-semibold">
        <Medal size={14} /> 03
      </span>
    )
  return (
    <span className="text-slate-500 font-mono text-xs">
      #{String(rank).padStart(2, '0')}
    </span>
  )
}

/* ────────────────────── Score cell (animated count-up) ────────────────────── */

function ScoreCell({ rank, score }: { rank: number; score: number }) {
  const n = useCountUp(score, 1200)
  const tone =
    rank === 1
      ? 'text-cyber-amber glow-text'
      : rank === 2
      ? 'text-slate-200'
      : rank === 3
      ? 'text-amber-600'
      : 'text-cyber-cyan'
  return (
    <span className={`font-display font-bold text-lg tabular-nums ${tone}`}>
      {n.toLocaleString()}
    </span>
  )
}

/* ────────────────────── HUD corners for table frame ────────────────────── */

function HudCorners() {
  const s = 'absolute w-4 h-4 border-cyber-cyan/60'
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      <span className={`${s} top-1.5 left-1.5 border-t-2 border-l-2`} />
      <span className={`${s} top-1.5 right-1.5 border-t-2 border-r-2`} />
      <span className={`${s} bottom-1.5 left-1.5 border-b-2 border-l-2`} />
      <span className={`${s} bottom-1.5 right-1.5 border-b-2 border-r-2`} />
    </div>
  )
}

/* ────────────────────── Helpers ────────────────────── */

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All Teams' },
  { value: 'junior', label: 'The Mystery Squad' },
  { value: 'senior', label: 'The Mystery Masters' },
]

// Fallback demo data when Supabase isn't configured.
const SAMPLE_DEMO: LeaderboardEntry[] = [
  { id: 'd1', team_name: 'DEMO · Null Pointer',   track: 'senior', score: 487, completion_time: '2026-02-14T13:42:00Z', status: 'Case 04 cleared', is_demo: true, updated_at: '2026-02-14T13:42:00Z' },
  { id: 'd2', team_name: 'DEMO · GhostProtocol',  track: 'senior', score: 463, completion_time: '2026-02-14T14:11:00Z', status: 'Case 02 cleared', is_demo: true, updated_at: '2026-02-14T14:11:00Z' },
  { id: 'd3', team_name: 'DEMO · Sentinel',       track: 'junior', score: 431, completion_time: '2026-02-14T13:58:00Z', status: 'Case 05 cleared', is_demo: true, updated_at: '2026-02-14T13:58:00Z' },
  { id: 'd4', team_name: 'DEMO · Shadow Coders',  track: 'senior', score: 414, completion_time: '2026-02-14T15:03:00Z', status: 'In progress',     is_demo: true, updated_at: '2026-02-14T15:03:00Z' },
  { id: 'd5', team_name: 'DEMO · Byte Busters',   track: 'junior', score: 387, completion_time: '2026-02-14T15:11:00Z', status: 'In progress',     is_demo: true, updated_at: '2026-02-14T15:11:00Z' },
  { id: 'd6', team_name: 'DEMO · Watchdogs',      track: 'junior', score: 354, completion_time: null,                   status: 'In progress',     is_demo: true, updated_at: '2026-02-14T15:30:00Z' },
  { id: 'd7', team_name: 'DEMO · Zero Cool',      track: 'senior', score: 302, completion_time: null,                   status: 'In progress',     is_demo: true, updated_at: '2026-02-14T15:45:00Z' },
]
