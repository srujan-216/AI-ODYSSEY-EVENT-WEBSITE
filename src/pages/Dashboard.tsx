import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Coins,
  ExternalLink,
  FileSearch,
  Fingerprint,
  Loader2,
  Lock,
  RotateCw,
  Search,
  Sparkles,
} from 'lucide-react'
import { Wheel, computeTargetRotation } from '../components/Wheel'
import { CoinToss } from '../components/CoinToss'
import {
  getCase,
  getCases,
  labelFor,
  TRACK_DESCRIPTION,
  TRACK_DIFFICULTY,
  TRACK_LABEL,
  TRACK_MECHANISM,
  TRACK_POOL_SIZE,
} from '../lib/cases'
import type { Track, TeamAssignment } from '../lib/types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

export function Dashboard() {
  const { track } = useParams<{ track: string }>()
  if (track !== 'junior' && track !== 'senior') {
    return <Navigate to="/tracks" replace />
  }
  return <DashboardFor track={track} key={track} />
}

function DashboardFor({ track }: { track: Track }) {
  const cases = useMemo(() => getCases(track), [track])
  const mechanism = TRACK_MECHANISM[track]
  const trackDifficulty = TRACK_DIFFICULTY[track]
  const poolSize = TRACK_POOL_SIZE[track]
  const toast = useToast()

  const [teamName, setTeamName] = useState('')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [assignment, setAssignment] = useState<TeamAssignment | null>(null)
  const [assignments, setAssignments] = useState<TeamAssignment[]>([])
  const [solvedCases, setSolvedCases] = useState<Set<number>>(new Set())
  const [lookupBusy, setLookupBusy] = useState(false)
  const [landedIndex, setLandedIndex] = useState<number | null>(null)
  const [isDemoAssignment, setIsDemoAssignment] = useState(false)

  const activeAssignments = useMemo(
    () => assignments.filter((a) => !solvedCases.has(a.case_number)),
    [assignments, solvedCases],
  )
  const hasActiveCase = activeAssignments.length > 0
  const allCasesDealt = assignments.length >= cases.length

  const refreshTeamState = async (nameLower: string) => {
    if (!isSupabaseConfigured) return
    const [{ data: assigns }, { data: results }] = await Promise.all([
      supabase
        .from('team_assignments')
        .select('*')
        .eq('team_name_lower', nameLower)
        .eq('track', track)
        .order('assigned_at', { ascending: false }),
      supabase
        .from('results')
        .select('case_number,is_solved')
        .eq('team_name_lower', nameLower)
        .eq('track', track),
    ])
    const solved = new Set<number>(
      (results ?? [])
        .filter((r: { is_solved: boolean | null }) => r.is_solved === true)
        .map((r: { case_number: number }) => r.case_number),
    )
    setSolvedCases(solved)
    if (assigns && assigns.length > 0) {
      const rows = assigns as TeamAssignment[]
      setAssignments(rows)
      setAssignment(rows[0])
      const idx = cases.findIndex((c) => c.number === rows[0].case_number)
      if (idx >= 0) {
        if (mechanism === 'wheel') {
          const final = computeTargetRotation(0, idx, cases.length)
          setRotation(final % 360)
        }
        setLandedIndex(idx)
      }
    } else {
      setAssignments([])
      setAssignment(null)
    }
  }

  useEffect(() => {
    if (!teamName.trim() || !isSupabaseConfigured) return
    const q = teamName.trim().toLowerCase()
    const t = setTimeout(() => refreshTeamState(q), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamName, track])

  // Live unlock: when the admin records this team's submission, the wheel /
  // coin re-opens without a page reload.
  useEffect(() => {
    if (!teamName.trim() || !isSupabaseConfigured) return
    const q = teamName.trim().toLowerCase()
    const ch = supabase
      .channel(`dashboard-${track}-${q}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results' },
        (payload: {
          new?: { team_name_lower?: string; track?: string }
          old?: { team_name_lower?: string; track?: string }
        }) => {
          const n = payload.new ?? payload.old
          if (!n) return
          if (n.team_name_lower === q && n.track === track) refreshTeamState(q)
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_assignments' },
        (payload: {
          new?: { team_name_lower?: string; track?: string }
          old?: { team_name_lower?: string; track?: string }
        }) => {
          const n = payload.new ?? payload.old
          if (!n) return
          if (n.team_name_lower === q && n.track === track) refreshTeamState(q)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamName, track])

  const deal = async () => {
    const name = teamName.trim()
    if (!name) {
      toast.push('Enter your team call-sign first.', 'error')
      return
    }
    if (name.length < 2 || name.length > 60) {
      toast.push('Team name must be 2–60 characters.', 'error')
      return
    }
    if (hasActiveCase) {
      const open = activeAssignments.map((a) => labelFor(a.case_number)).join(', ')
      toast.push(
        `Finish ${open} first — hand the report to a coordinator before dealing another.`,
        'error',
      )
      return
    }
    if (allCasesDealt) {
      toast.push(`All ${poolSize} cases on this track are already dealt to your team.`, 'info')
      return
    }

    setLandedIndex(null)
    setSpinning(true)

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const settleMs = reduceMotion ? 60 : mechanism === 'wheel' ? 5700 : 2200

    // Demo-mode: no backend — pick locally within the track's pool.
    if (!isSupabaseConfigured) {
      const alreadyDealt = new Set(assignments.map((a) => a.case_number))
      const remaining = cases.filter((c) => !alreadyDealt.has(c.number))
      const pick =
        remaining.length > 0
          ? remaining[Math.floor(Math.random() * remaining.length)]
          : cases[Math.floor(Math.random() * cases.length)]
      const idx = cases.findIndex((c) => c.number === pick.number)

      const assigned: TeamAssignment = {
        id: `demo-${Date.now()}`,
        team_name: name,
        track,
        case_number: pick.number,
        difficulty: trackDifficulty,
        assigned_at: new Date().toISOString(),
      }
      if (mechanism === 'wheel') {
        const target = computeTargetRotation(rotation, idx, cases.length)
        setRotation(target)
      }
      setTimeout(() => {
        setAssignment(assigned)
        setAssignments((prev) => [assigned, ...prev.filter((a) => a.case_number !== assigned.case_number)])
        setIsDemoAssignment(true)
        setSpinning(false)
        setLandedIndex(idx)
        toast.push(
          mechanism === 'wheel'
            ? 'Demo spin — connect Supabase to persist real assignments.'
            : 'Demo toss — connect Supabase to persist real assignments.',
          'info',
        )
      }, settleMs)
      return
    }

    try {
      const { data, error } = await supabase.rpc('assign_case', {
        p_team_name: name,
        p_track: track,
      })
      if (error) throw error
      if (!data || typeof data !== 'object') throw new Error('Empty response from server')
      const row = Array.isArray(data) ? data[0] : data
      const assigned = row as TeamAssignment
      const idx = cases.findIndex((c) => c.number === assigned.case_number)

      if (mechanism === 'wheel' && idx >= 0) {
        const target = computeTargetRotation(rotation, idx, cases.length)
        setRotation(target)
      }
      setTimeout(() => {
        setAssignment(assigned)
        setAssignments((prev) => [assigned, ...prev.filter((a) => a.case_number !== assigned.case_number)])
        setIsDemoAssignment(false)
        setSpinning(false)
        setLandedIndex(idx)
        toast.push(`Case ${labelFor(assigned.case_number)} assigned!`, 'success')
      }, settleMs)
    } catch (e: any) {
      setSpinning(false)
      toast.push(e?.message || 'Could not assign a case. Please contact a coordinator.', 'error')
    }
  }

  const lookup = async () => {
    const q = teamName.trim()
    if (!q) return
    if (!isSupabaseConfigured) return
    setLookupBusy(true)
    try {
      await refreshTeamState(q.toLowerCase())
      toast.push("Reloaded this team's assignments.", 'success')
    } finally {
      setLookupBusy(false)
    }
  }

  const assignedCase = assignment ? getCase(track, assignment.case_number) : null
  const tone: 'red' | 'cyan' = track === 'junior' ? 'cyan' : 'red'
  const toneColor = tone === 'red' ? '#dc2626' : '#06b6d4'

  const dealVerb = mechanism === 'wheel' ? 'Spin' : 'Toss'
  const dealLabel =
    mechanism === 'wheel' ? 'Spin the wheel' : 'Toss the coin'

  return (
    <section className="relative overflow-hidden grain">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 relative z-10">
        {/* ────── CASE HEADER ────── */}
        <div className="flex items-start justify-between flex-wrap gap-4 sm:gap-6 mb-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-x-3 gap-y-1 text-[0.6rem] sm:text-[0.65rem] font-mono tracking-[0.3em] uppercase text-stone-400 flex-wrap">
              <span className="w-2 h-2 bg-red-500 rounded-full breath" />
              <span>Case intake</span>
              <span className="text-stone-600 hidden sm:inline">/</span>
              <span className={tone === 'red' ? 'text-red-500' : 'text-cyan-500'}>
                {TRACK_LABEL[track]}
              </span>
              <span className="text-stone-600 hidden sm:inline">/</span>
              <span>
                {poolSize} {trackDifficulty} {poolSize === 1 ? 'case' : 'cases'}
              </span>
            </div>
            <h1 className="font-serif italic text-stone-50 text-3xl sm:text-4xl md:text-5xl mt-3 leading-[1.05]">
              Investigation <span className="scribble">dashboard</span>.
            </h1>
            <p className="mt-3 text-stone-400 max-w-xl text-sm leading-relaxed">
              {TRACK_DESCRIPTION[track]}
            </p>
          </div>
          <span
            className="stamp stamp-tilt mt-1 shrink-0 hidden sm:inline-block"
            style={{ fontSize: '0.75rem' }}
          >
            {trackDifficulty === 'hard' ? 'Hard · α' : 'Easy · α'}
          </span>
        </div>

        {/* ────── TWO-COLUMN BOARD ────── */}
        <div className="grid gap-10 lg:grid-cols-[1.1fr,420px] items-start">
          {/* LEFT — INTAKE FORM + ASSIGNMENT REVEAL */}
          <div className="space-y-8 order-2 lg:order-1">
            {/* Intake form (paper) */}
            <div className="paper rounded-sm p-6 md:p-8 relative">
              <span className="tape tape-red" style={{ top: -10, left: 32 }} />
              <span
                className="absolute top-5 right-5 stamp stamp-tilt"
                style={{ fontSize: '0.6rem' }}
              >
                Form · 02
              </span>

              <div className="font-mono text-[0.6rem] tracking-widest uppercase text-stone-600">
                Intake · field 01
              </div>
              <label
                htmlFor="teamName"
                className="font-serif italic text-stone-900 text-2xl leading-tight block mt-1"
              >
                Team call-sign
              </label>
              <div className="mt-4 flex gap-2">
                <input
                  id="teamName"
                  className="flex-1 bg-transparent border-b-2 border-dashed border-stone-900/50 focus:border-red-600 focus:outline-none px-1 py-2 text-stone-900 placeholder:text-stone-500 font-serif italic text-xl transition-colors"
                  placeholder="e.g. GhostProtocol"
                  autoComplete="off"
                  maxLength={60}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  disabled={spinning}
                />
                <button
                  type="button"
                  onClick={lookup}
                  disabled={!teamName.trim() || spinning || lookupBusy}
                  className="shrink-0 bg-stone-900 text-stone-50 px-3 py-2 font-display tracking-widest uppercase text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
                  title="Recover an existing assignment"
                >
                  {lookupBusy ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                </button>
              </div>
              <p className="mt-3 text-stone-700 text-xs font-serif italic">
                — use the same call-sign your team registered under.
              </p>

              <div className="mt-6 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[0.55rem] tracking-widest uppercase text-stone-500">
                  Status
                </span>
                <StatusChip
                  status={
                    spinning
                      ? 'routing'
                      : assignment
                      ? 'sealed'
                      : teamName.trim().length >= 2
                      ? 'ready'
                      : 'await'
                  }
                />
              </div>

              {/* Single deal button — spin for juniors, toss for seniors. */}
              <div className="relative mt-6">
                {!spinning &&
                  !allCasesDealt &&
                  !hasActiveCase &&
                  teamName.trim().length >= 2 && (
                    <span
                      aria-hidden
                      className="absolute inset-[-6px] rounded-sm blur-xl breath pointer-events-none bg-red-500/30"
                    />
                  )}
                <button
                  onClick={deal}
                  disabled={spinning || allCasesDealt || hasActiveCase}
                  className="relative w-full bg-stone-900 text-stone-50 py-5 font-display tracking-[0.3em] uppercase text-sm font-bold overflow-hidden border-2 border-stone-900 hover:bg-red-600 hover:border-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  style={{
                    clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
                  }}
                >
                  <span className="relative inline-flex items-center gap-3 justify-center">
                    {spinning ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        {mechanism === 'wheel' ? 'Dealing next case…' : 'Coin airborne…'}
                      </>
                    ) : hasActiveCase ? (
                      <>
                        <Lock size={16} />
                        Case {labelFor(activeAssignments[0].case_number)} active · submit first
                      </>
                    ) : allCasesDealt ? (
                      <>
                        <FileSearch size={18} /> All {poolSize} cases dealt
                      </>
                    ) : assignments.length > 0 ? (
                      <>
                        {mechanism === 'wheel' ? <Sparkles size={18} /> : <Coins size={18} />}
                        {dealVerb} again ({assignments.length}/{poolSize})
                        {mechanism === 'wheel' ? (
                          <RotateCw
                            size={16}
                            className="opacity-80 transition-transform group-hover:rotate-180 duration-700"
                          />
                        ) : null}
                      </>
                    ) : (
                      <>
                        {mechanism === 'wheel' ? <Sparkles size={18} /> : <Coins size={18} />}
                        {dealLabel}
                        {mechanism === 'wheel' ? (
                          <RotateCw
                            size={16}
                            className="opacity-80 transition-transform group-hover:rotate-180 duration-700"
                          />
                        ) : null}
                      </>
                    )}
                  </span>
                </button>
                <p className="text-[0.62rem] text-stone-600 mt-2 text-center tracking-widest uppercase font-mono">
                  {spinning
                    ? mechanism === 'wheel'
                      ? '> routing through intelligence… <'
                      : '> coin airborne… <'
                    : hasActiveCase
                    ? `> locked — hand in ${labelFor(activeAssignments[0].case_number)} first <`
                    : allCasesDealt
                    ? `> all ${poolSize} cases assigned to this team <`
                    : assignments.length > 0
                    ? `> ${assignments.length}/${poolSize} dealt · press to deal the next case <`
                    : teamName.trim().length < 2
                    ? '> awaiting call-sign <'
                    : '> press to deploy <'}
                </p>

                {/* Active-case lockout notice */}
                {hasActiveCase && (
                  <div className="mt-4 rounded-sm border border-amber-600/60 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
                    <Lock size={14} className="text-amber-700 mt-0.5 shrink-0" />
                    <div className="text-xs text-stone-800 leading-relaxed">
                      <div className="font-display font-bold tracking-widest uppercase text-amber-800 text-[0.65rem]">
                        One case at a time
                      </div>
                      <p className="mt-1 font-serif italic text-stone-900">
                        Your team is still on{' '}
                        <span className="font-bold">
                          Case {labelFor(activeAssignments[0].case_number)}
                          {activeAssignments.length > 1
                            ? ` (+${activeAssignments.length - 1} more)`
                            : ''}
                        </span>
                        . Hand the report to a coordinator — the {mechanism === 'wheel' ? 'wheel' : 'coin'}{' '}
                        re-opens the moment they record your submission.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Case selector if multiple cases dealt */}
            {assignments.length > 1 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[0.6rem] font-mono tracking-widest uppercase text-stone-400">
                  Dealt files:
                </span>
                {assignments.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setAssignment(a)
                      const idx = cases.findIndex((c) => c.number === a.case_number)
                      if (idx >= 0) {
                        if (mechanism === 'wheel') {
                          setRotation(computeTargetRotation(0, idx, cases.length) % 360)
                        }
                        setLandedIndex(idx)
                      }
                    }}
                    className={`px-3 py-1 text-xs font-mono rounded transition-all border ${
                      assignment?.id === a.id
                        ? 'bg-red-600 text-white border-red-500 shadow-sm'
                        : 'bg-stone-900/80 text-stone-400 border-stone-800 hover:text-white hover:border-stone-600'
                    }`}
                  >
                    {labelFor(a.case_number)}
                  </button>
                ))}
              </div>
            )}

            {/* Case reveal */}
            {assignment && assignedCase && (
              <CaseReveal
                assignment={assignment}
                assignedCase={assignedCase}
                track={track}
                isDemo={isDemoAssignment}
              />
            )}

            {/* How to run the investigation */}
            <ol className="paper-dark rounded-sm p-6 md:p-8 relative space-y-4">
              <span className="absolute top-5 right-5 font-hand text-red-500 text-xl rotate-[6deg]">
                — read first.
              </span>
              <div className="font-mono text-[0.6rem] tracking-widest uppercase text-stone-500">
                Procedure
              </div>
              <h3 className="font-serif italic text-stone-50 text-2xl leading-tight">
                How to run your case.
              </h3>
              {procedureFor(mechanism).map((p, i) => (
                <li
                  key={p.title}
                  className="grid grid-cols-[auto,1fr] gap-4 pt-3 border-t border-stone-700/50"
                >
                  <span className="font-serif italic text-red-500 text-3xl leading-none tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="font-serif italic text-stone-50">{p.title}</div>
                    <p className="text-stone-400 text-sm mt-1 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* RIGHT — mechanism + case index */}
          <div className="order-1 lg:order-2 space-y-6">
            <div className="paper-dark rounded-sm px-5 pt-6 pb-6 relative isolate">
              <span className="tape tape-cyan" style={{ top: -10, left: 20, zIndex: 2 }} />
              <div className="flex items-center justify-between mb-6 relative z-10 gap-2 flex-wrap">
                <div>
                  <div className="font-mono text-[0.6rem] tracking-widest uppercase text-stone-500">
                    {mechanism === 'wheel'
                      ? 'Case selector · Wheel'
                      : 'Case selector · Coin'}
                  </div>
                  <div className="font-serif italic text-stone-50 text-lg">
                    {mechanism === 'wheel' ? 'The server picks.' : 'Fate picks.'}
                  </div>
                </div>
                <StatusChip
                  status={spinning ? 'routing' : assignment ? 'sealed' : 'await'}
                />
              </div>

              {mechanism === 'wheel' ? (
                <Wheel
                  cases={cases}
                  rotation={rotation}
                  spinning={spinning}
                  color={tone === 'red' ? 'violet' : 'cyan'}
                  landedIndex={landedIndex}
                />
              ) : (
                <CoinToss
                  cases={cases}
                  spinning={spinning}
                  landedIndex={landedIndex}
                  color={tone === 'red' ? 'violet' : 'cyan'}
                />
              )}

              <p className="mt-5 text-center text-[0.62rem] tracking-widest uppercase font-mono text-stone-500">
                {mechanism === 'wheel'
                  ? 'the wheel just announces it.'
                  : 'the coin just announces it.'}
              </p>
            </div>

            {/* Case index — only this track's pool */}
            <div className="paper rounded-sm p-5 relative">
              <span className="tape tape-red" style={{ top: -10, right: 20 }} />
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="font-mono text-[0.6rem] tracking-widest uppercase text-stone-600">
                  Case index · {cases.length} {trackDifficulty} {cases.length === 1 ? 'file' : 'files'}
                </div>
                <span
                  className={`font-mono tracking-widest uppercase text-[0.55rem] px-2 py-0.5 border ${
                    trackDifficulty === 'hard'
                      ? 'border-red-700/60 text-red-700 bg-red-700/5'
                      : 'border-emerald-800/50 text-emerald-800 bg-emerald-700/5'
                  }`}
                >
                  {trackDifficulty === 'hard' ? 'Hard pool' : 'Easy pool'}
                </span>
              </div>

              <ul className="space-y-1.5">
                {cases.map((c) => {
                  const isMine = assignment?.case_number === c.number
                  const assignedToTeam = assignments.some(
                    (a) => a.case_number === c.number,
                  )
                  const solved = solvedCases.has(c.number)
                  const active = assignedToTeam && !solved
                  return (
                    <li
                      key={c.number}
                      className={`flex items-center justify-between gap-3 px-3 py-2 border transition-colors ${
                        active
                          ? 'border-amber-600 bg-amber-500/15 text-stone-900'
                          : solved
                          ? 'border-emerald-700/60 bg-emerald-600/10 text-stone-900'
                          : isMine
                          ? 'border-red-600 bg-red-600/10 text-stone-900'
                          : 'border-stone-900/15 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            active
                              ? 'text-amber-700 font-bold'
                              : solved
                              ? 'text-emerald-800 font-bold'
                              : isMine
                              ? 'text-red-600 font-bold'
                              : 'text-stone-500'
                          }`}
                        >
                          #{c.label}
                        </span>
                        <span className="font-serif italic text-sm truncate">
                          {c.title}
                        </span>
                      </div>
                      {active ? (
                        <span className="shrink-0 font-mono tracking-widest uppercase text-[0.5rem] px-1.5 py-0.5 border border-amber-700 bg-amber-500/40 text-amber-900 font-bold">
                          Active
                        </span>
                      ) : solved ? (
                        <span className="shrink-0 font-mono tracking-widest uppercase text-[0.5rem] px-1.5 py-0.5 border border-emerald-800 bg-emerald-600/40 text-emerald-900 font-bold">
                          Cleared
                        </span>
                      ) : isMine ? (
                        <span className="stamp shrink-0" style={{ fontSize: '0.5rem', padding: '0.08em 0.3em' }}>
                          Yours
                        </span>
                      ) : (
                        <Fingerprint size={11} className="text-stone-500 shrink-0" />
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative background wordmark */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      >
        <div
          className="absolute top-[20%] -left-[20%] font-display font-black text-stone-100/[0.025] whitespace-nowrap"
          style={{
            fontSize: 'clamp(18rem, 36vw, 42rem)',
            letterSpacing: '-0.05em',
            color: toneColor,
            opacity: 0.03,
          }}
        >
          DOSSIER
        </div>
      </div>
    </section>
  )
}

/* ───────────────── Case reveal ───────────────── */

interface RevealProps {
  assignment: TeamAssignment
  assignedCase: NonNullable<ReturnType<typeof getCase>>
  track: Track
  isDemo: boolean
}

function CaseReveal({ assignment, assignedCase, track, isDemo }: RevealProps) {
  const hard = assignedCase.difficulty === 'hard'
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96, rotate: -1 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: -1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      className="paper rounded-sm p-5 sm:p-7 relative torn-bottom pb-14"
    >
      <span className="tape tape-red" style={{ top: -10, left: 60 }} />
      <span className="tape tape-violet" style={{ top: -10, right: 60, transform: 'rotate(4deg)' }} />
      <div className="flex md:absolute md:top-6 md:right-6 items-center gap-2 justify-end mb-3 md:mb-0">
        <span className="stamp stamp-tilt" style={{ fontSize: '0.65rem' }}>
          Classified
        </span>
        <span
          className="stamp stamp-tilt"
          style={{
            fontSize: '0.55rem',
            padding: '0.1em 0.4em',
            color: hard ? '#7f1d1d' : '#064e3b',
            borderColor: hard ? '#7f1d1d' : '#064e3b',
          }}
        >
          {hard ? 'Hard' : 'Easy'}
        </span>
        {isDemo && (
          <span
            className="stamp"
            style={{
              fontSize: '0.55rem',
              padding: '0.1em 0.4em',
              color: '#b45309',
              borderColor: '#b45309',
            }}
          >
            Demo
          </span>
        )}
      </div>

      <div className="font-mono text-[0.6rem] tracking-widest uppercase text-stone-600">
        Dossier · AI-ODY/{assignedCase.label}-α
      </div>
      <h3 className="font-serif italic text-stone-900 text-2xl sm:text-3xl md:text-4xl leading-tight mt-2 break-words">
        Case {assignedCase.label} — {assignedCase.title}
      </h3>
      <div className="mt-2 font-hand text-red-600 text-lg sm:text-xl break-words">
        — assigned to Team "{assignment.team_name}".
      </div>

      <dl className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-stone-900/15">
        <Meta label="Case ID">
          AI-ODY-{track === 'junior' ? 'JR' : 'AD'}-{assignedCase.label}
        </Meta>
        <Meta label="Division">{TRACK_LABEL[track]}</Meta>
        <Meta label="Sealed">
          {new Date(assignment.assigned_at).toLocaleString(undefined, {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Meta>
        <Meta label="Report due">48 h from brief</Meta>
      </dl>

      <div className="mt-6 pt-5 border-t border-stone-900/15">
        <div className="font-mono text-[0.6rem] tracking-widest uppercase text-stone-600 mb-2">
          Opening lead
        </div>
        {assignedCase.tagline && (
          <p className="font-serif italic text-stone-900 text-base md:text-lg leading-relaxed">
            {assignedCase.tagline}
          </p>
        )}
        <p className="mt-3 font-serif text-stone-700 text-sm leading-relaxed">
          Every other hint is inside the sealed PDF — timestamps, trace
          fragments, redactions, cross-references. Walk the timeline, build
          the report, hand it to a coordinator.
        </p>
      </div>

      <div className="mt-7">
        <a
          href={assignedCase.pdfPath}
          target="_blank"
          rel="noreferrer"
          className="group w-full inline-flex items-center justify-center gap-3 bg-stone-900 text-stone-50 py-4 font-display font-bold tracking-widest uppercase text-xs transition-colors hover:bg-red-600"
          style={{
            clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
          }}
        >
          <ExternalLink size={14} /> Open sealed PDF
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </a>
      </div>

      <div className="mt-4 rounded-sm border border-red-600/60 bg-red-600/10 px-4 py-3 flex items-start gap-3">
        <FileSearch size={14} className="text-red-600 mt-0.5 shrink-0" />
        <div className="text-xs text-stone-800 leading-relaxed">
          <div className="font-display font-bold tracking-widest uppercase text-red-700 text-[0.65rem]">
            Reports are submitted offline
          </div>
          <p className="mt-1 font-serif italic text-stone-900">
            This site does not accept written reports. Hand the final report
            to a coordinator in person. Verified scores land on the public
            leaderboard once coordinators record them.
          </p>
        </div>
      </div>

      <p className="mt-3 text-center font-hand text-stone-700 text-base">
        — PDF opens in a new tab. If it 404s, your coordinator hasn't uploaded{' '}
        <code className="font-mono text-xs">{assignedCase.pdfPath}</code> yet.
      </p>
    </motion.div>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[0.55rem] tracking-widest uppercase text-stone-500">
        {label}
      </div>
      <div className="mt-1 font-serif italic text-stone-900 text-base">
        {children}
      </div>
    </div>
  )
}

/* ───────────────── Status chip ───────────────── */

function StatusChip({ status }: { status: 'await' | 'ready' | 'routing' | 'sealed' }) {
  const map: Record<typeof status, { label: string; cls: string }> = {
    await: { label: 'Awaiting', cls: 'bg-stone-500/10 text-stone-400 border-stone-500/50' },
    ready: { label: 'Ready', cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/50' },
    routing: { label: 'Routing', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/50' },
    sealed: { label: 'Sealed', cls: 'bg-red-500/15 text-red-300 border-red-500/50' },
  }
  const s = map[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[0.6rem] tracking-widest uppercase font-mono border ${s.cls}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}

/* ───────────────── Procedure data ───────────────── */

function procedureFor(mechanism: 'wheel' | 'coin') {
  const first =
    mechanism === 'wheel'
      ? {
          title: 'Spin the wheel.',
          desc: 'The server deals you a random easy case from the pool. Only one case at a time — spin again after you submit.',
        }
      : {
          title: 'Toss the coin.',
          desc: 'The server picks one of the two hard cases. Only one case at a time — toss again after you submit.',
        }
  return [
    first,
    {
      title: 'Open the sealed PDF.',
      desc: 'Every hint on your case is in that one brief — timestamps, trace fragments, redacted lines, cross-references.',
    },
    {
      title: 'Follow the hints offline.',
      desc: 'Nothing on this site evaluates your answer. Work the case in your team — code, notes, whiteboard, whatever helps.',
    },
    {
      title: 'Submit the report.',
      desc: 'Hand the written report to a coordinator. Once they record it, the mechanism re-opens for your next pick.',
    },
  ]
}
