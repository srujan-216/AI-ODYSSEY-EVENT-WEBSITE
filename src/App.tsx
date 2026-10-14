import { Route, Routes } from 'react-router-dom'
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
  return (
    <div className="min-h-screen flex flex-col relative">
      <Backdrop />
      <Nav />
      <NotConfiguredBanner />
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
      <Footer />
    </div>
  )
}
