export type Track = 'junior' | 'senior'
export type Difficulty = 'easy' | 'hard'

export interface TeamAssignment {
  id: string
  team_name: string
  track: Track
  case_number: number
  difficulty: Difficulty | null
  assigned_at: string
}

export interface LeaderboardEntry {
  id: string
  team_name: string
  track: Track
  cases_solved: number
  score: number
  completion_time: string | null
  /** Total time the team actually spent solving cases, in whole seconds.
   *  SUM across solved cases of (completion_time − assigned_at).
   *  NULL when none of the team's solved cases has a usable assigned_at. */
  time_taken_seconds: number | null
  status: string | null
  is_demo: boolean
  updated_at: string
}

export interface ResultRow {
  id: string
  team_name: string
  track: Track
  case_number: number
  difficulty: Difficulty | null
  score: number
  completion_time: string | null
  status: string | null
  is_solved: boolean
  is_demo: boolean
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  role: 'admin' | 'coordinator'
  full_name: string | null
}

export interface CsvRow {
  team_name: string
  track: Track
  case_number: number
  score: number
  completion_time?: string | null
  status?: string | null
  is_solved?: boolean
}

export interface RowValidation {
  row: number
  input: Record<string, string>
  parsed?: CsvRow
  errors: string[]
  isDuplicateOfExisting: boolean
  isDuplicateInFile: boolean
}

