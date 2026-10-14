import { useEffect, useRef } from 'react'

/**
 * Full-page animated backdrop: fixed canvas drifting particles behind the
 * grid/scanline that live in CSS (.cyber-backdrop). Pauses when the tab is
 * hidden so it does not thrash the GPU.
 */
export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = (canvas.width = window.innerWidth)
    let h = (canvas.height = window.innerHeight)
    let raf = 0
    let running = true

    const PARTICLES = Math.min(80, Math.floor((w * h) / 24000))
    type P = { x: number; y: number; vx: number; vy: number; r: number; hue: number }
    const parts: P[] = Array.from({ length: PARTICLES }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 0.4,
      hue: Math.random() < 0.75 ? 190 : 260,
    }))

    const onResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    const onVis = () => {
      running = !document.hidden
      if (running) tick()
    }
    document.addEventListener('visibilitychange', onVis)

    const tick = () => {
      if (!running) return
      ctx.clearRect(0, 0, w, h)
      for (const p of parts) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 95%, 65%, 0.55)`
        ctx.shadowBlur = 10
        ctx.shadowColor = `hsla(${p.hue}, 90%, 60%, 0.9)`
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <>
      <div className="cyber-backdrop" aria-hidden />
      <canvas
        ref={ref}
        aria-hidden
        className="fixed inset-0 pointer-events-none opacity-70"
        style={{ zIndex: -1 }}
      />
    </>
  )
}
