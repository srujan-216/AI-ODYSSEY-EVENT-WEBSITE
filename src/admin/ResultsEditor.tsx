import { FormEvent, forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { Pencil, Plus, Save, Search, Trash2, X, Loader2, CheckCircle2, Clock, Stamp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { ResultRow, Track } from '../lib/types'
import { TRACK_LABEL, CASE_COUNT, difficultyFor, labelFor } from '../lib/cases'
import { useToast } from '../components/Toast'

const CASE_NUMBERS = Array.from({ length: CASE_COUNT }, (_, i) => i + 1)

export interface ResultsEditorHandle {
  startWithPrefill: (prefill: {
    team_name: string
    track: Track
    case_number: number
  }) => void
}

interface Props {
  rows: ResultRow[]
  onChanged: () => void
}

interface Draft {
  id?: string
  team_name: string
  track: Track
  case_number: number
  score: string
  completion_time: string
  status: string
  is_solved: boolean
  /**
   * True when the modal was opened from the live spin feed — team / track /
   * case are known from the assignment, so those fields render read-only
   * and the operator is sent straight to score + submission time.
   */
  quick?: boolean
}

function nowLocalDatetimeInput(): string {
  // yyyy-MM-ddTHH:mm — the format <input type="datetime-local"> expects, in the
  // operator's local wall-clock time, so the moment they click "Record" is the
  // moment stamped on the submission.
  const d = new Date()
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function buildEmpty(): Draft {
  // New rows default to a solved submission at the current moment, since the
  // primary admin flow during the event is recording a team's offline hand-in.
  return {
    team_name: '',
    track: 'junior',
    case_number: 1,
    score: '',
    completion_time: nowLocalDatetimeInput(),
    status: 'Report submitted',
    is_solved: true,
  }
}

export const ResultsEditor = forwardRef<ResultsEditorHandle, Props>(function ResultsEditor(
  { rows, onChanged },
  ref,
) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | Track>('all')
  const [editing, setEditing] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  useImperativeHandle(ref, () => ({
    startWithPrefill: (prefill) => {
      // Look up any existing result for this team+track+case so edits
      // overlay the existing row instead of creating a duplicate.
      const existing = rows.find(
        (r) =>
          r.team_name.toLowerCase() === prefill.team_name.toLowerCase() &&
          r.track === prefill.track &&
          r.case_number === prefill.case_number,
      )
      if (existing) {
        // Editing an existing recorded submission — keep the full form.
        start(existing)
      } else {
        // New submission from the live feed — jump straight to score + time.
        setEditing({
          ...buildEmpty(),
          team_name: prefill.team_name,
          track: prefill.track,
          case_number: prefill.case_number,
          completion_time: nowLocalDatetimeInput(),
          quick: true,
        })
      }
      // Scroll the modal into view on mobile — the editor is below the fold.
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    },
  }))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => filter === 'all' || r.track === filter)
      .filter((r) => (q ? r.team_name.toLowerCase().includes(q) : true))
  }, [rows, filter, query])

  const start = (r?: ResultRow) => {
    if (!r) {
      setEditing(buildEmpty())
      return
    }
    setEditing({
      id: r.id,
      team_name: r.team_name,
      track: r.track,
      case_number: r.case_number ?? 1,
      score: String(r.score),
      completion_time: r.completion_time
        ? new Date(r.completion_time).toISOString().slice(0, 16)
        : '',
      status: r.status ?? '',
      is_solved: r.is_solved ?? true,
    })
  }

  const markSolvedNow = async (r: ResultRow) => {
    const { error } = await supabase
      .from('results')
      .update({
        is_solved: true,
        completion_time: new Date().toISOString(),
        status: r.status && r.status.trim().length > 0 ? r.status : 'Report submitted',
      })
      .eq('id', r.id)
    if (error) return toast.push(`Could not mark solved: ${error.message}`, 'error')
    toast.push(`"${r.team_name}" marked solved at ${new Date().toLocaleTimeString()}.`, 'success')
    onChanged()
  }

  const cancel = () => setEditing(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return

    const name = editing.team_name.trim()
    if (!name) return toast.push('Team name required.', 'error')
    const caseNum = Number(editing.case_number)
    if (!Number.isInteger(caseNum) || caseNum < 1 || caseNum > CASE_COUNT)
      return toast.push(`Case must be between 1 and ${CASE_COUNT}.`, 'error')
    const score = Number(editing.score)
    if (!Number.isFinite(score) || score < 0 || score > 100000)
      return toast.push('Score must be a non-negative number.', 'error')

    const payload = {
      ...(editing.id ? { id: editing.id } : {}),
      team_name: name,
      track: editing.track,
      case_number: caseNum,
      difficulty: difficultyFor(caseNum),
      score: Math.round(score),
      completion_time: editing.completion_time
        ? new Date(editing.completion_time).toISOString()
        : null,
      status: editing.status.trim() || null,
      is_solved: editing.is_solved,
      is_demo: false,
    }

    setBusy(true)
    const { error } = await supabase.from('results').upsert(payload, {
      onConflict: 'team_name_lower,track,case_number',
    })
    setBusy(false)
    if (error) return toast.push(`Save failed: ${error.message}`, 'error')
    toast.push(editing.id ? 'Result updated.' : 'Result added.', 'success')
    setEditing(null)
    onChanged()
  }

  const remove = async (r: ResultRow) => {
    const ok = window.confirm(
      `Delete result for "${r.team_name}" on ${TRACK_LABEL[r.track]} (Case ${labelFor(r.case_number)})?\nThis cannot be undone.`,
    )
    if (!ok) return
    const { error } = await supabase.from('results').delete().eq('id', r.id)
    if (error) return toast.push(`Delete failed: ${error.message}`, 'error')
    toast.push('Result deleted.', 'success')
    onChanged()
  }

  return (
    <div className="glass rounded-2xl p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="section-title">// Manual override</div>
          <h2 className="h-display text-xl md:text-2xl text-white mt-1">Edit Results</h2>
          <p className="text-sm text-slate-400 mt-2">
            Add, edit, or delete individual team results. Changes are persisted immediately and
            pushed to the public leaderboard in real time.
          </p>
        </div>
        <button onClick={() => start()} className="cyber-btn cyber-btn-primary text-xs">
          <Plus size={14} /> Record submission
        </button>
      </div>

      <div className="mt-5 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            className="cyber-input pl-9 text-sm py-2"
            placeholder="Search teams…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {(['all', 'junior', 'senior'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-md font-display tracking-widest uppercase text-[0.6rem]
                        border transition-all
                        ${
                          filter === f
                            ? 'bg-cyber-cyan/15 text-white border-cyber-cyan'
                            : 'bg-white/[0.02] text-slate-400 border-white/5 hover:border-cyber-cyan/40'
                        }`}
          >
            {f === 'all' ? 'All' : TRACK_LABEL[f]}
          </button>
        ))}
      </div>

      <div className="mt-5 max-h-[480px] overflow-auto rounded-lg border border-white/5">
        <table className="w-full text-sm">
          <thead className="bg-bg-700/60 sticky top-0">
            <tr className="text-left text-[0.6rem] tracking-[0.3em] uppercase text-slate-400">
              <th className="py-2 px-3">Team</th>
              <th className="py-2 px-3">Division</th>
              <th className="py-2 px-3">Case</th>
              <th className="py-2 px-3">Solved?</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3 text-right">Score</th>
              <th className="py-2 px-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500 text-sm">
                  No matching results.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-white/[0.04] hover:bg-cyber-cyan/5">
                <td className="py-2 px-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-white">{r.team_name}</span>
                    {r.is_demo && <span className="chip chip-amber">Demo</span>}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <span className={r.track === 'junior' ? 'chip' : 'chip chip-violet'}>
                    {TRACK_LABEL[r.track]}
                  </span>
                </td>
                <td className="py-2 px-3 font-mono text-xs text-cyber-cyan">
                  Case {labelFor(r.case_number)}
                </td>
                <td className="py-2 px-3">
                  {r.is_solved ? (
                    <span className="chip chip-success text-[0.65rem] inline-flex items-center gap-1">
                      <CheckCircle2 size={10} /> Solved
                    </span>
                  ) : (
                    <span className="chip text-[0.65rem] inline-flex items-center gap-1 text-slate-400">
                      <Clock size={10} /> In progress
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-slate-300 text-xs">{r.status ?? '—'}</td>
                <td className="py-2 px-3 text-right font-display text-lg text-cyber-cyan">
                  {r.score}
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-2 justify-end">
                    {!r.is_solved && (
                      <button
                        onClick={() => markSolvedNow(r)}
                        className="text-slate-400 hover:text-cyber-success"
                        aria-label="Mark solved now"
                        title="Stamp submission time + mark solved"
                      >
                        <Stamp size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => start(r)}
                      className="text-slate-400 hover:text-cyber-cyan"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(r)}
                      className="text-slate-400 hover:text-cyber-danger"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 grid place-items-center p-4 overflow-y-auto">
          <form
            onSubmit={save}
            className="glass-strong rounded-2xl p-5 sm:p-6 w-full max-w-lg my-auto"
          >
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="min-w-0">
                <h3 className="h-display text-base sm:text-lg text-white">
                  {editing.quick
                    ? 'Record submission'
                    : editing.id
                    ? 'Edit result'
                    : 'Add result'}
                </h3>
                {editing.quick && (
                  <p className="text-[0.65rem] sm:text-xs text-slate-400 mt-1">
                    Enter the score and the time the written report was handed
                    in. Everything else is already captured from the spin.
                  </p>
                )}
              </div>
              <button type="button" onClick={cancel} aria-label="Close" className="shrink-0">
                <X size={18} className="text-slate-400 hover:text-white" />
              </button>
            </div>

            {/* Identity header — read-only when the modal was opened from the
                live spin feed, since team / track / case are already fixed by
                the assignment. */}
            {editing.quick && (
              <div className="rounded-lg border border-cyber-cyan/30 bg-cyber-cyan/5 px-4 py-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display text-white truncate max-w-[220px]">
                    {editing.team_name}
                  </span>
                  <span
                    className={
                      editing.track === 'junior'
                        ? 'chip text-[0.6rem]'
                        : 'chip chip-violet text-[0.6rem]'
                    }
                  >
                    {TRACK_LABEL[editing.track]}
                  </span>
                  <span className="chip text-[0.6rem] font-mono">
                    Case {labelFor(editing.case_number)}
                  </span>
                </div>
                <p className="text-[0.6rem] text-slate-500 mt-1 font-mono tracking-widest uppercase">
                  Identity locked — click Cancel to pick a different row.
                </p>
              </div>
            )}

            <div className="grid gap-3">
              {!editing.quick && (
                <>
                  <div>
                    <label className="section-title block mb-1">Team name</label>
                    <input
                      className="cyber-input"
                      required
                      maxLength={60}
                      value={editing.team_name}
                      onChange={(e) =>
                        setEditing({ ...editing, team_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="section-title block mb-1">Division</label>
                      <select
                        className="cyber-input"
                        value={editing.track}
                        onChange={(e) =>
                          setEditing({ ...editing, track: e.target.value as Track })
                        }
                      >
                        <option value="junior">Junior</option>
                        <option value="senior">Senior</option>
                      </select>
                    </div>
                    <div>
                      <label className="section-title block mb-1">Case #</label>
                      <select
                        className="cyber-input"
                        value={editing.case_number}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            case_number: Number(e.target.value),
                          })
                        }
                      >
                        {CASE_NUMBERS.map((c) => (
                          <option key={c} value={c}>
                            Case {labelFor(c)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* ========= PRIMARY FIELDS ========= */}
              <div>
                <label className="section-title block mb-1">
                  Score{' '}
                  <span className="text-slate-500 normal-case">
                    (from the offline evaluation)
                  </span>
                </label>
                <input
                  className="cyber-input text-lg font-display tabular-nums"
                  required
                  autoFocus
                  type="number"
                  min={0}
                  max={100000}
                  placeholder="e.g. 85"
                  value={editing.score}
                  onChange={(e) => setEditing({ ...editing, score: e.target.value })}
                />
              </div>
              <div>
                <label className="section-title block mb-1">
                  Submission time{' '}
                  <span className="text-slate-500 normal-case">
                    (defaults to now — adjust if the report came in earlier)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    className="cyber-input flex-1"
                    type="datetime-local"
                    value={editing.completion_time}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        completion_time: e.target.value,
                      })
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        ...editing,
                        completion_time: nowLocalDatetimeInput(),
                      })
                    }
                    className="cyber-btn cyber-btn-ghost text-[0.6rem] shrink-0"
                    title="Snap submission time to right now"
                  >
                    Now
                  </button>
                </div>
              </div>

              {/* ========= OPTIONAL FIELDS ========= */}
              <div>
                <label className="section-title block mb-1">Solved?</label>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="radio"
                      name="is_solved"
                      checked={editing.is_solved === true}
                      onChange={() => setEditing({ ...editing, is_solved: true })}
                      className="accent-cyber-cyan"
                    />
                    <span>Solved — counts on leaderboard</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="radio"
                      name="is_solved"
                      checked={editing.is_solved === false}
                      onChange={() => setEditing({ ...editing, is_solved: false })}
                      className="accent-cyber-cyan"
                    />
                    <span>In progress</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="section-title block mb-1">Status text (optional)</label>
                <input
                  className="cyber-input"
                  maxLength={80}
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  placeholder="e.g. Verified by Coordinator"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button type="button" onClick={cancel} className="cyber-btn cyber-btn-ghost text-xs">
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="cyber-btn cyber-btn-primary text-xs"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
})
