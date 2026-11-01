import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Btn, Logo, Reveal } from './ui'

const NAV = [['/pricing', 'Pricing'], ['/channels', 'Channels'], ['/solutions', 'Solutions'], ['/case-studies', 'Case Studies'], ['/blog', 'Resources']]

function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => {
    const on = () => setScrolled(scrollY > 8)
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-4">
      <nav className={`pointer-events-auto relative mx-auto mt-4 flex max-w-[1120px] items-center gap-4 rounded-full border py-2 pr-3 pl-5 transition-all duration-300 max-lg:bg-white/85 max-lg:backdrop-blur-md ${scrolled ? 'border-ink/10 bg-white/80 shadow-[0_14px_34px_-22px_rgba(72,57,83,.55)] backdrop-blur-xl' : 'border-transparent'}`}>
        <Link to="/" className="text-ink no-underline"><Logo /></Link>
        <div className={`${open ? 'flex' : 'hidden'} absolute inset-x-1.5 top-[calc(100%+8px)] flex-col gap-1 rounded-3xl border border-ink/10 bg-white p-4 shadow-soft lg:static lg:mx-auto lg:flex lg:flex-row lg:gap-0.5 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none`}>
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `rounded-full px-3.5 py-2 text-[15px] font-medium whitespace-nowrap text-ink no-underline transition hover:bg-ink/5 hover:opacity-100 max-lg:py-3 ${isActive ? 'bg-ink/5 opacity-100' : 'opacity-80'}`}>{label}</NavLink>
          ))}
          <Link to="/login" className="rounded-full px-3.5 py-3 text-[15px] font-medium text-ink no-underline lg:hidden">Login</Link>
          <Btn to="/#contact" className="mt-2 lg:hidden">Book a Demo</Btn>
        </div>
        <div className="ml-auto flex items-center gap-2.5 max-lg:hidden">
          <Btn to="/login" outline small>Login</Btn>
          <Btn to="/#contact" small>Book a Demo</Btn>
        </div>
        <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="ml-auto grid size-10 cursor-pointer place-items-center rounded-xl border border-ink/20 bg-white/70 text-xl text-ink lg:hidden">☰</button>
      </nav>
    </header>
  )
}

export function CtaBlock() {
  return (
    <section className="pb-24">
      <div className="wrap">
        <Reveal className="relative overflow-hidden rounded-[32px] bg-night px-6 py-16 text-center text-white">
          <h2 className="text-[clamp(30px,4.4vw,48px)] font-semibold">See Rokesh <span className="text-accent">in action</span></h2>
          <p className="mx-auto mt-3 mb-7 max-w-xl text-white/80">Schedule a demo to explore how Rokesh runs workflows across your systems and channels.</p>
          <Btn to="/#contact">Book a demo</Btn>
        </Reveal>
      </div>
    </section>
  )
}

const FOOT = [
  ['Pages', [['/', 'Home'], ['/pricing', 'Pricing'], ['/channels', 'Channels'], ['/solutions', 'Solutions'], ['/blog', 'Resources'], ['/case-studies', 'Case Studies'], ['/careers', 'Careers']]],
  ['Appendix', [['/privacy', 'Privacy Policy'], ['/terms', 'Terms & Conditions'], ['/refund', 'Refund Policy'], ['/support', 'Support'], ['/blog', 'PR Releases'], ['/login', 'Login']]],
]

function Footer() {
  const link = 'text-ink/80 no-underline hover:text-ink hover:underline'
  return (
    <footer className="border-t border-ink/10 py-14 text-[15px]">
      <div className="wrap grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Link to="/" className="text-ink no-underline"><Logo /></Link>
          <p className="max-w-xs">Running workflows with clarity and control.</p>
          <p>admin@rokesh.example</p>
        </div>
        {FOOT.map(([h, links]) => (
          <div key={h} className="flex flex-col gap-2"><b className="font-display">{h}</b>{links.map(([to, t]) => <Link key={t} to={to} className={link}>{t}</Link>)}</div>
        ))}
        <div className="flex flex-col gap-2"><b className="font-display">Social</b>{['LinkedIn', 'Instagram', 'YouTube'].map((s) => <a key={s} href="#top" className={link}>{s}</a>)}</div>
      </div>
      <p className="wrap pt-8 text-[13px] text-ink/60">&copy; 2026 Rokesh. All rights reserved. Replace this line with your registered address.</p>
    </footer>
  )
}

// Marketing shell: header, page, closing call-to-action and footer. Scrolls to #hash or the top on navigation.
export default function Layout() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 50)
    else scrollTo(0, 0)
  }, [pathname, hash])
  return (
    <div id="top">
      <Header />
      <main className="pt-28"><Outlet /></main>
      <CtaBlock />
      <Footer />
    </div>
  )
}
