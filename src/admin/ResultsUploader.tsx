import { ChangeEvent, useRef, useState } from 'react'
import {
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react'
import { downloadCsvTemplate, parseCsv, REQUIRED_COLUMNS } from './csv'
import type { LeaderboardEntry, RowValidation } from '../lib/types'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

interface Props {
  existing: LeaderboardEntry[]
  onImported: () => void
}

export function ResultsUploader({ existing, onImported }: Props) {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<RowValidation[] | null>(null)
  const [missing, setMissing] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setFileName(null)
    setRows(null)
    setMissing([])
    if (input.current) input.current.value = ''
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast.push('Please upload a .csv file. XLSX support is on the roadmap.', 'error')
      reset()
      return
    }
    const text = await f.text()
    const { rows, missingColumns } = parseCsv(text, existing)
    setRows(rows)
    setMissing(missingColumns)
  }

  const valid = rows?.filter((r) => r.errors.length === 0 && !r.isDuplicateInFile) ?? []
  const invalid = rows?.filter((r) => r.errors.length > 0 || r.isDuplicateInFile) ?? []
  const updates = valid.filter((r) => r.isDuplicateOfExisting).length
  const inserts = valid.length - updates

  const commit = async () => {
    if (valid.length === 0) {
      toast.push('No valid rows to import.', 'error')
      return
    }
    const confirmed = window.confirm(
      `Import ${valid.length} rows?\n` +
        `• ${inserts} new team(s) will be inserted\n` +
        `• ${updates} existing team(s) will be updated (same team_name + track)\n\n` +
        `${invalid.length} invalid row(s) will be skipped and reported.`,
    )
    if (!confirmed) return

    setBusy(true)
    const payload = valid.map((r) => ({
      ...r.parsed!,
      is_demo: false,
    }))
    const { error } = await supabase.from('results').upsert(payload, {
      onConflict: 'team_name_lower,track',
    })
    setBusy(false)
    if (error) {
      toast.push(`Upload failed: ${error.message}`, 'error')
      return
    }
    toast.push(
      `Imported ${valid.length} rows (${inserts} new, ${updates} updated). Skipped ${invalid.length}.`,
      'success',
    )
    reset()
    onImported()
  }

  return (
    <div className="glass rounded-2xl p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="section-title">// Bulk upload</div>
          <h2 className="h-display text-xl md:text-2xl text-white mt-1">Upload Results (CSV)</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl">
            Required columns: <code>{REQUIRED_COLUMNS.join(', ')}</code>. Optional:{' '}
            <code>completion_time, status</code>. Duplicate team+track rows will <em>update</em>{' '}
            the existing record. Invalid rows are reported and never saved.
          </p>
        </div>
        <button onClick={downloadCsvTemplate} className="cyber-btn cyber-btn-ghost text-xs">
          <Download size={14} /> Template
        </button>
      </div>

      <div className="mt-5 flex items-center gap-3 flex-wrap">
        <label className="cyber-btn cyber-btn-primary text-xs cursor-pointer">
          <Upload size={14} /> Select CSV
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFile}
          />
        </label>
        {fileName && (
          <>
            <span className="chip">
              <FileSpreadsheet size={11} /> {fileName}
            </span>
            <button onClick={reset} className="text-slate-400 hover:text-white" aria-label="Clear">
              <X size={16} />
            </button>
          </>
        )}
      </div>

      {missing.length > 0 && (
        <div className="mt-5 rounded-md border border-cyber-danger/40 bg-cyber-danger/10 text-cyber-danger text-xs p-3">
          Missing required column(s): <code>{missing.join(', ')}</code>. Fix the header row and
          try again.
        </div>
      )}

      {rows && missing.length === 0 && (
        <>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total rows" value={rows.length} />
            <Stat label="Valid" value={valid.length} tone="success" />
            <Stat label="Will update" value={updates} tone="info" />
            <Stat label="Invalid" value={invalid.length} tone="danger" />
          </div>

          <div className="mt-5 max-h-[400px] overflow-auto rounded-lg border border-white/5">
            <table className="w-full text-xs">
              <thead className="bg-bg-700/60 sticky top-0">
                <tr className="text-left text-[0.6rem] tracking-[0.3em] uppercase text-slate-400">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Team</th>
                  <th className="py-2 px-3">Track</th>
                  <th className="py-2 px-3">Score</th>
                  <th className="py-2 px-3">Flags</th>
                  <th className="py-2 px-3">Problems</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const bad = r.errors.length > 0 || r.isDuplicateInFile
                  return (
                    <tr
                      key={r.row}
                      className={`border-t border-white/[0.04] ${bad ? 'bg-cyber-danger/5' : ''}`}
                    >
                      <td className="py-1.5 px-3 text-slate-500">{r.row}</td>
                      <td className="py-1.5 px-3 text-slate-100">{r.input.team_name}</td>
                      <td className="py-1.5 px-3 text-slate-300">{r.input.track}</td>
                      <td className="py-1.5 px-3 text-slate-300">{r.input.score}</td>
                      <td className="py-1.5 px-3">
                        <div className="flex gap-1 flex-wrap">
                          {r.isDuplicateInFile && <span className="chip chip-amber">Dup in file</span>}
                          {r.isDuplicateOfExisting && !r.isDuplicateInFile && (
                            <span className="chip">Will update</span>
                          )}
                          {!bad && !r.isDuplicateOfExisting && (
                            <span className="chip chip-success">New</span>
                          )}
                          {r.errors.length === 0 && !r.isDuplicateInFile && (
                            <CheckCircle2 size={12} className="text-cyber-success inline" />
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-3 text-cyber-danger">
                        {r.isDuplicateInFile && 'Duplicate team in file. '}
                        {r.errors.join('; ')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center gap-3 flex-wrap">
            <button
              onClick={commit}
              disabled={busy || valid.length === 0}
              className="cyber-btn cyber-btn-primary text-xs"
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Importing…
                </>
              ) : (
                <>
                  <Upload size={14} /> Import {valid.length} valid row(s)
                </>
              )}
            </button>
            <button onClick={reset} className="cyber-btn cyber-btn-ghost text-xs">
              Discard
            </button>
            {invalid.length > 0 && (
              <span className="chip chip-amber">
                <AlertTriangle size={11} /> {invalid.length} row(s) will be skipped
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'success' | 'danger' | 'info'
}) {
  const t =
    tone === 'success'
      ? 'text-cyber-success'
      : tone === 'danger'
      ? 'text-cyber-danger'
      : tone === 'info'
      ? 'text-cyber-cyan'
      : 'text-white'
  return (
    <div className="glass rounded-lg p-3">
      <div className="text-[0.6rem] tracking-[0.3em] uppercase text-slate-500">{label}</div>
      <div className={`font-display text-2xl ${t}`}>{value}</div>
    </div>
  )
}
