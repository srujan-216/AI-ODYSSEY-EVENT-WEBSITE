import { Route, Routes, useLocation, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { Backdrop } from './components/Backdrop'
import { NotConfiguredBanner } from './components/NotConfiguredBanner'
import { Landing } from './pages/Landing'
import { Tracks } from './pages/Tracks'
import { Dashboard } from './pages/Dashboard'
import { Leaderboard } from './pages/Leaderboard'
import { Login } from './pages/Login'
import { Admin } from './pages/Admin'
import { NotFound } from './pages/NotFound'

export default function App() {
  const location = useLocation()
  const isLeaderboard = location.pathname === '/leaderboard'

  return (
    <div className="min-h-screen flex flex-col relative bg-[#02050e]">
      <Backdrop />
      {!isLeaderboard && <Nav />}
      {!isLeaderboard && <NotConfiguredBanner />}
      {isLeaderboard && (
        <Link
          to="/"
          className="fixed top-3 left-4 z-50 text-slate-500 hover:text-cyan-400 font-mono text-[11px] flex items-center gap-1.5 opacity-40 hover:opacity-100 transition-all bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10"
          title="Return to AI Odyssey Home"
        >
          <ArrowLeft size={12} />
          <span>HUB</span>
        </Link>
      )}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/tracks" element={<Tracks />} />
          <Route path="/dashboard/:track" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isLeaderboard && <Footer />}
    </div>
  )
}
