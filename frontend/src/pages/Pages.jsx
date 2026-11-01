import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Btn, Reveal } from '../components/ui'
import { cardPages, guideGroups, legal, posts } from '../content/articles'

function useTitle(t) { useEffect(() => { document.title = `${t} | Rokesh` }, [t]) }

const Head = ({ title, intro }) => (
  <>
    <Reveal as="h1" className="font-display text-[clamp(30px,4.4vw,48px)] leading-tight font-semibold">{title}</Reveal>
    <Reveal as="p" delay={0.08} className="mt-4 max-w-2xl text-lg opacity-80">{intro}</Reveal>
  </>
)

const Grid = ({ children }) => <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>

// Channels, Solutions, Case Studies and Careers share one layout driven by content/articles.js.
export function CardPage({ page }) {
  const { title, intro, cards, cta } = cardPages[page]
  useTitle(page.replace('-', ' ').replace(/^./, (c) => c.toUpperCase()))
  return (
    <section className="pb-20"><div className="wrap">
      <Head title={title} intro={intro} />
      <Grid>{cards.map(([h, p], i) => <Reveal key={h} delay={(i % 6) * 0.07} className="card"><h3 className="font-display text-xl font-semibold">{h}</h3><p className="mt-2 opacity-80">{p}</p></Reveal>)}</Grid>
      {cta && <p className="mt-8"><Btn to={cta.to} href={cta.href}>{cta.label}</Btn></p>}
    </div></section>
  )
}

export function Legal({ page }) {
  const [title, intro] = legal[page]
  useTitle(title)
  return (
    <section className="pb-20"><div className="wrap">
      <Head title={title} intro={intro} />
      <p className="mt-6 opacity-70">Placeholder: replace this page with legal text reviewed by counsel before launch. Do not publish placeholder policy text for a real business.</p>
    </div></section>
  )
}

const LinkCard = ({ to, children, i = 0 }) => <Reveal delay={(i % 6) * 0.07}><Link to={to} className="card block h-full text-ink no-underline"><h3 className="font-display text-xl font-semibold">{children}</h3></Link></Reveal>

export function Blog() {
  useTitle('Blog')
  return (
    <section className="pb-20"><div className="wrap">
      <Head title="Automation insights for teams that move fast" intro="Practical guides on automation, customer journeys and AI-powered operations." />
      <Grid>{posts.map((p, i) => <LinkCard key={p.slug} to={`/blog/${p.slug}`} i={i}>{p.title}</LinkCard>)}</Grid>
    </div></section>
  )
}

export function Guides() {
  useTitle('Guides')
  return (
    <section className="pb-20"><div className="wrap">
      <Head title="Guides to help you automate, scale and convert" intro="Step-by-step resources for better customer journeys and automated conversations." />
      {guideGroups.map(({ group, items }) => (
        <div key={group} className="mt-10"><h2 className="font-display text-2xl font-semibold">{group}</h2><Grid>{items.map((g, i) => <LinkCard key={g.slug} to={`/guides/${g.slug}`} i={i}>{g.title}</LinkCard>)}</Grid></div>
      ))}
    </div></section>
  )
}

// One article page for both blog posts and guides.
export function Article({ kind }) {
  const { slug } = useParams()
  const list = kind === 'blog' ? posts : guideGroups.flatMap((g) => g.items)
  const a = list.find((x) => x.slug === slug)
  useTitle(a ? a.title : 'Not found')
  const back = kind === 'blog' ? ['/blog', 'All posts'] : ['/guides', 'All guides']
  if (!a) return <section className="wrap pb-20"><h1 className="font-display text-3xl font-semibold">Not found</h1><p className="mt-3"><Link to={back[0]}>&larr; {back[1]}</Link></p></section>
  return (
    <section className="pb-20"><div className="wrap max-w-[720px]">
      <p><Link to={back[0]} className="text-brand-600">&larr; {back[1]}</Link></p>
      <h1 className="mt-3 font-display text-[clamp(26px,4vw,40px)] leading-tight font-semibold">{a.title}</h1>
      <div className="mt-5 space-y-4 text-lg leading-relaxed">{a.paras.map((p, i) => <p key={i}>{p}</p>)}</div>
      <p className="mt-8"><Btn to="/#contact">Book a Demo</Btn></p>
    </div></section>
  )
}

export function NotFound() {
  useTitle('Not found')
  return <section className="wrap pb-20 text-center"><h1 className="font-display text-4xl font-semibold">Page not found</h1><p className="mt-4"><Btn to="/">Back to Home Page</Btn></p></section>
}
