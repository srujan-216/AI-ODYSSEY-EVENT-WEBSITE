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
  CASE_COUNT,
  EASY_COUNT,
  HARD_COUNT,
  difficultyFor,
  getCase,
  getCases,
  getEasyCases,
  getHardCases,
  TRACK_DESCRIPTION,
  TRACK_LABEL,
} from '../lib/cases'
import type { Difficulty, Track, TeamAssignment } from '../lib/types'
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
  const easyCases = useMemo(() => getEasyCases(track), [track])
  const hardCases = useMemo(() => getHardCases(track), [track])
  const toast = useToast()

  const [teamName, setTeamName] = useState('')
  const [mode, setMode] = useState<Difficulty>('easy')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [assignment, setAssignment] = useState<TeamAssignment | null>(null)
  const [assignments, setAssignments] = useState<TeamAssignment[]>([])
  const [solvedCases, setSolvedCases] = useState<Set<number>>(new Set())
  const [lookupBusy, setLookupBusy] = useState(false)
  const [wheelLanded, setWheelLanded] = useState<number | null>(null)
  const [coinLanded, setCoinLanded] = useState<number | null>(null)
  const [isDemoAssignment, setIsDemoAssignment] = useState(false)

  const activeAssignments = useMemo(
    () => assignments.filter((a) => !solvedCases.has(a.case_number)),
    [assignments, solvedCases],
  )
  const hasActiveCase = activeAssignments.length > 0
  const allCasesDealt = assignments.length >= cases.length
  const easyExhausted =
    assignments.filter((a) => a.case_number >= 1 && a.case_number <= EASY_COUNT).length >= EASY_COUNT
  const hardExhausted =
    assignments.filter((a) => a.case_number > EASY_COUNT).length >= HARD_COUNT

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
      syncLanded(rows[0].case_number)
    } else {
      setAssignments([])
      setAssignment(null)
    }
  }

  // Snap both visualisations to a case so the recovered assignment lines up.
  const syncLanded = (caseNumber: number) => {
    if (caseNumber <= EASY_COUNT) {
      const idx = easyCases.findIndex((c) => c.number === caseNumber)
      if (idx >= 0) {
        const final = computeTargetRotation(0, idx, easyCases.length)
        setRotation(final % 360)
        setWheelLanded(idx)
      }
      setMode('easy')
    } else {
      const idx = hardCases.findIndex((c) => c.number === caseNumber)
      if (idx >= 0) setCoinLanded(idx)
      setMode('hard')
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

  const deal = async (difficulty: Difficulty) => {
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
      const open = activeAssignments.map((a) => labelOf(a.case_number)).join(', ')
      toast.push(
        `Finish ${open} first — hand the report to a coordinator before dealing another.`,
        'error',
      )
      return
    }
    if (difficulty === 'easy' && easyExhausted) {
      toast.push('All 5 easy cases are already dealt to your team.', 'info')
      return
    }
    if (difficulty === 'hard' && hardExhausted) {
      toast.push('Both hard cases are already dealt to your team.', 'info')
      return
    }

    setMode(difficulty)
    if (difficulty === 'easy') setWheelLanded(null)
    else setCoinLanded(null)
    setSpinning(true)

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const settleMs = reduceMotion ? 60 : difficulty === 'easy' ? 5700 : 2200

    // Demo-mode: no backend — pick locally within the right pool.
    if (!isSupabaseConfigured) {
      const pool = difficulty === 'easy' ? easyCases : hardCases
      const alreadyDealt = new Set(
        assignments
          .filter((a) => difficultyFor(a.case_number) === difficulty)
          .map((a) => a.case_number),
      )
      const remaining = pool.filter((c) => !alreadyDealt.has(c.number))
      const pick = remaining.length > 0
        ? remaining[Math.floor(Math.random() * remaining.length)]
        : pool[Math.floor(Math.random() * pool.length)]

      const assigned: TeamAssignment = {
        id: `demo-${Date.now()}`,
        team_name: name,
        track,
        case_number: pick.number,
        difficulty,
        assigned_at: new Date().toISOString(),
      }
      if (difficulty === 'easy') {
        const idx = easyCases.findIndex((c) => c.number === pick.number)
        const target = computeTargetRotation(rotation, idx, easyCases.length)
        setRotation(target)
        setTimeout(() => {
          setAssignment(assigned)
          setAssignments((prev) => [assigned, ...prev.filter((a) => a.case_number !== assigned.case_number)])
          setIsDemoAssignment(true)
          setSpinning(false)
          setWheelLanded(idx)
          toast.push('Demo spin — connect Supabase to persist real assignments.', 'info')
        }, settleMs)
      } else {
        const idx = hardCases.findIndex((c) => c.number === pick.number)
        setTimeout(() => {
          setAssignment(assigned)
          setAssignments((prev) => [assigned, ...prev.filter((a) => a.case_number !== assigned.case_number)])
          setIsDemoAssignment(true)
          setSpinning(false)
          setCoinLanded(idx)
          toast.push('Demo toss — connect Supabase to persist real assignments.', 'info')
        }, settleMs)
      }
      return
    }

    try {
      const { data, error } = await supabase.rpc('assign_case', {
        p_team_name: name,
        p_track: track,
        p_difficulty: difficulty,
      })
      if (error) throw error
      if (!data || typeof data !== 'object') throw new Error('Empty response from server')
      const row = Array.isArray(data) ? data[0] : data
      const assigned = row as TeamAssignment

      if (difficulty === 'easy') {
        const idx = easyCases.findIndex((c) => c.number === assigned.case_number)
        const target = computeTargetRotation(rotation, idx, easyCases.length)
        setRotation(target)
        setTimeout(() => {
          setAssignment(assigned)
          setAssignments((prev) => [assigned, ...prev.filter((a) => a.case_number !== assigned.case_number)])
          setIsDemoAssignment(false)
          setSpinning(false)
          setWheelLanded(idx)
          toast.push(`Case ${labelOf(assigned.case_number)} assigned!`, 'success')
        }, settleMs)
      } else {
        const idx = hardCases.findIndex((c) => c.number === assigned.case_number)
        setTimeout(() => {
          setAssignment(assigned)
          setAssignments((prev) => [assigned, ...prev.filter((a) => a.case_number !== assigned.case_number)])
          setIsDemoAssignment(false)
          setSpinning(false)
          setCoinLanded(idx)
          toast.push(`Case ${labelOf(assigned.case_number)} assigned!`, 'success')
        }, settleMs)
      }
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
      toast.push('Reloaded this team\'s assignments.', 'success')
    } finally {
      setLookupBusy(false)
    }
  }

  const assignedCase = assignment ? getCase(track, assignment.case_number) : null
  const tone: 'red' | 'cyan' = track === 'junior' ? 'cyan' : 'red'
  const toneColor = tone === 'red' ? '#dc2626' : '#06b6d4'

  const easyDealtCount = assignments.filter((a) => a.case_number <= EASY_COUNT).length
  const hardDealtCount = assignments.filter((a) => a.case_number > EASY_COUNT).length

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
                {EASY_COUNT} easy · {HARD_COUNT} hard
              </span>
            </div>
            <h1 className="font-serif italic text-stone-50 text-3xl sm:text-4xl md:text-5xl mt-3 leading-[1.05]">
              Investigation <span className="scribble">dashboard</span>.
            </h1>
            <p className="mt-3 text-stone-400 max-w-xl text-sm leading-relaxed">
              {TRACK_DESCRIPTION[track]} Easy cases on the wheel, hard cases
              behind the coin. One case active at a time — hand the report
              to a coordinator before dealing another.
            </p>
          </div>
          <span className="stamp stamp-tilt mt-1 shrink-0 hidden sm:inline-block" style={{ fontSize: '0.75rem' }}>
            Case Intake · α
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

              {/* ── Deal buttons: Spin for Easy / Toss for Hard ── */}
              <div className="relative mt-6 grid gap-3 sm:grid-cols-2">
                <DealButton
                  label="Spin for Easy"
                  sub={`${easyDealtCount}/${EASY_COUNT} dealt`}
                  disabled={spinning || hasActiveCase || easyExhausted}
                  active={mode === 'easy' && spinning}
                  tone="cyan"
                  onClick={() => deal('easy')}
                  icon={<RotateCw size={16} className="opacity-80" />}
                />
                <DealButton
                  label="Toss for Hard"
                  sub={`${hardDealtCount}/${HARD_COUNT} dealt`}
                  disabled={spinning || hasActiveCase || hardExhausted}
                  active={mode === 'hard' && spinning}
                  tone="red"
                  onClick={() => deal('hard')}
                  icon={<Coins size={16} className="opacity-80" />}
                />
              </div>
              <p className="text-[0.62rem] text-stone-600 mt-2 text-center tracking-widest uppercase font-mono">
                {spinning
                  ? mode === 'easy'
                    ? '> routing through intelligence… <'
                    : '> coin airborne… <'
                  : hasActiveCase
                  ? `> locked — hand in ${labelOf(activeAssignments[0].case_number)} first <`
                  : allCasesDealt
                  ? `> all ${CASE_COUNT} cases assigned to this team <`
                  : assignments.length > 0
                  ? `> ${assignments.length}/${CASE_COUNT} dealt · pick your next <`
                  : teamName.trim().length < 2
                  ? '> awaiting call-sign <'
                  : '> pick a mechanism to deploy <'}
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
                        Case {labelOf(activeAssignments[0].case_number)}
                        {activeAssignments.length > 1
                          ? ` (+${activeAssignments.length - 1} more)`
                          : ''}
                      </span>
                      . Hand the report to a coordinator — the wheel and coin
                      re-open the moment they record your submission.
                    </p>
                  </div>
                </div>
              )}
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
                      syncLanded(a.case_number)
                    }}
                    className={`px-3 py-1 text-xs font-mono rounded transition-all border ${
                      assignment?.id === a.id
                        ? 'bg-red-600 text-white border-red-500 shadow-sm'
                        : 'bg-stone-900/80 text-stone-400 border-stone-800 hover:text-white hover:border-stone-600'
                    }`}
                  >
                    {labelOf(a.case_number)}
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
              {PROCEDURE.map((p, i) => (
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
              <div className="flex items-center justify-between mb-4 relative z-10 gap-2 flex-wrap">
                <div>
                  <div className="font-mono text-[0.6rem] tracking-widest uppercase text-stone-500">
                    {mode === 'easy' ? 'Case selector · Wheel' : 'Case selector · Coin'}
                  </div>
                  <div className="font-serif italic text-stone-50 text-lg">
                    {mode === 'easy' ? 'The server picks.' : 'Fate picks.'}
                  </div>
                </div>
                <StatusChip
                  status={spinning ? 'routing' : assignment ? 'sealed' : 'await'}
                />
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2 mb-4 relative z-10">
                <button
                  onClick={() => setMode('easy')}
                  disabled={spinning}
                  className={`flex-1 py-2 text-[0.6rem] font-display tracking-widest uppercase border transition-colors ${
                    mode === 'easy'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-stone-900/60 border-stone-700 text-stone-400 hover:border-stone-500'
                  }`}
                >
                  <RotateCw size={11} className="inline mr-1" /> Wheel · {EASY_COUNT} easy
                </button>
                <button
                  onClick={() => setMode('hard')}
                  disabled={spinning}
                  className={`flex-1 py-2 text-[0.6rem] font-display tracking-widest uppercase border transition-colors ${
                    mode === 'hard'
                      ? 'bg-red-500/20 border-red-500 text-red-200'
                      : 'bg-stone-900/60 border-stone-700 text-stone-400 hover:border-stone-500'
                  }`}
                >
                  <Coins size={11} className="inline mr-1" /> Coin · {HARD_COUNT} hard
                </button>
              </div>

              {mode === 'easy' ? (
                <Wheel
                  cases={easyCases}
                  rotation={rotation}
                  spinning={spinning && mode === 'easy'}
                  color={tone === 'red' ? 'violet' : 'cyan'}
                  landedIndex={wheelLanded}
                />
              ) : (
                <CoinToss
                  cases={hardCases}
                  spinning={spinning && mode === 'hard'}
                  landedIndex={coinLanded}
                  color={tone === 'red' ? 'violet' : 'cyan'}
                />
              )}

              <p className="mt-5 text-center text-[0.62rem] tracking-widest uppercase font-mono text-stone-500">
                {mode === 'easy'
                  ? 'the wheel just announces it.'
                  : 'the coin just announces it.'}
              </p>
            </div>

            {/* Case index — easy on top, hard below */}
            <div className="paper rounded-sm p-5 relative">
              <span className="tape tape-red" style={{ top: -10, right: 20 }} />
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="font-mono text-[0.6rem] tracking-widest uppercase text-stone-600">
                  Case index · {CASE_COUNT} files
                </div>
                <div className="flex items-center gap-2 text-[0.55rem] font-mono tracking-widest uppercase">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                    <span className="text-stone-600">{EASY_COUNT} Easy</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-700" />
                    <span className="text-stone-600">{HARD_COUNT} Hard</span>
                  </span>
                </div>
              </div>

              <IndexGroup
                heading="Easy pool"
                items={easyCases}
                assignment={assignment}
                assignments={assignments}
                solvedCases={solvedCases}
              />
              <div className="mt-3" />
              <IndexGroup
                heading="Hard pool"
                items={hardCases}
                assignment={assignment}
                assignments={assignments}
                solvedCases={solvedCases}
              />
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

function labelOf(caseNumber: number): string {
  return caseNumber <= EASY_COUNT ? `E${caseNumber}` : `H${caseNumber - EASY_COUNT}`
}

/* ───────────────── Case index group ───────────────── */

interface GroupProps {
  heading: string
  items: ReturnType<typeof getCases>
  assignment: TeamAssignment | null
  assignments: TeamAssignment[]
  solvedCases: Set<number>
}

function IndexGroup({
  heading,
  items,
  assignment,
  assignments,
  solvedCases,
}: GroupProps) {
  return (
    <div>
      <div className="font-mono text-[0.55rem] tracking-widest uppercase text-stone-600 mb-2">
        {heading}
      </div>
      <ul className="space-y-1.5">
        {items.map((c) => {
          const isMine = assignment?.case_number === c.number
          const assignedToTeam = assignments.some((a) => a.case_number === c.number)
          const solved = solvedCases.has(c.number)
          const active = assignedToTeam && !solved
          const hard = c.difficulty === 'hard'
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
                <span className="font-serif italic text-sm truncate">{c.title}</span>
                <span
                  className={`shrink-0 font-mono tracking-widest uppercase text-[0.5rem] px-1.5 py-0.5 border ${
                    hard
                      ? 'border-red-700/60 text-red-700 bg-red-700/5'
                      : 'border-emerald-800/50 text-emerald-800 bg-emerald-700/5'
                  }`}
                >
                  {hard ? 'Hard' : 'Easy'}
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
  )
}

/* ───────────────── Deal button ───────────────── */

function DealButton({
  label,
  sub,
  icon,
  tone,
  disabled,
  active,
  onClick,
}: {
  label: string
  sub: string
  icon: React.ReactNode
  tone: 'cyan' | 'red'
  disabled: boolean
  active: boolean
  onClick: () => void
}) {
  const base =
    tone === 'red'
      ? 'bg-stone-900 hover:bg-red-600 hover:border-red-600 border-stone-900'
      : 'bg-stone-900 hover:bg-cyan-600 hover:border-cyan-600 border-stone-900'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full text-stone-50 py-4 font-display tracking-[0.2em] uppercase text-xs sm:text-sm font-bold overflow-hidden border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group ${base}`}
      style={{
        clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
      }}
    >
      <span className="relative inline-flex items-center gap-2 justify-center">
        {active ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {label}
        {icon}
      </span>
      <span className="block mt-1 text-[0.55rem] text-stone-400 tracking-widest uppercase">
        {sub}
      </span>
    </button>
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
          Synopsis — illustrative
        </div>
        <p className="font-serif italic text-stone-900 text-base md:text-lg leading-relaxed">
          The hints are inside the sealed PDF. Walk the timeline, run the
          traces, cross-reference the fragments. When your reasoning is tight,
          write the report and hand it to a coordinator.
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

const PROCEDURE = [
  {
    title: 'Pick a mechanism.',
    desc: 'Spin the wheel for an easy case, or toss the coin for a hard one. The server deals you an unassigned brief from that pool.',
  },
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
    desc: 'Hand the written report to a coordinator. Once they record it, the wheel and coin re-open for your next pick.',
  },
]
