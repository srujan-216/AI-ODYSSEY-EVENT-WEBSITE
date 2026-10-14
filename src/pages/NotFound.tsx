import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <section className="min-h-[60vh] grid place-items-center px-4 text-center">
      <div>
        <div className="section-title">// 404 · Signal lost</div>
        <h1 className="h-display text-5xl md:text-7xl mt-3 text-white glow-text">UNKNOWN</h1>
        <p className="text-slate-400 mt-4 max-w-md">
          The coordinates you tried to reach don't exist in this investigation. Return to base and
          pick another thread.
        </p>
        <Link to="/" className="cyber-btn cyber-btn-primary mt-8">
          Return to base
        </Link>
      </div>
    </section>
  )
}
