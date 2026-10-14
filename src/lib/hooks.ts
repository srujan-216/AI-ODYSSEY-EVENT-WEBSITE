import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 3D tilt that reads the pointer position relative to the element center and
 * applies a `rotateX/rotateY` + translateZ transform. Attach the returned
 * handlers to any element and set `style={{ transform }}`.
 *
 * - Respects prefers-reduced-motion (returns identity transforms).
 * - Smoothly settles with a short transition when the pointer leaves.
 * - Max tilt is set per instance via `max` (degrees).
 */
export function useTilt({ max = 10 } = {}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [style, setStyle] = useState<React.CSSProperties>({
    transform:
      'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)',
    transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
  })
  const reduce = typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    : false

  const onMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (reduce) return
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height
      const rx = (0.5 - py) * max * 2
      const ry = (px - 0.5) * max * 2
      setStyle({
        transform: `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translate3d(0,0,12px)`,
        transition: 'transform 0.08s linear',
      })
    },
    [max, reduce],
  )

  const onLeave = useCallback(() => {
    setStyle({
      transform:
        'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)',
      transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
    })
  }, [])

  return { ref, style, onMove, onLeave }
}

/**
 * Global pointer position normalised to [-1, 1] from the viewport center.
 * Used by the hero to drive parallax layers.
 */
export function useGlobalParallax() {
  const [p, setP] = useState({ x: 0, y: 0 })
  const reduce = typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    : false

  useEffect(() => {
    if (reduce) return
    let raf = 0
    let target = { x: 0, y: 0 }
    const current = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      target = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      }
    }
    const tick = () => {
      // ease toward target
      current.x += (target.x - current.x) * 0.08
      current.y += (target.y - current.y) * 0.08
      setP({ x: current.x, y: current.y })
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [reduce])

  return p
}

/**
 * Count up to a target number over `duration` ms (easeOutQuart). Returns the
 * current integer value for display.
 */
export function useCountUp(target: number, duration = 1200) {
  const [v, setV] = useState(0)
  const startedRef = useRef(false)
  const reduce = typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    : false

  useEffect(() => {
    if (reduce) {
      setV(target)
      return
    }
    startedRef.current = true
    const start = performance.now()
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 4)
      setV(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduce])

  return v
}

/**
 * Boolean becomes true after `delay` ms. For gated reveal animations.
 */
export function useDelayed(delay = 0) {
  const [on, setOn] = useState(delay === 0)
  useEffect(() => {
    if (delay === 0) return
    const t = setTimeout(() => setOn(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  return on
}

/**
 * Typewriter — reveals `text` one character at a time. Respects reduced motion.
 */
export function useTypewriter(text: string, speedMs = 24) {
  const reduce = typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    : false
  const [n, setN] = useState(reduce ? text.length : 0)
  useEffect(() => {
    if (reduce) {
      setN(text.length)
      return
    }
    setN(0)
    let i = 0
    const t = setInterval(() => {
      i += 1
      setN(i)
      if (i >= text.length) clearInterval(t)
    }, speedMs)
    return () => clearInterval(t)
  }, [text, speedMs, reduce])
  return text.slice(0, n)
}
