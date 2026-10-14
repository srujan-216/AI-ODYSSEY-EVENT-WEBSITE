import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ExternalLink,
  FileSearch,
  Fingerprint,
  Loader2,
  RotateCw,
  Search,
  Sparkles,
} from 'lucide-react'
import { Wheel, computeTargetRotation } from '../components/Wheel'
import { getCase, getCases, TRACK_DESCRIPTION, TRACK_LABEL } from '../lib/cases'
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
  const toast = useToast()

  const [teamName, setTeamName] = useState('')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [assignment, setAssignment] = useState<TeamAssignment | null>(null)
  const [lookupBusy, setLookupBusy] = useState(false)
  const [landedIndex, setLandedIndex] = useState<number | null>(null)
  const [isDemoAssignment, setIsDemoAssignment] = useState(false)

  // Try to recover existing assignment on team-name change (debounced)
  useEffect(() => {
    if (!teamName.trim() || !isSupabaseConfigured) return
    const q = teamName.trim()
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('team_assignments')
        .select('*')
        .eq('team_name_lower', q.toLowerCase())
        .eq('track', track)
        .maybeSingle()
      if (data) {
        setAssignment(data as TeamAssignment)
        const idx = (data as TeamAssignment).case_number - 1
        const final = computeTargetRotation(0, idx, cases.length)
        setRotation(final % 360)
        setLandedIndex(idx)
      } else {
        setAssignment(null)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [teamName, track, cases.length])

  const spin = async () => {
    const name = teamName.trim()
    if (!name) {
      toast.push('Enter your team call-sign first.', 'error')
      return
    }
    if (name.length < 2 || name.length > 60) {
      toast.push('Team name must be 2–60 characters.', 'error')
      return
    }
    if (assignment) {
      toast.push('Your team already has an assigned case.', 'info')
      return
    }

    setLandedIndex(null)
    setSpinning(true)

    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const settleMs = reduceMotion ? 60 : 5700

    // Demo-mode path: no backend configured. Pick locally.
    if (!isSupabaseConfigured) {
      const idx = Math.floor(Math.random() * cases.length)
      const assigned: TeamAssignment = {
        id: `demo-${Date.now()}`,
        team_name: name,
        track,
        case_number: idx + 1,
        assigned_at: new Date().toISOString(),
      }
      const target = computeTargetRotation(rotation, idx, cases.length)
      setRotation(target)
      setTimeout(() => {
        setAssignment(assigned)
        setIsDemoAssignment(true)
        setSpinning(false)
        setLandedIndex(idx)
        toast.push('Demo spin — connect Supabase to persist real assignments.', 'info')
      }, settleMs)
      return
    }

    try {
      const { data, error } = await supabase.rpc('assign_case', {
        p_team_name: name,
        p_track: track,
      })
      if (error) throw error
      if (!data || typeof data !== 'object')
        throw new Error('Empty response from server')
      const row = Array.isArray(data) ? data[0] : data
      const assigned = row as TeamAssignment
      const idx = assigned.case_number - 1

      const target = computeTargetRotation(rotation, idx, cases.length)
      setRotation(target)

      setTimeout(() => {
        setAssignment(assigned)
        setIsDemoAssignment(false)
        setSpinning(false)
        setLandedIndex(idx)
      }, settleMs)
    } catch (e: any) {
      setSpinning(false)
      toast.push(
        e?.message || 'Could not assign a case. Please contact a coordinator.',
        'error',
      )
    }
  }

  const lookup = async () => {
    const q = teamName.trim()
    if (!q) return
    if (!isSupabaseConfigured) return
    setLookupBusy(true)
    try {
      const { data } = await supabase
        .from('team_assignments')
        .select('*')
        .eq('team_name_lower', q.toLowerCase())
        .eq('track', track)
        .maybeSingle()
      if (data) {
        setAssignment(data as TeamAssignment)
        toast.push('Previous assignment restored.', 'success')
      } else {
        toast.push('No previous assignment on this division yet.', 'info')
      }
    } finally {
      setLookupBusy(false)
    }
  }

  const assignedCase = assignment ? getCase(track, assignment.case_number) : null
  const tone: 'red' | 'cyan' = track === 'junior' ? 'cyan' : 'red'
  const toneColor = tone === 'red' ? '#dc2626' : '#06b6d4'

  return (
    <section className="relative overflow-hidden grain">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 relative z-10">
        {/* ────── CASE HEADER ────── */}
        <div className="flex items-start justify-between flex-wrap gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 text-[0.65rem] font-mono tracking-[0.3em] uppercase text-stone-400">
              <span className="w-2 h-2 bg-red-500 rounded-full breath" />
              <span>Case intake</span>
              <span className="text-stone-600">/</span>
              <span className={tone === 'red' ? 'text-red-500' : 'text-cyan-500'}>
                {TRACK_LABEL[track]}
              </span>
              <span className="text-stone-600">/</span>
              <span>{cases.length} files sealed</span>
            </div>
            <h1 className="font-serif italic text-stone-50 text-4xl md:text-5xl mt-3 leading-[1.05]">
              Investigation <span className="scribble">dashboard</span>.
            </h1>
            <p className="mt-3 text-stone-400 max-w-xl text-sm leading-relaxed">
              {TRACK_DESCRIPTION[track]} The server deals exactly one sealed PDF to
              your team. Open it, chase the hints, assemble the report. Evaluation
              is <span className="text-stone-200">offline</span> — hand the written
              report to a coordinator.
            </p>
          </div>
          <span className="stamp stamp-tilt mt-1 shrink-0" style={{ fontSize: '0.75rem' }}>
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

              {/* Spin button */}
              <div className="relative mt-6">
                {!spinning && !assignment && teamName.trim().length >= 2 && (
                  <span
                    aria-hidden
                    className="absolute inset-[-6px] rounded-sm blur-xl breath pointer-events-none bg-red-500/30"
                  />
                )}
                <button
                  onClick={spin}
                  disabled={spinning || !!assignment}
                  className="relative w-full bg-stone-900 text-stone-50 py-5 font-display tracking-[0.3em] uppercase text-sm font-bold overflow-hidden border-2 border-stone-900 hover:bg-red-600 hover:border-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  style={{
                    clipPath:
                      'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
                  }}
                >
                  <span className="relative inline-flex items-center gap-3 justify-center">
                    {spinning ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Dealing a case…
                      </>
                    ) : assignment ? (
                      <>
                        <FileSearch size={18} /> Case already dealt
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Deal my case file
                        <RotateCw
                          size={16}
                          className="opacity-80 transition-transform group-hover:rotate-180 duration-700"
                        />
                      </>
                    )}
                  </span>
                </button>
                <p className="text-[0.62rem] text-stone-600 mt-2 text-center tracking-widest uppercase font-mono">
                  {assignment
                    ? '> case locked for this team <'
                    : spinning
                    ? '> routing through intelligence… <'
                    : teamName.trim().length < 2
                    ? '> awaiting call-sign <'
                    : '> press to deploy <'}
                </p>
              </div>
            </div>

            {/* Case reveal — torn paper when sealed */}
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

          {/* RIGHT — WHEEL + CASE INDEX */}
          <div className="order-1 lg:order-2 space-y-6">
            <div className="paper-dark rounded-sm px-5 pt-6 pb-6 relative isolate">
              <span className="tape tape-cyan" style={{ top: -10, left: 20, zIndex: 2 }} />
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                  <div className="font-mono text-[0.6rem] tracking-widest uppercase text-stone-500">
                    Case selector
                  </div>
                  <div className="font-serif italic text-stone-50 text-lg">
                    The server picks.
                  </div>
                </div>
                <StatusChip
                  status={
                    spinning ? 'routing' : assignment ? 'sealed' : 'await'
                  }
                />
              </div>
              <Wheel
                cases={cases}
                rotation={rotation}
                spinning={spinning}
                color={tone === 'red' ? 'violet' : 'cyan'}
                landedIndex={landedIndex}
              />
              <p className="mt-5 text-center text-[0.62rem] tracking-widest uppercase font-mono text-stone-500">
                the wheel just announces it.
              </p>
            </div>

            {/* Case index */}
            <div className="paper rounded-sm p-5 relative">
              <span className="tape tape-red" style={{ top: -10, right: 20 }} />
              <div className="font-mono text-[0.6rem] tracking-widest uppercase text-stone-600 mb-3">
                Case index · {cases.length} files
              </div>
              <ul className="space-y-1.5">
                {cases.map((c) => {
                  const isMine = assignment?.case_number === c.number
                  return (
                    <li
                      key={c.number}
                      className={`flex items-center justify-between gap-3 px-3 py-2 border transition-colors ${
                        isMine
                          ? 'border-red-600 bg-red-600/10 text-stone-900'
                          : 'border-stone-900/15 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            isMine ? 'text-red-600 font-bold' : 'text-stone-500'
                          }`}
                        >
                          #{c.label}
                        </span>
                        <span className="font-serif italic text-sm truncate">
                          {c.title}
                        </span>
                      </div>
                      {isMine ? (
                        <span className="stamp" style={{ fontSize: '0.5rem', padding: '0.08em 0.3em' }}>
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
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96, rotate: -1 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: -1 }}
      transition={{ type: 'spring', stiffness: 180, damping: 20 }}
      className="paper rounded-sm p-7 relative torn-bottom pb-14"
    >
      <span className="tape tape-red" style={{ top: -10, left: 60 }} />
      <span className="tape tape-violet" style={{ top: -10, right: 60, transform: 'rotate(4deg)' }} />
      <span className="absolute top-6 right-6 stamp stamp-tilt" style={{ fontSize: '0.75rem' }}>
        Classified
      </span>
      {isDemo && (
        <span
          className="absolute top-6 right-32 stamp"
          style={{ fontSize: '0.55rem', padding: '0.1em 0.4em', color: '#b45309', borderColor: '#b45309' }}
        >
          Demo
        </span>
      )}

      <div className="font-mono text-[0.6rem] tracking-widest uppercase text-stone-600">
        Dossier · AI-ODY/{String(assignedCase.number).padStart(3, '0')}-α
      </div>
      <h3 className="font-serif italic text-stone-900 text-3xl md:text-4xl leading-tight mt-2">
        Case {assignedCase.label} — {assignedCase.title}
      </h3>
      <div className="mt-2 font-hand text-red-600 text-xl">
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

      {/* Actions */}
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <a
          href={assignedCase.pdfPath}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center justify-center gap-3 bg-stone-900 text-stone-50 py-4 font-display font-bold tracking-widest uppercase text-xs transition-colors hover:bg-red-600"
          style={{
            clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
          }}
        >
          <ExternalLink size={14} /> Open sealed PDF
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </a>
        <div
          className="inline-flex items-center justify-center gap-3 bg-stone-50 border-2 border-stone-900 text-stone-900 py-4 font-display font-bold tracking-widest uppercase text-xs cursor-default"
          style={{
            clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)',
          }}
          title="Reports are evaluated offline by coordinators"
        >
          <FileSearch size={14} /> Submit report · offline
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
  const map: Record<
    typeof status,
    { label: string; cls: string }
  > = {
    await: {
      label: 'Awaiting',
      cls: 'bg-stone-500/10 text-stone-400 border-stone-500/50',
    },
    ready: {
      label: 'Ready',
      cls: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/50',
    },
    routing: {
      label: 'Routing',
      cls: 'bg-amber-500/15 text-amber-300 border-amber-500/50',
    },
    sealed: {
      label: 'Sealed',
      cls: 'bg-red-500/15 text-red-300 border-red-500/50',
    },
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
    title: 'Open the sealed PDF.',
    desc: 'Every hint on your case is in that one brief — timestamps, trace fragments, redacted lines, cross-references.',
  },
  {
    title: 'Follow the hints offline.',
    desc: 'Nothing on this site evaluates your answer. Work the case in your team — code, notes, whiteboard, whatever helps.',
  },
  {
    title: 'Connect the dots.',
    desc: 'A clue is only useful once it points to another. Build a timeline. Keep what fits, discard what does not.',
  },
  {
    title: 'Submit the report.',
    desc: 'Write the final report (format in the brief) and hand it to a coordinator. Verified scores appear on the leaderboard.',
  },
]
