export type Track = 'junior' | 'senior'

export interface TeamAssignment {
  id: string
  team_name: string
  track: Track
  case_number: number
  assigned_at: string
}

export interface LeaderboardEntry {
  id: string
  team_name: string
  track: Track
  score: number
  completion_time: string | null
  status: string | null
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
  score: number
  completion_time?: string | null
  status?: string | null
}

export interface RowValidation {
  row: number
  input: Record<string, string>
  parsed?: CsvRow
  errors: string[]
  isDuplicateOfExisting: boolean
  isDuplicateInFile: boolean
}
