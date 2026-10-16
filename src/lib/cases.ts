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
  /** Human-visible label: E1..E6 for easy, H1..H2 for hard. */
  label: string
  title: string
  /** One-line teaser shown on the case reveal + case index. */
  tagline: string
  pdfPath: string
  difficulty: Difficulty
}

export const CASE_COUNT = 8
export const EASY_COUNT = 6
export const HARD_COUNT = 2

/**
 * Case catalog — single source of truth for every label, title, and tagline
 * shown anywhere on the site. Arranged in the exact draw order:
 *
 *   case_number 1..6 → E1..E6 (easy, Mystery Squad, wheel)
 *   case_number 7..8 → H1..H2 (hard, Mystery Masters, coin toss)
 *
 * To rename a case, edit this one map — nothing else needs to change.
 */
const CATALOG: Record<
  number,
  { label: string; title: string; tagline: string; difficulty: Difficulty }
> = {
  1: {
    label: 'E1',
    title: 'The Vanishing Dataset',
    tagline: 'A nightly export comes up empty. The pipeline swears it ran.',
    difficulty: 'easy',
  },
  2: {
    label: 'E2',
    title: 'Ghost in the Mainframe',
    tagline: 'The log tails show a user who never logged in.',
    difficulty: 'easy',
  },
  3: {
    label: 'E3',
    title: 'Operation Blackbox',
    tagline: 'The model keeps answering. No one can explain why.',
    difficulty: 'easy',
  },
  4: {
    label: 'E4',
    title: 'The Encrypted Letter',
    tagline: 'A ciphered memo. Three suspects. One alibi too many.',
    difficulty: 'easy',
  },
  5: {
    label: 'E5',
    title: 'Signal Fade',
    tagline: 'A field transmission cuts out mid-sentence. Trace the drop.',
    difficulty: 'easy',
  },
  6: {
    label: 'E6',
    title: 'The Phantom Commit',
    tagline: 'The diff is signed by someone who left two years ago.',
    difficulty: 'easy',
  },
  7: {
    label: 'H1',
    title: 'Neural Heist',
    tagline: 'The weights are gone. The audit trail says they never left.',
    difficulty: 'hard',
  },
  8: {
    label: 'H2',
    title: 'Deepfake Protocol',
    tagline: 'Four witnesses, four stories, one voice that was never there.',
    difficulty: 'hard',
  },
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

export function taglineFor(caseNumber: number): string {
  return CATALOG[caseNumber]?.tagline ?? ''
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
    tagline: meta?.tagline ?? '',
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

/**
 * Final hand-in deadline for the offline written report. Shown on the case
 * reveal and anywhere else the countdown matters. Pure display string — the
 * server does not enforce this; a coordinator can still record a submission
 * after the deadline if circumstances allow.
 */
export const REPORT_DEADLINE_LABEL = '4:00 PM today'
export const REPORT_DEADLINE_SHORT = '16:00'

export const TRACK_LABEL: Record<Track, string> = {
  junior: 'The Mystery Squad',
  senior: 'The Mystery Masters',
}

export const TRACK_DESCRIPTION: Record<Track, string> = {
  junior:
    'For 1st and 2nd-year investigators. Six easy cases, dealt by the spin wheel. One case active at a time — hand the report in before spinning again.',
  senior:
    'For 3rd and 4th-year investigators. Two hard cases, dealt by the coin toss. One case active at a time — hand the report in before tossing again.',
}
