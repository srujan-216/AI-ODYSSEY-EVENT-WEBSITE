import Papa from 'papaparse'
import type { CsvRow, LeaderboardEntry, RowValidation, Track } from '../lib/types'

export const REQUIRED_COLUMNS = ['team_name', 'track', 'score'] as const
export const OPTIONAL_COLUMNS = ['completion_time', 'status'] as const
export const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as const

export const SAMPLE_CSV = `team_name,track,score,completion_time,status
Null Pointer,senior,480,2026-02-14T13:42:00Z,Case 07 cleared
GhostProtocol,senior,455,2026-02-14T14:11:00Z,Case 03 cleared
Sentinel,junior,430,2026-02-14T13:58:00Z,Case 05 cleared
Watchdogs,junior,410,,In progress
Zero Cool,senior,395,,In progress
`

interface ParseResult {
  rows: RowValidation[]
  missingColumns: string[]
}

export function parseCsv(text: string, existing: LeaderboardEntry[]): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  const headers = parsed.meta.fields?.map((h) => h.toLowerCase()) ?? []
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c))

  const existingByName = new Map<string, LeaderboardEntry>()
  for (const r of existing) existingByName.set(r.team_name.trim().toLowerCase(), r)

  const seenInFile = new Set<string>()
  const rows: RowValidation[] = parsed.data.map((raw, i) => {
    const row: RowValidation = {
      row: i + 2, // header is row 1
      input: raw,
      errors: [],
      isDuplicateOfExisting: false,
      isDuplicateInFile: false,
    }
    if (missing.length) {
      row.errors.push(`Missing required column(s): ${missing.join(', ')}`)
      return row
    }

    const name = (raw.team_name || '').trim()
    const trackRaw = (raw.track || '').trim().toLowerCase()
    const scoreRaw = (raw.score || '').trim()
    const completionRaw = (raw.completion_time || '').trim()
    const statusRaw = (raw.status || '').trim()

    if (!name) row.errors.push('team_name is required')
    if (name.length > 60) row.errors.push('team_name exceeds 60 chars')

    let track: Track | null = null
    if (trackRaw === 'junior' || trackRaw === 'senior') track = trackRaw
    else row.errors.push(`track must be "junior" or "senior" (got "${raw.track ?? ''}")`)

    const score = Number(scoreRaw)
    if (!scoreRaw || !Number.isFinite(score)) row.errors.push('score must be a number')
    else if (score < 0 || score > 100000) row.errors.push('score out of range (0..100000)')

    let completion_time: string | null = null
    if (completionRaw) {
      const d = new Date(completionRaw)
      if (isNaN(d.getTime())) row.errors.push('completion_time is not a valid ISO date')
      else completion_time = d.toISOString()
    }

    const key = name.toLowerCase()
    if (seenInFile.has(key)) row.isDuplicateInFile = true
    else seenInFile.add(key)
    if (existingByName.has(key)) row.isDuplicateOfExisting = true

    if (row.errors.length === 0 && track) {
      row.parsed = {
        team_name: name,
        track,
        score: Math.round(score),
        completion_time,
        status: statusRaw || null,
      }
    }
    return row
  })

  return { rows, missingColumns: missing }
}

export function toCsv(rows: LeaderboardEntry[]): string {
  const header = ALL_COLUMNS.join(',')
  const lines = rows.map((r) =>
    [r.team_name, r.track, r.score, r.completion_time ?? '', r.status ?? '']
      .map((v) => csvEscape(String(v)))
      .join(','),
  )
  return [header, ...lines].join('\n')
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function downloadCsvTemplate() {
  const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ai-odyssey-results-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}
