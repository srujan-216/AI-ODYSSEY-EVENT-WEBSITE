import Papa from 'papaparse'
import type { CsvRow, LeaderboardEntry, RowValidation, Track } from '../lib/types'

export const REQUIRED_COLUMNS = ['team_name', 'track', 'case_number', 'score'] as const
export const OPTIONAL_COLUMNS = ['completion_time', 'status', 'is_solved'] as const
export const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS] as const

export const SAMPLE_CSV = `team_name,track,case_number,score,completion_time,status,is_solved
Null Pointer,senior,1,100,2026-02-14T13:42:00Z,Cleared,true
Null Pointer,senior,2,95,2026-02-14T14:15:00Z,Cleared,true
GhostProtocol,senior,1,90,2026-02-14T14:11:00Z,Cleared,true
Sentinel,junior,3,100,2026-02-14T13:58:00Z,Cleared,true
Watchdogs,junior,1,0,,In progress,false
`

interface ParseResult {
  rows: RowValidation[]
  missingColumns: string[]
}

export function parseCsv(text: string, existing: { team_name: string; track: Track; case_number?: number }[]): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  const headers = parsed.meta.fields?.map((h) => h.toLowerCase()) ?? []
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c))

  const existingByKey = new Set<string>()
  for (const r of existing) {
    if (r.case_number) {
      existingByKey.add(`${r.team_name.trim().toLowerCase()}|${r.track}|${r.case_number}`)
    }
  }

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
    const caseRaw = (raw.case_number || '').trim()
    const scoreRaw = (raw.score || '').trim()
    const completionRaw = (raw.completion_time || '').trim()
    const statusRaw = (raw.status || '').trim()
    const isSolvedRaw = (raw.is_solved || '').trim().toLowerCase()

    if (!name) row.errors.push('team_name is required')
    if (name.length > 60) row.errors.push('team_name exceeds 60 chars')

    let track: Track | null = null
    if (trackRaw === 'junior' || trackRaw === 'senior') track = trackRaw
    else row.errors.push(`track must be "junior" or "senior" (got "${raw.track ?? ''}")`)

    const caseNum = Number(caseRaw)
    if (!caseRaw || !Number.isInteger(caseNum) || caseNum < 1 || caseNum > 6) {
      row.errors.push('case_number must be an integer between 1 and 6')
    }

    const score = Number(scoreRaw)
    if (!scoreRaw || !Number.isFinite(score)) row.errors.push('score must be a number')
    else if (score < 0 || score > 100000) row.errors.push('score out of range (0..100000)')

    let completion_time: string | null = null
    if (completionRaw) {
      const d = new Date(completionRaw)
      if (isNaN(d.getTime())) row.errors.push('completion_time is not a valid ISO date')
      else completion_time = d.toISOString()
    }

    let is_solved = false
    if (isSolvedRaw) {
      if (['false', '0', 'no', 'unsolved'].includes(isSolvedRaw)) {
        is_solved = false
      } else if (['true', '1', 'yes', 'solved'].includes(isSolvedRaw)) {
        is_solved = true
      } else {
        row.errors.push('is_solved must be true or false (e.g. true/false, yes/no, 1/0)')
      }
    }

    const key = `${name.toLowerCase()}|${trackRaw}|${caseNum}`
    if (seenInFile.has(key)) row.isDuplicateInFile = true
    else seenInFile.add(key)
    if (existingByKey.has(key)) row.isDuplicateOfExisting = true

    if (row.errors.length === 0 && track && Number.isInteger(caseNum)) {
      row.parsed = {
        team_name: name,
        track,
        case_number: caseNum,
        score: Math.round(score),
        completion_time,
        status: statusRaw || null,
        is_solved,
      }
    }
    return row
  })

  return { rows, missingColumns: missing }
}

export function toCsv(rows: { team_name: string; track: Track; case_number?: number; score: number; completion_time?: string | null; status?: string | null; is_solved?: boolean }[]): string {
  const header = ALL_COLUMNS.join(',')
  const lines = rows.map((r) =>
    [
      r.team_name,
      r.track,
      r.case_number ?? 1,
      r.score,
      r.completion_time ?? '',
      r.status ?? '',
      r.is_solved ?? true,
    ]
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
