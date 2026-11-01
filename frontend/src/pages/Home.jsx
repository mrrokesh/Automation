import { useEffect, useState } from 'react'
import { Btn, CountUp, Mark, Reveal, Section, Tag } from '../components/ui'
import { api } from '../api'
import dashboard from '../assets/dashboard.jpg'
import flow from '../assets/flow.jpg'
import { channelCards, chips, examples, faqs, features, lifecycle, newWay, oldWay, parseWorkflow, stats, tiles, words } from '../content/home'

const H2 = ({ children, className = '', ...r }) => <Reveal as="h2" className={`font-display text-[clamp(30px,4.2vw,46px)] leading-[1.08] font-semibold ${className}`} {...r}>{children}</Reveal>
const Frame = ({ src, alt, className = '', ...r }) => (
  <Reveal className={`rounded-[28px] border border-ink/10 bg-white/60 p-2.5 shadow-soft ${className}`} {...r}>
    <img src={src} alt={alt} width="800" height="500" loading="lazy" className="w-full rounded-[20px]" />
  </Reveal>
)

function Hero() {
  return (
    <section id="hero" className="relative overflow-hidden pt-10 pb-16 text-center">
      <div aria-hidden="true" className="absolute inset-x-0 top-[-7rem] -z-10 h-[34rem] bg-[repeating-linear-gradient(90deg,rgba(218,158,240,.18)_0_2px,transparent_2px_46px)] [mask-image:linear-gradient(#000,transparent)]" />
      <div aria-hidden="true" className="absolute top-[-6rem] left-1/2 -z-10 size-[44rem] -translate-x-1/2 animate-float rounded-full bg-accent/40 blur-3xl" />
      <div className="wrap">
        <Reveal as="h1" className="mx-auto max-w-4xl font-display text-[clamp(38px,6vw,64px)] leading-[1.05] font-medium tracking-tight">Agentic AI automation that drives real business outcomes</Reveal>
        <Reveal as="p" delay={0.08} className="mx-auto mt-5 max-w-2xl text-lg opacity-80">Put your retention and growth on autopilot with Rokesh. Orchestrate flawless customer engagement across 6+ channels using 300+ AI models and 8,000+ integrations, all from one automation platform.</Reveal>
        <Reveal delay={0.16} className="mt-8 flex flex-wrap justify-center gap-3">
          <Btn to="/#contact">Book A Demo</Btn>
          <Btn to="/login" outline>Try Rokesh for free</Btn>
        </Reveal>
        <Reveal as="p" delay={0.22} className="mt-14 text-sm font-medium tracking-wide opacity-70">Works with the tools your team already uses</Reveal>
        <Reveal delay={0.26} aria-hidden="true" className="mt-4 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="flex w-max animate-marquee gap-3">
            {[...chips, ...chips].map((c, i) => <span key={i} className="rounded-full border border-ink/15 bg-white/70 px-4 py-1.5 text-sm">{c}</span>)}
          </div>
        </Reveal>
        <Frame src={dashboard} alt="The Rokesh dashboard with AI chat agent, voice agent, WhatsApp and Instagram quick starts" delay={0.3} className="mx-auto mt-12 max-w-4xl" />
      </div>
    </section>
  )
}

