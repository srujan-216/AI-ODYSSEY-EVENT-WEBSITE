import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anon)

/**
 * Supabase client. If env vars are missing, we export a stub so the UI can still
 * render and the admin screens can show a clear "not configured" message instead
 * of crashing. All data-mutating paths MUST check isSupabaseConfigured first.
 */
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : (createDisabledClient() as unknown as SupabaseClient)

function createDisabledClient() {
  const err = () =>
    Promise.resolve({
      data: null,
      error: { message: 'Supabase is not configured. See README.' },
    })
  return {
    from() {
      return {
        select: err,
        insert: err,
        update: err,
        upsert: err,
        delete: err,
        eq() {
          return this
        },
        order() {
          return this
        },
        single: err,
        maybeSingle: err,
      }
    },
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
      signInWithPassword: err,
      signOut: err,
    },
    channel() {
      return {
        on() {
          return this
        },
        subscribe() {
          return this
        },
        unsubscribe() {},
      }
    },
    removeChannel() {},
  }
}
