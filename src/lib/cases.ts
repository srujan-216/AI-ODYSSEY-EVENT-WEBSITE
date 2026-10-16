import type { Track } from './types'

/**
 * Case catalog.
 *
 * Seven case briefs total. The two tracks are dedicated to their own pool:
 *   • Junior  ("The Mystery Squad")   → 5 EASY cases, assigned by the wheel.
 *                                       case_number 1..5, labels E1..E5.
 *   • Senior  ("The Mystery Masters") → 2 HARD cases, assigned by the coin.
 *                                       case_number 6..7, labels H1..H2.
 *
 * Juniors never see hard cases; seniors never see easy cases. If that split
 * ever changes, update CATALOG, src/pages/Dashboard.tsx (mechanismForTrack),
 * and the server inside `assign_case()` (migration 0007) together — the
 * server infers difficulty from the track, so drift here means refused spins.
 *
 * PDFs live at `/cases/<label>.pdf` (e.g. `/cases/e1.pdf`, `/cases/h2.pdf`).
 */
export type Difficulty = 'easy' | 'hard'
export type Mechanism = 'wheel' | 'coin'

export interface CaseConfig {
  number: number
  /** Human-visible label: E1..E5 for easy, H1..H2 for hard. */
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

/** Each track is bound to one difficulty pool and one mechanism. */
export const TRACK_DIFFICULTY: Record<Track, Difficulty> = {
  junior: 'easy',
  senior: 'hard',
}
export const TRACK_MECHANISM: Record<Track, Mechanism> = {
  junior: 'wheel',
  senior: 'coin',
}
export const TRACK_POOL_SIZE: Record<Track, number> = {
  junior: EASY_COUNT,
  senior: HARD_COUNT,
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

/** Cases visible to a given track. Junior → 5 easy; Senior → 2 hard. */
export function getCases(track: Track): CaseConfig[] {
  const diff = TRACK_DIFFICULTY[track]
  return Array.from({ length: CASE_COUNT }, (_, i) => buildCase(i + 1)).filter(
    (c) => c.difficulty === diff,
  )
}

/** The full catalog — used by admin tooling that must see every case. */
export function getAllCases(): CaseConfig[] {
  return Array.from({ length: CASE_COUNT }, (_, i) => buildCase(i + 1))
}

export function getCase(_track: Track, n: number): CaseConfig | undefined {
  // Admin may look up any case regardless of track, so search the full catalog.
  return getAllCases().find((c) => c.number === n)
}

export const TRACK_LABEL: Record<Track, string> = {
  junior: 'The Mystery Squad',
  senior: 'The Mystery Masters',
}

export const TRACK_DESCRIPTION: Record<Track, string> = {
  junior:
    'For 1st and 2nd-year investigators. Five easy cases, dealt by the spin wheel. One case active at a time — hand the report in before spinning again.',
  senior:
    'For 3rd and 4th-year investigators. Two hard cases, dealt by the coin toss. One case active at a time — hand the report in before tossing again.',
}
