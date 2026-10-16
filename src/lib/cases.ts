import type { Track } from './types'

/**
 * Case catalog.
 *
 * Seven case briefs total, shared across both tracks (Junior and Senior open
 * the same PDF per case number). Split into two difficulty buckets:
 *   • 5 EASY  — participant spins the wheel. case_number 1..5 → label e1..e5.
 *   • 2 HARD  — participant tosses the coin. case_number 6..7 → label h1..h2.
 *
 * The number ↔ label mapping is the single source of truth, mirrored on the
 * server inside `assign_case()` (supabase/migrations/0006_*.sql). If a label
 * moves, update both or the DB-stamped difficulty will drift from the UI.
 *
 * PDFs live at `/cases/<label>.pdf` (e.g. `/cases/e1.pdf`, `/cases/h2.pdf`).
 */
export type Difficulty = 'easy' | 'hard'

export interface CaseConfig {
  number: number
  /** Human-visible label: e1..e5 for easy, h1..h2 for hard. */
  label: string
  title: string
  pdfPath: string
  difficulty: Difficulty
}

export const CASE_COUNT = 7
export const EASY_COUNT = 5
export const HARD_COUNT = 2

/** case_number → label + title. 1..5 easy, 6..7 hard. */
const CATALOG: Record<number, { label: string; title: string; difficulty: Difficulty }> = {
  1: { label: 'E1', title: 'Easy Case · 01', difficulty: 'easy' },
  2: { label: 'E2', title: 'Easy Case · 02', difficulty: 'easy' },
  3: { label: 'E3', title: 'Easy Case · 03', difficulty: 'easy' },
  4: { label: 'E4', title: 'Easy Case · 04', difficulty: 'easy' },
  5: { label: 'E5', title: 'Easy Case · 05', difficulty: 'easy' },
  6: { label: 'H1', title: 'Hard Case · 01', difficulty: 'hard' },
  7: { label: 'H2', title: 'Hard Case · 02', difficulty: 'hard' },
}

export function difficultyFor(caseNumber: number): Difficulty {
  return CATALOG[caseNumber]?.difficulty ?? 'easy'
}

export function labelFor(caseNumber: number): string {
  return CATALOG[caseNumber]?.label ?? String(caseNumber)
}

export function titleFor(caseNumber: number): string {
  return CATALOG[caseNumber]?.title ?? `Case ${caseNumber}`
}

function buildCase(n: number): CaseConfig {
  const meta = CATALOG[n]
  const label = meta?.label ?? String(n)
  return {
    number: n,
    label,
    title: meta?.title ?? `Case ${n}`,
    // PDFs served from public/cases/<label-lowercased>.pdf
    pdfPath: `/cases/${label.toLowerCase()}.pdf`,
    difficulty: meta?.difficulty ?? 'easy',
  }
}

/** All 7 cases, in order (both tracks share). */
export function getCases(_track: Track): CaseConfig[] {
  return Array.from({ length: CASE_COUNT }, (_, i) => buildCase(i + 1))
}

/** Just the easy pool — fed into the wheel. */
export function getEasyCases(track: Track): CaseConfig[] {
  return getCases(track).filter((c) => c.difficulty === 'easy')
}

/** Just the hard pool — fed into the coin toss. */
export function getHardCases(track: Track): CaseConfig[] {
  return getCases(track).filter((c) => c.difficulty === 'hard')
}

export function getCase(track: Track, n: number): CaseConfig | undefined {
  return getCases(track).find((c) => c.number === n)
}

export const TRACK_LABEL: Record<Track, string> = {
  junior: 'The Mystery Squad',
  senior: 'The Mystery Masters',
}

export const TRACK_DESCRIPTION: Record<Track, string> = {
  junior:
    'For 1st and 2nd-year investigators. Five easy cases on the wheel, two hard cases behind the coin.',
  senior:
    'For 3rd and 4th-year investigators. Five easy cases on the wheel, two hard cases behind the coin.',
}
