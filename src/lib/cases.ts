import type { Track } from './types'

/**
 * Case PDF configuration.
 *
 * There are **six case briefs total**, shared across both tracks (Junior and
 * Senior point at the same PDF per case number). Drop PDFs into
 * `public/cases/` named `case-NN.pdf`, zero-padded (`case-01.pdf` …
 * `case-06.pdf`). To re-point a single case, edit `pdfPath` below —
 * it is the only source of truth.
 *
 * Difficulty split: **4 easy + 2 hard**. Mirrored on the server inside
 * `assign_case()` in `supabase/migrations/0004_live_assignments.sql`. If you
 * move the split, update both or the DB-stamped difficulty will drift from
 * what the UI shows.
 */
export type Difficulty = 'easy' | 'hard'

export interface CaseConfig {
  number: number
  label: string
  title: string
  pdfPath: string
  difficulty: Difficulty
}

export const CASE_COUNT = 6

const SHARED: Record<number, { title: string; difficulty: Difficulty }> = {
  1: { title: 'The Vanishing Dataset', difficulty: 'easy' },
  2: { title: 'Ghost in the Mainframe', difficulty: 'easy' },
  3: { title: 'Operation Blackbox', difficulty: 'easy' },
  4: { title: 'The Encrypted Letter', difficulty: 'easy' },
  5: { title: 'Neural Heist', difficulty: 'hard' },
  6: { title: 'Deepfake Protocol', difficulty: 'hard' },
}

export function difficultyFor(caseNumber: number): Difficulty {
  return SHARED[caseNumber]?.difficulty ?? 'easy'
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function getCases(_track: Track): CaseConfig[] {
  // Both divisions carry the same six sealed case files.
  return Array.from({ length: CASE_COUNT }, (_, i) => {
    const n = i + 1
    const meta = SHARED[n]
    return {
      number: n,
      label: pad(n),
      title: meta?.title ?? `Case ${pad(n)}`,
      pdfPath: `/cases/case-${pad(n)}.pdf`,
      difficulty: meta?.difficulty ?? 'easy',
    }
  })
}

export function getCase(track: Track, n: number): CaseConfig | undefined {
  return getCases(track).find((c) => c.number === n)
}

export const TRACK_LABEL: Record<Track, string> = {
  junior: 'The Mystery Squad',
  senior: 'The Mystery Masters',
}

export const TRACK_DESCRIPTION: Record<Track, string> = {
  junior: 'For 1st and 2nd-year investigators. Six sealed case files await.',
  senior: 'For 3rd and 4th-year investigators. Six high-stakes cases await.',
}
