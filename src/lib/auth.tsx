import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'
import type { Profile } from './types'

/**
 * Reserved username → email map. Keeps the Login UI friendly ("admin") while
 * Supabase Auth continues to authenticate against a real email. We never
 * expose a lookup endpoint for emails — this map is a FIXED convention, so
 * no directory of registered accounts can be probed through this field.
 *
 * To add another named account later: register the user in Supabase Auth with
 * the matching email, promote their profile role, and add an entry here.
 */
const USERNAME_EMAIL_MAP: Record<string, string> = {
  admin: 'srujan.k216@gmail.com',
}

/**
 * Resolve a raw identifier (what the user typed) to the email Supabase Auth
 * expects. If the input contains '@', it's used as-is. If it's a reserved
 * username ('admin'), it is translated. Otherwise returns null so the UI can
 * ask the user for an email.
 */
export function resolveLoginIdentifier(raw: string): string | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  if (v.includes('@')) return v
  return USERNAME_EMAIL_MAP[v] ?? null
}

/**
 * Pick a human display name for the signed-in operator. Order of preference:
 *   1. profile.full_name (admin-set, via the tightened self-update policy)
 *   2. reserved username that maps to profile.email (reverse of the map)
 *   3. the local-part of the email
 */
export function displayNameFor(profile: Profile | null): string {
  if (!profile) return ''
  if (profile.full_name && profile.full_name.trim().length > 0) {
    return profile.full_name.trim()
  }
  const reserved = Object.entries(USERNAME_EMAIL_MAP).find(
    ([, email]) => email.toLowerCase() === profile.email.toLowerCase(),
  )
  if (reserved) return reserved[0]
  return profile.email.split('@')[0]
}

interface AuthState {
  session: Session | null
  profile: Profile | null
  loading: boolean
  configured: boolean
  /** Accepts a username or email. See resolveLoginIdentifier. */
  signIn: (identifier: string, password: string) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthCtx = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string | undefined) => {
    if (!userId || !isSupabaseConfigured) {
      setProfile(null)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, email, role, full_name')
      .eq('id', userId)
      .maybeSingle()
    setProfile((data as Profile | null) ?? null)
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const {
        data: { session: s },
      } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(s)
      await loadProfile(s?.user?.id)
      setLoading(false)
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      setSession(s)
      await loadProfile(s?.user?.id)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      configured: isSupabaseConfigured,
      async signIn(identifier, password) {
        if (!isSupabaseConfigured) {
          return { error: 'Supabase is not configured. See README.' }
        }
        const email = resolveLoginIdentifier(identifier)
        if (!email) {
          return {
            error:
              'Unknown username. Enter the reserved admin username or your full email address.',
          }
        }
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        return error ? { error: error.message } : {}
      },
      async signOut() {
        await supabase.auth.signOut()
        setProfile(null)
      },
      async refreshProfile() {
        await loadProfile(session?.user?.id)
      },
    }),
    [session, profile, loading],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
