// Small building blocks shared by the workspace views.
export const Page = ({ title, hint, children }) => (
  <section className="animate-reveal space-y-4">
    <h2 className="font-display text-2xl font-semibold">{title}</h2>
    {hint && <p className="max-w-3xl text-sm opacity-70">{hint}</p>}
    {children}
  </section>
)

export const Row = ({ children, className = '', ...r }) => <div className={`flex flex-wrap items-center gap-2 ${className}`} {...r}>{children}</div>

const ctl = 'field !w-auto !rounded-lg !px-3 !py-2 text-sm'
export const In = ({ w = 'w-44', className = '', ...r }) => <input className={`${ctl} ${w} ${className}`} {...r} />
export const Sel = ({ w = 'w-36', className = '', children, ...r }) => <select className={`${ctl} ${w} ${className}`} {...r}>{children}</select>
export const Area = ({ w = 'w-full', className = '', ...r }) => <textarea className={`${ctl} ${w} ${className}`} {...r} />

const bcls = { p: 'btn btn-sm !px-4 !py-1.5 !text-[13px]', o: 'btn btn-o btn-sm !px-4 !py-1.5 !text-[13px]', d: 'btn btn-sm !px-4 !py-1.5 !text-[13px] !bg-none !bg-red-600 hover:!bg-red-700' }
export const B = ({ v = 'p', className = '', ...r }) => <button type="button" className={`${bcls[v]} ${className}`} {...r} />
export const Submit = ({ children, v = 'p' }) => <button className={bcls[v]}>{children}</button>

export const Card = ({ children, className = '' }) => <div className={`rounded-2xl border border-ink/10 bg-white/80 p-5 ${className}`}>{children}</div>
export const Mut = ({ children }) => <p className="text-[13px] opacity-65">{children}</p>
export const Code = ({ children }) => <code className="rounded bg-ink/10 px-1.5 py-0.5 text-[12px] break-all">{children}</code>
export const Pill = ({ children, className = '' }) => <span className={`rounded-full border border-ink/15 bg-white px-2.5 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>

export function Table({ head, rows, empty = 'Nothing here yet.' }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink/10 bg-white/80">
      <table className="w-full border-collapse text-left text-sm">
        <thead><tr>{head.map((h, i) => <th key={i} className="border-b border-ink/10 px-3 py-2.5 font-semibold opacity-70">{h}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows : <tr><td colSpan={head.length} className="px-3 py-4 opacity-60">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
export const Td = ({ children, className = '', ...r }) => <td className={`border-b border-ink/5 px-3 py-2 align-middle ${className}`} {...r}>{children}</td>

// Controlled form helper: returns the form values on submit and resets the form.
export const onForm = (fn) => (e) => {
  e.preventDefault()
  const f = e.currentTarget
  fn(Object.fromEntries(new FormData(f)), f)
}

export const A = ({ className = '', ...r }) => <a className={`text-brand-600 underline-offset-2 hover:underline ${className}`} {...r} />