function PromptDemo() {
  const [prompt, setPrompt] = useState(examples[1][1])
  const [nodes, setNodes] = useState([])
  const [log, setLog] = useState('')
  const [state, setState] = useState({}) // index -> 'run' | 'ok'
  const [running, setRunning] = useState(false)

  const generate = () => {
    const n = parseWorkflow(prompt)
    setNodes(n); setState({})
    setLog(n.length ? `Workflow generated: ${n.length} steps.\n` : 'Could not detect steps. Try mentioning lead, WhatsApp, email, CRM, payment...\n')
  }
  const run = async () => {
    if (!nodes.length || running) return
    setRunning(true); setLog(''); setState({})
    for (let i = 0; i < nodes.length; i++) {
      setState((s) => ({ ...s, [i]: 'run' })); setLog((l) => `${l}> ${nodes[i].label} ...\n`)
      await new Promise((r) => setTimeout(r, 600))
      setState((s) => ({ ...s, [i]: 'ok' })); setLog((l) => `${l}  ok (simulated)\n`)
    }
    setLog((l) => `${l}Workflow complete.\n`); setRunning(false)
  }

  return (
    <Section id="automation">
      <div className="wrap text-center">
        <H2>Describe a workflow. Watch it build.</H2>
        <Reveal as="p" delay={0.06} className="mx-auto mt-4 max-w-2xl text-lg opacity-80">Type what you want in plain language and see the steps appear. It is the same idea that powers the full flow builder.</Reveal>
        <Reveal delay={0.1} className="mx-auto mt-8 max-w-3xl rounded-[28px] border border-ink/10 bg-white/80 p-5 text-left shadow-soft">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} aria-label="Describe your workflow" className="field resize-none" />
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Examples">
            {examples.map(([label, text]) => <button key={label} type="button" onClick={() => setPrompt(text)} className="cursor-pointer rounded-full border border-ink/15 bg-white px-3.5 py-1 text-[13px] transition hover:border-brand-500">{label}</button>)}
          </div>
          <div className="mt-4 flex gap-3"><button type="button" onClick={generate} className="btn">Generate workflow</button><button type="button" onClick={run} disabled={!nodes.length || running} className="btn btn-o">Run</button></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <pre className="m-0 min-h-28 overflow-auto rounded-2xl bg-night p-4 font-mono text-[13px] whitespace-pre-wrap text-accent">{log}</pre>
            <div className="space-y-2">
              {nodes.length === 0 && <p className="opacity-60">No steps yet. Describe a workflow and click Generate.</p>}
              {nodes.map((n, i) => (
                <div key={i} className={`animate-pop rounded-2xl border px-4 py-2.5 transition ${state[i] === 'ok' ? 'border-emerald-400 bg-emerald-50' : state[i] === 'run' ? 'border-brand-500 bg-brand-500/10' : 'border-ink/10 bg-white'}`}>
                  <b className="mr-2 text-xs tracking-wide text-brand-500 uppercase">{n.type}</b>{n.label}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}

const L = ({ children }) => <span className="mb-1.5 block text-sm font-medium">{children}</span>
const Two = ({ children }) => <div className="wrap grid items-center gap-12 md:grid-cols-2">{children}</div>

function Workflows() {
  return (
    <Section id="workflows">
      <Two>
        <div>
          <Reveal as="span" className="tag">Automation</Reveal>
          <H2 delay={0.05} className="mt-4">Workflows that adapt to how your business runs</H2>
          <Reveal delay={0.1} className="mt-7 grid gap-5 sm:grid-cols-2">
            {['Plug-and-play no-code workflows for teams that do not have spare IT bandwidth.', 'Ready-made libraries to start fast, with simple prompts instead of drag-and-drop complexity.'].map((t, i) => (
              <div key={i} className="border-l-2 border-brand-500/40 pl-4"><b className="font-display text-2xl text-brand-500">{i + 1}</b><p className="mt-1 opacity-80">{t}</p></div>
            ))}
          </Reveal>
        </div>
        <Frame src={flow} alt="The Rokesh visual flow builder showing a connected admission workflow" delay={0.1} />
      </Two>
    </Section>
  )
}

function Integrations() {
  return (
    <Section id="integrations">
      <Two>
        <Reveal aria-hidden="true" className="relative grid grid-cols-4 gap-3">
          {tiles.map(([glyph, name, color]) => (
            <div key={name} className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink/10 bg-white/80 text-xs font-medium transition hover:-translate-y-1 hover:shadow-soft">
              <i style={{ background: color }} className="grid size-9 place-items-center rounded-xl text-sm font-bold text-white not-italic">{glyph}</i>{name}
            </div>
          ))}
          <div className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-white shadow-soft ring-4 ring-page"><Mark size={40} /></div>
        </Reveal>
        <div>
          <Reveal as="span" className="tag">Integration</Reveal>
          <H2 delay={0.05} className="mt-4">8000+ integrations that fit into your stack</H2>
          <Reveal as="p" delay={0.1} className="mt-4 opacity-80">Rokesh connects with the CRMs, support systems, data warehouses and communication tools you already use, so workflows run where your business operates.</Reveal>
          <Reveal as="ul" delay={0.15} className="ticks mt-5 space-y-2">{['Works with existing infrastructure', 'Fast to adopt across teams and functions', 'Scales without custom development', 'Built for enterprise security and compliance'].map((t) => <li key={t}>{t}</li>)}</Reveal>
        </div>
      </Two>
    </Section>
  )
}

function Compare() {
  return (
    <Section id="compare">
      <div className="wrap text-center">
        <Reveal as="span" className="tag">Comparison</Reveal>
        <H2 delay={0.05} className="mt-4">Why Rokesh works where others don&rsquo;t</H2>
        <Reveal as="p" delay={0.1} className="mx-auto mt-4 max-w-2xl text-lg opacity-80">See how Rokesh differs from traditional automation tools through a unified workflow engine built for scale.</Reveal>
        <Reveal delay={0.12} className="relative mx-auto mt-10 grid max-w-4xl gap-5 text-left md:grid-cols-2">
          <div className="rounded-[28px] border border-ink/10 bg-white/50 p-7 opacity-80"><h3 className="mb-4 text-center font-display text-lg font-semibold">Traditional growth automation tools</h3><ul className="space-y-2.5">{oldWay.map((t) => <li key={t} className="relative pl-7 before:absolute before:left-0 before:text-ink/40 before:content-['✕']">{t}</li>)}</ul></div>
          <span className="absolute top-1/2 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 rounded-full bg-night px-3 py-2 text-sm font-semibold text-white md:block">V/S</span>
          <div className="rounded-[28px] border border-brand-500/30 bg-white p-7 shadow-soft"><h3 className="mb-4 flex items-center justify-center gap-2.5 font-display text-lg font-semibold"><Mark size={26} />Rokesh</h3><ul className="ticks space-y-2.5">{newWay.map((t) => <li key={t}>{t}</li>)}</ul></div>
        </Reveal>
        <p className="mt-9"><Btn to="/#contact">Book a Demo</Btn></p>
      </div>
    </Section>
  )
}

function Channels() {
  return (
    <Section id="channels">
      <div className="wrap">
        <div className="text-center">
          <Reveal as="span" className="tag">Omnichannel</Reveal>
          <H2 delay={0.05} className="mt-4">One workflow. Six channels.</H2>
          <Reveal as="p" delay={0.1} className="mx-auto mt-4 max-w-2xl text-lg opacity-80">Run coordinated workflows across WhatsApp, email, Instagram, Messenger, SMS and voice from a single platform.</Reveal>
        </div>
        <div className="mt-10 space-y-5">
          {channelCards.map(([tag, title, text], i) => (
            <Reveal key={tag} className={`grid items-center gap-6 rounded-[28px] border border-ink/10 bg-white/70 p-7 md:grid-cols-2 ${i % 2 ? 'md:[&>:first-child]:order-2' : ''}`}>
              <div><Tag>{tag}</Tag><h3 className="mt-3 font-display text-2xl font-semibold">{title}</h3><p className="mt-2 opacity-80">{text}</p></div>
              <div className="grid h-40 place-items-center rounded-3xl bg-[linear-gradient(135deg,#4b3387,#8765d6_60%,#da9ef0)] font-display text-3xl font-semibold text-white">{tag.split(' ')[0]}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

function Wave() {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => setI((n) => (n + 1) % words.length), 2200)
    return () => clearInterval(t)
  }, [])
  return (
    <Section id="wave">
      <div className="wrap text-center">
        <H2>Wave goodbye to</H2>
        <div className="relative mt-2 h-[1.2em] font-display text-[clamp(30px,4.6vw,52px)] font-semibold text-brand-500" aria-live="off">
          {words.map((w, n) => <span key={w} className={`absolute inset-x-0 transition-all duration-500 ${n === i ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>{w}</span>)}
        </div>
      </div>
    </Section>
  )
}

function Stats() {
  return (
    <Section id="stats" className="!py-12">
      <div className="wrap">
        <div className="grid gap-6 text-center sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(([n, suffix, label], i) => (
            <Reveal key={label} delay={i * 0.08}><div className="font-display text-5xl font-semibold text-brand-600"><CountUp end={n} suffix={suffix} /></div><p className="opacity-80">{label}</p></Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-[13px] opacity-60">Sample figures shown for layout. Replace them with your own numbers.</p>
      </div>
    </Section>
  )
}

function Lifecycle() {
  const [tab, setTab] = useState(0)
  const [, title, text] = lifecycle[tab]
  return (
    <Section id="funnel">
      <div className="wrap text-center">
        <Reveal as="span" className="tag">Full-funnel automation</Reveal>
        <H2 delay={0.05} className="mt-4">Execute across the full customer lifecycle</H2>
        <Reveal delay={0.1} role="tablist" aria-label="Lifecycle stages" className="mt-8 inline-flex flex-wrap justify-center gap-1 rounded-full border border-ink/10 bg-white/70 p-1.5">
          {lifecycle.map(([name], i) => <button key={name} role="tab" aria-selected={tab === i} onClick={() => setTab(i)} className={`cursor-pointer rounded-full px-5 py-2 text-[15px] font-medium transition ${tab === i ? 'bg-night text-white' : 'hover:bg-ink/5'}`}>{name}</button>)}
        </Reveal>
        <div key={tab} role="tabpanel" className="mx-auto mt-8 max-w-2xl animate-pop rounded-[28px] border border-ink/10 bg-white/80 p-8"><h3 className="font-display text-2xl font-semibold">{title}</h3><p className="mt-3 opacity-80">{text}</p></div>
      </div>
    </Section>
  )
}

function Product() {
  return (
    <section id="product" className="bg-night py-20 text-white max-md:py-14">
      <div className="wrap text-center">
        <Reveal as="span" className="tag !border-white/30 !bg-transparent !text-white">Product overview</Reveal>
        <H2 delay={0.05} className="mt-4">From prompt to production-grade workflows</H2>
        <Reveal as="p" delay={0.1} className="mx-auto mt-4 mb-6 max-w-2xl text-lg text-white/80">Features designed to simplify workflows, boost productivity and improve team collaboration.</Reveal>
        <Reveal delay={0.14}><Btn to="/#contact">Book a demo</Btn></Reveal>
        <Frame src={flow} alt="Visual workflow builder" delay={0.18} className="mx-auto mt-11 max-w-4xl !border-white/10 !bg-white/10" />
        <div className="mt-12 grid gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([h, p], i) => <Reveal key={h} delay={i * 0.07}><h3 className="font-display text-lg font-semibold">{h}</h3><p className="mt-1.5 text-white/75">{p}</p></Reveal>)}
        </div>
      </div>
    </section>
  )
}

function Careers() {
  return (
    <Section id="careers-teaser">
      <Two>
        <div>
          <Reveal as="span" className="tag">Life at Rokesh</Reveal>
          <H2 delay={0.05} className="mt-4">Where your work has instant impact</H2>
          <Reveal as="p" delay={0.1} className="mt-4 opacity-80">Great teams need context, trust and meaningful problems to solve. At Rokesh your work is visible, your impact is measurable and your growth is intentional.</Reveal>
          <Reveal delay={0.14} className="mt-6"><Btn to="/careers" outline>See open roles</Btn></Reveal>
        </div>
        <Frame src={dashboard} alt="Rokesh workspace" delay={0.1} />
      </Two>
    </Section>
  )
}

function Contact() {
  const [msg, setMsg] = useState({ text: '', error: false })
  const [busy, setBusy] = useState(false)
  async function submit(e) {
    e.preventDefault()
    const form = e.currentTarget, d = Object.fromEntries(new FormData(form))
    d.interest = new FormData(form).getAll('int').join(', ')
    setBusy(true)
    try { await api.contact(d); setMsg({ text: 'Thanks! We will reach out shortly.', error: false }); form.reset() }
    catch (err) { setMsg({ text: err.message, error: true }) }
    finally { setBusy(false) }
  }
  return (
    <Section id="contact">
      <div className="wrap text-center">
        <Reveal as="span" className="tag">Contact</Reveal>
        <H2 delay={0.05} className="mt-4">Your growth engine, powered by AI</H2>
        <Reveal as="p" delay={0.1} className="mx-auto mt-4 max-w-2xl text-lg opacity-80">Tell us about your team and we will show you how Rokesh improves productivity, streamlines operations and drives revenue.</Reveal>
        <Reveal as="form" delay={0.12} onSubmit={submit} className="mx-auto mt-8 grid max-w-xl gap-4 rounded-[28px] border border-ink/10 bg-white/85 p-7 text-left shadow-soft">
          <label><L>Full name</L><input name="name" placeholder="Your name" required className="field" /></label>
          <label><L>Business email</L><input name="email" type="email" placeholder="Enter your business email" required className="field" /></label>
          <label><L>Company</L><input name="company" placeholder="Company name" className="field" /></label>
          <label><L>Number of employees</L><select name="employees" defaultValue="51-200" className="field">{['1-10', '11-50', '51-200', '201-1000', '1000+'].map((o) => <option key={o}>{o}</option>)}</select></label>
          <label><L>WhatsApp mobile number</L><input name="phone" type="tel" placeholder="+91 98765 43210" className="field" /></label>
          <fieldset><L>Interested in</L><div className="flex flex-wrap gap-4">{['WhatsApp', 'Email', 'Voice AI'].map((o) => <label key={o} className="flex items-center gap-2"><input type="checkbox" name="int" value={o} className="size-4 accent-brand-500" />{o}</label>)}</div></fieldset>
          <button disabled={busy} className="btn w-full">{busy ? 'Sending…' : 'Book a Demo'}</button>
          <p role="status" className={`text-center text-sm ${msg.error ? 'text-red-600' : 'text-emerald-700'}`}>{msg.text}</p>
        </Reveal>
      </div>
    </Section>
  )
}

function Faq() {
  return (
    <Section id="faq">
      <div className="wrap max-w-[860px]">
        <div className="text-center"><Reveal as="span" className="tag">FAQs</Reveal><H2 delay={0.05} className="mt-4">Frequently Asked Questions</H2></div>
        <div className="mt-8 space-y-3">
          {faqs.map(([q, a]) => (
            <Reveal as="details" key={q} className="group rounded-2xl border border-ink/10 bg-white/70 px-5 py-4 open:bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg font-medium">{q}<span className="text-2xl transition group-open:rotate-45">+</span></summary>
              <p className="mt-3 opacity-80">{a}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  )
}

export default function Home() {
  useEffect(() => { document.title = 'Rokesh | Agentic AI Automation for Revenue & Growth' }, [])
  return (
    <>
      <Hero /><PromptDemo /><Workflows /><Integrations /><Compare /><Channels /><Wave /><Stats /><Lifecycle /><Product /><Careers /><Contact /><Faq />
    </>
  )
}
