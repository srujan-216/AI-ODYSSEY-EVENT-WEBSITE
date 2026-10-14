import type { Track } from './types'

/**
 * Case PDF configuration.
 *
 * To replace or re-point case briefs, drop PDFs into `public/cases/junior/` or
 * `public/cases/senior/`. The file name must match `case-NN.pdf` where NN is a
 * zero-padded number. You can also override `pdfPath` here without touching
 * the rest of the codebase.
 */
export interface CaseConfig {
  number: number
  label: string
  title: string
  pdfPath: string
}

const JUNIOR_TITLES: Record<number, string> = {
  1: 'The Vanishing Dataset',
  2: 'Ghost in the Mainframe',
  3: 'Rogue Signal',
  4: 'The Encrypted Letter',
  5: 'Phantom Protocol',
}

const SENIOR_TITLES: Record<number, string> = {
  1: 'Operation Blackbox',
  2: 'Neural Heist',
  3: 'The Quantum Thief',
  4: 'Zero-Day Shadow',
  5: 'Deepfake Protocol',
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

export function getCases(track: Track): CaseConfig[] {
  // Both divisions carry 5 sealed case files.
  const count = 5
  const titles = track === 'junior' ? JUNIOR_TITLES : SENIOR_TITLES
  return Array.from({ length: count }, (_, i) => {
    const n = i + 1
    return {
      number: n,
      label: pad(n),
      title: titles[n] ?? `Case ${pad(n)}`,
      pdfPath: `/cases/${track}/case-${pad(n)}.pdf`,
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
  junior: 'For 1st and 2nd-year investigators. Five sealed case files await.',
  senior: 'For 3rd and 4th-year investigators. Five high-complexity cases await.',
}
