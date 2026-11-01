import { useEffect, useState } from 'react'
import { Btn, Reveal } from '../components/ui'
import { plans } from '../content/articles'

const TERMS = [['quarterly', 'Quarterly', 1 / 0.8, ''], ['half', 'Half Yearly', 0.92 / 0.8, 'Save 8%'], ['annual', 'Annual', 1, 'Save 20%']]

function Seg({ value, onChange, options, small }) {
  return (
    <div className={`inline-flex gap-1 rounded-full border border-ink/10 bg-white/70 p-1.5 ${small ? 'text-sm' : ''}`} role="group">
      {options.map(([v, label, note]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={`cursor-pointer rounded-full px-5 py-2 font-medium transition ${value === v ? 'bg-night text-white' : 'hover:bg-ink/5'}`}>
          {label}{note && <small className={`ml-1.5 text-xs ${value === v ? 'text-accent' : 'text-brand-500'}`}>{note}</small>}
        </button>
      ))}
    </div>
  )
}

export default function Pricing() {
  const [term, setTerm] = useState('annual')
  const [cur, setCur] = useState('INR')
  useEffect(() => { document.title = 'Pricing | Rokesh' }, [])
  const factor = TERMS.find((t) => t[0] === term)[2]
  const money = (v) => (cur === 'INR' ? '₹' + Math.round(v).toLocaleString('en-IN') : '$' + Math.round(v / 83).toLocaleString('en-US'))

  return (
    <section className="pb-20">
      <div className="wrap text-center">
        <Reveal as="h1" className="mx-auto max-w-3xl font-display text-[clamp(32px,5vw,52px)] leading-tight font-semibold">AI-powered workflows, priced for your needs</Reveal>
        <Reveal as="p" delay={0.08} className="mx-auto mt-4 max-w-2xl text-lg opacity-80">Flexible plans for teams running AI-driven automation across systems and channels, with visibility and control.</Reveal>
        <Reveal delay={0.12} className="mt-8"><Seg value={term} onChange={setTerm} options={TERMS.map(([v, l, , n]) => [v, l, n])} /></Reveal>
        <Reveal delay={0.14} className="mt-3"><Seg small value={cur} onChange={setCur} options={[['INR', 'INR'], ['USD', 'USD']]} /></Reveal>
        <div className="mt-10 grid gap-5 text-left md:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08} className={`flex flex-col rounded-[28px] border p-7 ${p.hot ? 'border-brand-500 bg-white shadow-soft' : 'border-ink/10 bg-white/70'}`}>
              <h3 className="font-display text-2xl font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm opacity-70">{p.inr ? `Includes ${p.tasks}` : p.tasks}</p>
              <div className="my-5 font-display text-4xl font-semibold">{p.inr ? <>{money(p.inr * factor)} <small className="text-base font-normal opacity-60">/ month</small></> : 'Custom'}</div>
              <Btn to="/#contact" outline={!p.hot}>{p.inr ? 'Upgrade Plan' : 'Talk to sales'}</Btn>
              <ul className="ticks mt-6 space-y-2.5">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-[13px] opacity-60">Annual prices are as shown in the product; quarterly and half-yearly are estimated from the stated discounts and USD from a rough rate. Billing and upgrades are not connected yet.</p>
      </div>
    </section>
  )
}
