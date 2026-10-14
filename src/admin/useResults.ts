import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { LeaderboardEntry } from '../lib/types'

export function useResults() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('results')
      .select('*')
      .order('score', { ascending: false })
    if (error) {
      setError(error.message)
      setRows([])
    } else {
      setError(null)
      setRows((data as LeaderboardEntry[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    if (!isSupabaseConfigured) return
    const ch = supabase
      .channel('admin-results-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'results' },
        () => refresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [refresh])

  return { rows, loading, error, refresh }
}
