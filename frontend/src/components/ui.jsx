import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

// Fades and lifts its children in the first time they scroll into view.
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} style={{ animationDelay: `${delay}s` }} className={`${seen ? 'animate-reveal' : 'opacity-0'} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display text-[22px] font-semibold tracking-tight ${className}`}>
      <Mark />
      Rokesh
    </span>
  )
}

export function Mark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id="mk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4b3387" /><stop offset="1" stopColor="#da9ef0" /></linearGradient></defs>
      <rect width="32" height="32" rx="9" fill="url(#mk)" />
      <path fill="#fff" d="M7.5 16.2 23.5 8l-6.4 16.2-2.3-6.4z" />
    </svg>
  )
}

// A link that renders as a gradient pill button. `to` for router links, `href` for external.
export function Btn({ to, href, outline, small, className = '', children, ...rest }) {
  const cls = `btn ${outline ? 'btn-o' : ''} ${small ? 'btn-sm' : ''} ${className}`
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>
  return <button className={cls} {...rest}>{children}</button>
}

export const Tag = ({ children, className = '' }) => <span className={`tag ${className}`}>{children}</span>

export function Section({ id, className = '', children }) {
  return <section id={id} className={`py-20 max-md:py-14 ${className}`}>{children}</section>
}

// Animated number that counts up when scrolled into view.
export function CountUp({ end, suffix = '' }) {
  const ref = useRef(null)
  const [n, setN] = useState(0)
  useEffect(() => {
    const el = ref.current
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setN(end); return }
    let raf
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const step = (t) => { const p = Math.min(1, (t - t0) / 1400); setN(end * (1 - (1 - p) ** 3)); if (p < 1) raf = requestAnimationFrame(step) }
      raf = requestAnimationFrame(step)
    })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [end])
  return <span ref={ref}>{Math.round(n)}{suffix}</span>
}
