import { FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Lock, Loader2, ShieldCheck, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/auth'

export function Login() {
  const { signIn, session, profile, configured, loading } = useAuth()
  const nav = useNavigate()
  const loc = useLocation() as any
  const from = loc.state?.from && typeof loc.state.from === 'string' ? loc.state.from : '/admin'

  // The field accepts either the reserved username ("admin") or an email.
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (loading) return
    if (session && (profile?.role === 'admin' || profile?.role === 'coordinator')) {
      nav(from === '/login' ? '/admin' : from, { replace: true })
    }
  }, [session, profile, loading, nav, from])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await signIn(identifier.trim(), password)
    setBusy(false)
    if (res.error) {
      setError(res.error)
      return
    }
    // profile effect above handles redirect once role loads
  }

  return (
    <section className="min-h-[80vh] grid place-items-center px-4 py-10">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-cyber-cyan/10 border border-cyber-cyan/40 grid place-items-center text-cyber-cyan">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="h-display text-xl text-white">Secure sign-in</h1>
            <p className="text-xs text-slate-400">Administrators &amp; coordinators only</p>
          </div>
        </div>

        {!configured && (
          <div className="mb-4 rounded-md border border-cyber-amber/40 bg-cyber-amber/10 text-cyber-amber text-xs p-3">
            Supabase isn't configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code>, apply{' '}
            <code>supabase/schema.sql</code>, and create an admin account via the Supabase
            dashboard (see README).
          </div>
        )}

        <label className="section-title block mb-2" htmlFor="identifier">
          Username or email
        </label>
        <div className="relative mb-1">
          <User
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            spellCheck={false}
            autoCapitalize="off"
            required
            placeholder="admin"
            className="cyber-input pl-10"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={busy}
          />
        </div>
        <p className="text-[0.65rem] text-slate-500 mb-4 pl-1">
          Admins sign in with the reserved username{' '}
          <code className="text-cyber-cyan">admin</code>. Coordinators sign in with
          their email.
        </p>

        <label className="section-title block mb-2" htmlFor="password">
          Password
        </label>
        <div className="relative mb-6">
          <Lock
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            className="cyber-input pl-10"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-cyber-danger/40 bg-cyber-danger/10 text-cyber-danger text-xs p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy || !configured}
          className="cyber-btn cyber-btn-primary w-full py-3 text-sm"
        >
          {busy ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Authenticating…
            </>
          ) : (
            <>Authenticate</>
          )}
        </button>

        <p className="text-[0.65rem] text-slate-500 text-center mt-5">
          Passwords are never stored by this site. Authentication is handled by Supabase Auth.
        </p>
      </motion.form>
    </section>
  )
}
