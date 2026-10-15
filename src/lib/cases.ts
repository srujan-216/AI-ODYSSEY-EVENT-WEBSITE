import type { Track } from './types'

/**
 * Case PDF configuration.
 *
 * There are **six case briefs total**, shared across both tracks (Junior and
 * Senior point at the same PDF per case number). Drop PDFs into
 * `public/cases/` named `case-NN.pdf`, zero-padded (`case-01.pdf` …
 * `case-06.pdf`). To re-point a single case, edit `pdfPath` below —
 * it is the only source of truth.
 */
export interface CaseConfig {
  number: number
  label: string
  title: string
  pdfPath: string
}

export const CASE_COUNT = 6

const SHARED_TITLES: Record<number, string> = {
  1: 'The Vanishing Dataset',
  2: 'Ghost in the Mainframe',
  3: 'Operation Blackbox',
  4: 'The Encrypted Letter',
  5: 'Neural Heist',
  6: 'Deepfake Protocol',
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function getCases(_track: Track): CaseConfig[] {
  // Both divisions carry the same six sealed case files.
  return Array.from({ length: CASE_COUNT }, (_, i) => {
    const n = i + 1
    return {
      number: n,
      label: pad(n),
      title: SHARED_TITLES[n] ?? `Case ${pad(n)}`,
      pdfPath: `/cases/case-${pad(n)}.pdf`,
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
