import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { LogIn, LogOut, Menu, Shield, UserPlus, X } from 'lucide-react'

const REGISTER_URL = 'https://qrto.org/qKg92C'
import { Logo } from './Logo'
import { useAuth, displayNameFor } from '../lib/auth'

const links = [
  { to: '/', label: 'Home' },
  { to: '/tracks', label: 'Investigate' },
  { to: '/leaderboard', label: 'Leaderboard' },
]

export function Nav() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  const isAdmin = profile?.role === 'admin' || profile?.role === 'coordinator'

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-bg-900/70 border-b border-cyber-cyan/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center" aria-label="Home">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-10">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `relative px-4 py-2 font-display tracking-[0.2em] uppercase text-xs transition-colors
                 ${isActive ? 'text-white' : 'text-slate-300 hover:text-white'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span>{l.label}</span>
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-px bg-gradient-to-r from-transparent via-cyber-cyan to-transparent" />
                  )}
                </>
              )}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `relative px-4 py-2 font-display tracking-[0.2em] uppercase text-xs transition-colors
                 ${isActive ? 'text-cyber-violet' : 'text-cyber-violet/80 hover:text-cyber-violet'}`
              }
            >
              Control Room
            </NavLink>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <a
            href={REGISTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="cyber-btn cyber-btn-primary text-xs"
          >
            <UserPlus size={14} /> Register
          </a>
          {session && isAdmin ? (
            <>
              <span className="chip chip-violet" title={`${displayNameFor(profile)} · ${profile?.email ?? ''}`}>
                <Shield size={11} /> {profile?.role?.toUpperCase()}
              </span>
              <button
                onClick={async () => {
                  await signOut()
                  navigate('/')
                }}
                className="cyber-btn cyber-btn-ghost text-xs"
              >
                <LogOut size={14} /> Log out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              state={{ from: location.pathname }}
              className="cyber-btn cyber-btn-ghost text-xs"
            >
              <LogIn size={14} /> Log in
            </Link>
          )}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden text-cyber-cyan p-2"
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-cyber-cyan/10 bg-bg-900/95">
          <div className="px-4 py-4 flex flex-col gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={close}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md font-display tracking-widest uppercase text-sm
                   ${isActive ? 'text-white bg-cyber-cyan/10' : 'text-slate-300 hover:bg-white/5'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={close}
                className="px-3 py-2 rounded-md font-display tracking-widest uppercase text-sm text-cyber-violet hover:bg-cyber-violet/10"
              >
                Control Room
              </NavLink>
            )}
            <div className="pt-3 mt-3 border-t border-cyber-cyan/10 flex flex-col gap-2">
              <a
                href={REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="cyber-btn cyber-btn-primary w-full"
              >
                <UserPlus size={14} /> Register
              </a>
              {session && isAdmin ? (
                <button
                  onClick={async () => {
                    close()
                    await signOut()
                    navigate('/')
                  }}
                  className="cyber-btn cyber-btn-ghost w-full"
                >
                  <LogOut size={14} /> Log out
                </button>
              ) : (
                <Link
                  to="/login"
                  state={{ from: location.pathname }}
                  onClick={close}
                  className="cyber-btn cyber-btn-ghost w-full"
                >
                  <LogIn size={14} /> Log in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
