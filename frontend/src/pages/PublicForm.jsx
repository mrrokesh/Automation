import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api'

// Public, embeddable page for a Smart Form: /form/<id> (or /form?id=<id> for old links).
export default function PublicForm() {
  const params = useParams()
  const [q] = useSearchParams()
  const id = params.id || q.get('id') || ''
  const [form, setForm] = useState(null)
  const [missing, setMissing] = useState(false)
  const [msg, setMsg] = useState({ text: '', error: false })

  useEffect(() => { api.publicForm(id).then((f) => { setForm(f); document.title = f.title }).catch(() => setMissing(true)) }, [id])

  async function submit(e) {
    e.preventDefault()
    const el = e.currentTarget
    try { await api.submitForm(id, Object.fromEntries(new FormData(el))); setMsg({ text: 'Thanks, your response was recorded.', error: false }); el.reset() }
    catch (err) { setMsg({ text: err.message, error: true }) }
  }

  if (missing) return <main className="mx-auto max-w-lg p-6 pt-12"><h1 className="text-2xl font-semibold">Form not found</h1></main>
  if (!form) return null
  return (
    <main className="mx-auto max-w-lg p-6 pt-12">
      <h1 className="text-3xl font-semibold">{form.title}</h1>
      {form.intro && <p className="mt-2 opacity-70">{form.intro}</p>}
      <form onSubmit={submit} className="mt-6 space-y-4">
        {form.fields.map((x) => (
          <label key={x.name} className="block"><span className="mb-1.5 block text-sm font-medium">{x.label}{x.required && ' *'}</span>
            {x.type === 'textarea' ? <textarea name={x.name} required={x.required} rows={4} className="field" /> : <input name={x.name} type={x.type} required={x.required} className="field" />}
          </label>
        ))}
        <button className="btn">Submit</button>
        <p role="status" className={`text-sm ${msg.error ? 'text-red-600' : 'text-emerald-700'}`}>{msg.text}</p>
      </form>
    </main>
  )
}
