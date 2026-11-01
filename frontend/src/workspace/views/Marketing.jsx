import { useState } from 'react'
import qrcode from 'qrcode-generator'
import { uid, fill } from '../engine'
import { useWs } from '../context'
import { A, B, Card, In, Mut, onForm, Page, Row, Sel, Submit, Table, Td } from '../ui'

// ---- Template Library ----
export function Templates() {
  const { S, update } = useWs()
  const add = onForm((d, f) => { update((s) => { s.templates.push({ id: uid(), ...d }) }); f.reset() })
  return (
    <Page title="Template Library">
      <form onSubmit={add}><Row><In name="name" placeholder="Template name" required w="w-44" /><Sel name="channel" w="w-32"><option>whatsapp</option><option>email</option><option>sms</option></Sel>
        <In name="cat" placeholder="Category" w="w-36" /><In name="body" placeholder="Body with {{1}} variables" required w="w-80" /><Submit>Add</Submit></Row></form>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {S.templates.map((t) => (
          <Card key={t.id}><h3 className="font-display text-lg font-semibold">{t.name}</h3><p className="text-xs opacity-65">{t.cat} · {t.channel}</p><p className="mt-2">{t.body}</p>
            <p className="mt-3"><B v="d" onClick={() => update((s) => { s.templates = s.templates.filter((x) => x.id !== t.id) })}>Delete</B></p></Card>
        ))}
      </div>
    </Page>
  )
}

// ---- Broadcasts ----
export function Campaigns() {
  const { S, update, toast, engine, status } = useWs()
  const [busy, setBusy] = useState(false)
  const send = onForm(async (d) => {
    const t = S.templates.find((x) => x.id === d.tpl)
    const to = S.contacts.filter((c) => !d.label || c.label === d.label)
    if (!t || !to.length) return toast('No template or no matching contacts')
    setBusy(true)
    let sent = 0, failed = 0, mode = 'simulated'
    for (const c of to) {
      const dest = t.channel === 'email' ? c.email : c.phone
      if (!dest) { failed++; continue }
      const r = await engine.deliver(t.channel, dest, fill(t.body, c))
      if (r === 'failed') failed++; else { sent++; mode = r }
    }
    if (!(t.channel === 'email' ? status.emailLive : status.live)) mode = 'simulated'
    update((s) => { s.campaigns.unshift({ id: uid(), name: d.name, channel: t.channel, label: d.label || 'All', type: 'Broadcast', total: to.length, sent, failed, mode, at: Date.now() }) })
    toast(`Campaign "${d.name}" finished: ${sent} sent, ${failed} failed`)
    setBusy(false)
  })
  return (
    <Page title="Broadcasts">
      <form onSubmit={send}><Row><In name="name" placeholder="Campaign name" required w="w-44" /><Sel name="tpl" w="w-52">{S.templates.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.channel})</option>)}</Sel>
        <Sel name="label" w="w-40"><option value="">All contacts</option>{S.labels.map((l) => <option key={l}>{l}</option>)}</Sel><button disabled={busy} className="btn btn-sm !px-4 !py-1.5 !text-[13px]">{busy ? 'Sending…' : 'Send campaign'}</button></Row></form>
      <Table head={['Name', 'Channel', 'Contacts', 'Sent', 'Failed', 'Mode']} empty="No campaigns yet." rows={S.campaigns.map((c) => <tr key={c.id}><Td>{c.name}</Td><Td>{c.channel}</Td><Td>{c.total}</Td><Td>{c.sent}</Td><Td>{c.failed}</Td><Td>{c.mode}</Td></tr>)} />
    </Page>
  )
}

// ---- QR code + chat button ----
export function QR() {
  const [f, setF] = useState({ phone: '', text: "Hi, I'd like to know more", label: 'Chat with us' })
  const [out, setOut] = useState(null)
  const { toast } = useWs()
  const generate = () => {
    const ph = f.phone.replace(/\D/g, '')
    if (ph.length < 8) return toast('Enter a valid number')
    const link = `https://wa.me/${ph}?text=${encodeURIComponent(f.text)}`
    const q = qrcode(0, 'M'); q.addData(link); q.make()
    const esc = (s) => s.replace(/"/g, '&quot;')
    setOut({ link, svg: q.createDataURL(5, 4), snippet: `<script src="${location.origin}/chat-widget.js" data-phone="${ph}" data-text="${esc(f.text)}" data-label="${esc(f.label)}" async></script>` })
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <Page title="QR Code & Chat Button">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-sm">WhatsApp number (with country code, digits only)<In className="mt-1 w-full" w="" placeholder="919876543210" value={f.phone} onChange={set('phone')} /></label>
          <label className="block text-sm">Pre-filled message<In className="mt-1 w-full" w="" value={f.text} onChange={set('text')} /></label>
          <label className="block text-sm">Button label<In className="mt-1 w-full" w="" value={f.label} onChange={set('label')} /></label>
          <B onClick={generate}>Generate</B>
        </div>
        {out && <Card><img src={out.svg} alt="WhatsApp QR code" className="inline-block rounded bg-white p-1.5" /><p className="mt-2 break-all"><A href={out.link} target="_blank" rel="noreferrer">{out.link}</A></p>
          <p className="mt-3 text-sm">Embed the floating chat button on any site:</p><textarea readOnly rows={3} value={out.snippet} onClick={(e) => e.target.select()} className="field mt-1 !text-xs" /></Card>}
      </div>
    </Page>
  )
}

// ---- WhatsApp Catalog (local product list; sends product text to a label) ----
export function Catalog() {
  const { S, update, toast, engine, status } = useWs()
  const [lab, setLab] = useState({})
  const add = onForm((d, f) => { update((s) => { s.products.push({ id: uid(), ...d }) }); f.reset() })
  async function share(p) {
    let n = 0
    for (const c of S.contacts.filter((c) => c.phone && (!lab[p.id] || c.label === lab[p.id]))) { await engine.deliver('whatsapp', c.phone, `${p.name} - ${p.price}\n${p.desc}`); n++ }
    toast(`${n} message(s) ${status.live ? 'sent' : 'simulated'}`)
  }
  return (
    <Page title="WhatsApp Catalog" hint="A local product list. Meta's Commerce catalog and WhatsApp Payments are not connected; Send shares a product as a normal message.">
      <form onSubmit={add}><Row><In name="name" placeholder="Product" required w="w-44" /><In name="price" placeholder="Price" w="w-24" /><In name="desc" placeholder="Description" w="w-64" /><Submit>Add</Submit></Row></form>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {S.products.length === 0 && <Mut>No products yet.</Mut>}
        {S.products.map((p) => (
          <Card key={p.id}><h3 className="font-display text-lg font-semibold">{p.name}</h3><p>{p.price}</p><p className="opacity-75">{p.desc}</p>
            <Row className="mt-3"><Sel w="w-28" value={lab[p.id] || ''} onChange={(e) => setLab({ ...lab, [p.id]: e.target.value })}><option value="">All</option>{S.labels.map((l) => <option key={l}>{l}</option>)}</Sel>
              <B onClick={() => share(p)}>Send</B><B v="d" onClick={() => update((s) => { s.products = s.products.filter((x) => x.id !== p.id) })}>Delete</B></Row></Card>
        ))}
      </div>
    </Page>
  )
}
