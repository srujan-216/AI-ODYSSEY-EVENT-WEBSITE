import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-cyber-cyan/10 bg-bg-900/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="text-xs text-slate-400 max-w-md leading-relaxed">
            Decode the clues. Investigate the unknown. Crack the case. A technical AI treasure
            hunt presented by EMEL Club, CSE-Allied, MVSR Engineering College.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs">
          <div>
            <div className="section-title mb-2">Hosted by</div>
            <ul className="space-y-1 text-slate-300">
              <li>EMEL Club</li>
              <li>CSE-Allied</li>
              <li>MVSR Engineering College</li>
            </ul>
          </div>
          <div>
            <div className="section-title mb-2">Under</div>
            <ul className="space-y-1 text-slate-300">
              <li>SHIKHARA '26</li>
              <li>SAMAVARTHAN '26</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-cyber-cyan/5 py-4 text-center text-[0.65rem] tracking-[0.3em] uppercase text-slate-500">
        © {new Date().getFullYear()} · AI Odyssey × CodeHunt · All signals monitored
      </div>
    </footer>
  )
}
