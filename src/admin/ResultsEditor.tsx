import { FormEvent, useMemo, useState } from 'react'
import { Pencil, Plus, Save, Search, Trash2, X, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { LeaderboardEntry, Track } from '../lib/types'
import { TRACK_LABEL } from '../lib/cases'
import { useToast } from '../components/Toast'

interface Props {
  rows: LeaderboardEntry[]
  onChanged: () => void
}

interface Draft {
  id?: string
  team_name: string
  track: Track
  score: string
  completion_time: string
  status: string
}

const EMPTY: Draft = { team_name: '', track: 'junior', score: '', completion_time: '', status: '' }

export function ResultsEditor({ rows, onChanged }: Props) {
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | Track>('all')
  const [editing, setEditing] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((r) => filter === 'all' || r.track === filter)
      .filter((r) => (q ? r.team_name.toLowerCase().includes(q) : true))
  }, [rows, filter, query])

  const start = (r?: LeaderboardEntry) => {
    if (!r) {
      setEditing({ ...EMPTY })
      return
    }
    setEditing({
      id: r.id,
      team_name: r.team_name,
      track: r.track,
      score: String(r.score),
      completion_time: r.completion_time
        ? new Date(r.completion_time).toISOString().slice(0, 16)
        : '',
      status: r.status ?? '',
    })
  }

  const cancel = () => setEditing(null)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing) return

    const name = editing.team_name.trim()
    if (!name) return toast.push('Team name required.', 'error')
    const score = Number(editing.score)
    if (!Number.isFinite(score) || score < 0 || score > 100000)
      return toast.push('Score must be a non-negative number.', 'error')

    const payload = {
      ...(editing.id ? { id: editing.id } : {}),
      team_name: name,
      track: editing.track,
      score: Math.round(score),
      completion_time: editing.completion_time
        ? new Date(editing.completion_time).toISOString()
        : null,
      status: editing.status.trim() || null,
      is_demo: false,
    }

    setBusy(true)
    const { error } = await supabase.from('results').upsert(payload, {
      onConflict: 'team_name_lower,track',
    })
    setBusy(false)
    if (error) return toast.push(`Save failed: ${error.message}`, 'error')
    toast.push(editing.id ? 'Result updated.' : 'Result added.', 'success')
    setEditing(null)
    onChanged()
  }

  const remove = async (r: LeaderboardEntry) => {
    const ok = window.confirm(
      `Delete result for "${r.team_name}" on ${TRACK_LABEL[r.track]}?\nThis cannot be undone.`,
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
          <Plus size={14} /> Add team
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
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3 text-right">Score</th>
              <th className="py-2 px-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500 text-sm">
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
                <td className="py-2 px-3 text-slate-300 text-xs">{r.status ?? '—'}</td>
                <td className="py-2 px-3 text-right font-display text-lg text-cyber-cyan">
                  {r.score}
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-2 justify-end">
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 grid place-items-center p-4">
          <form onSubmit={save} className="glass-strong rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="h-display text-lg text-white">
                {editing.id ? 'Edit result' : 'Add result'}
              </h3>
              <button type="button" onClick={cancel} aria-label="Close">
                <X size={18} className="text-slate-400 hover:text-white" />
              </button>
            </div>

            <div className="grid gap-3">
              <div>
                <label className="section-title block mb-1">Team name</label>
                <input
                  className="cyber-input"
                  required
                  maxLength={60}
                  value={editing.team_name}
                  onChange={(e) => setEditing({ ...editing, team_name: e.target.value })}
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
                    <option value="junior">The Mystery Squad</option>
                    <option value="senior">The Mystery Masters</option>
                  </select>
                </div>
                <div>
                  <label className="section-title block mb-1">Score</label>
                  <input
                    className="cyber-input"
                    required
                    type="number"
                    min={0}
                    max={100000}
                    value={editing.score}
                    onChange={(e) => setEditing({ ...editing, score: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="section-title block mb-1">Completion time (optional)</label>
                <input
                  className="cyber-input"
                  type="datetime-local"
                  value={editing.completion_time}
                  onChange={(e) =>
                    setEditing({ ...editing, completion_time: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="section-title block mb-1">Status (optional)</label>
                <input
                  className="cyber-input"
                  maxLength={80}
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  placeholder="e.g. Case 03 cleared"
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
}
