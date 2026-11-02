import { useState } from 'react'
import { Card, In, Mut, Page } from '../ui'

export const Wait = ({ title, error }) => <Page title={title}><Mut>{error || 'Loading…'}</Mut></Page>

// Seven small columns, one per day.
export function Bars({ rows, label }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <Card>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-3 flex h-24 items-end gap-2" role="img" aria-label={`${label}: ${rows.map((r) => `${r.day} ${r.n}`).join(', ')}`}>
        {rows.map((r) => (
          <div key={r.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${r.day}: ${r.n}`}>
            <div className="w-full rounded-t bg-brand-500/70" style={{ height: `${Math.max(4, (r.n / max) * 100)}%` }} />
            <span className="text-[10px] opacity-60">{r.day.slice(8)}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// A text box that saves when you click away.
export function NoteBox({ value, onSave }) {
  const [v, setV] = useState(value)
  return <In value={v} w="w-56" placeholder="Add a note" aria-label="Note" onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} />
}
