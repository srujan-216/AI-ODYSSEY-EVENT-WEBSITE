import { AlertCircle } from 'lucide-react'
import { useAuth } from '../lib/auth'

export function NotConfiguredBanner() {
  const { configured } = useAuth()
  if (configured) return null
  return (
    <div className="bg-cyber-amber/10 border-y border-cyber-amber/30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-start gap-3 text-xs text-cyber-amber">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <p>
          <span className="font-display tracking-widest uppercase">Backend not configured —</span>{' '}
          set <code className="text-cyber-cyan">VITE_SUPABASE_URL</code> and{' '}
          <code className="text-cyber-cyan">VITE_SUPABASE_ANON_KEY</code> in <code>.env</code>, apply{' '}
          <code>supabase/schema.sql</code>, then restart <code>npm run dev</code>. See README.
        </p>
      </div>
    </div>
  )
}
