import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ShieldAlert } from 'lucide-react'

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="chip">Verifying credentials…</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  const authorized = profile?.role === 'admin' || profile?.role === 'coordinator'

  if (!authorized) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-4">
        <div className="glass max-w-md w-full p-8 rounded-xl text-center">
          <ShieldAlert className="mx-auto text-cyber-danger" size={32} />
          <h2 className="h-display text-xl mt-3 text-white">Access denied</h2>
          <p className="text-sm text-slate-400 mt-2">
            Your account is signed in but has not been granted investigator privileges. Ask a
            system administrator to add your profile to the <code>profiles</code> table with role{' '}
            <code className="text-cyber-cyan">admin</code> or{' '}
            <code className="text-cyber-cyan">coordinator</code>.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
