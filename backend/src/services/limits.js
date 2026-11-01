// Small in-memory sliding-window counters (per process). Good enough for one server instance.
const buckets = new Map()

// Returns true when the key has already used its allowance in the window; otherwise records this hit.
export function limited(name, key, limit, windowMs) {
  const k = `${name}:${key}`
  const now = Date.now()
  const hits = (buckets.get(k) || []).filter((t) => t > now - windowMs)
  if (hits.length >= limit) { buckets.set(k, hits); return true }
  hits.push(now)
  buckets.set(k, hits)
  return false
}

setInterval(() => {
  const cut = Date.now() - 15 * 60e3
  for (const [k, v] of buckets) if (!v.some((t) => t > cut)) buckets.delete(k)
}, 5 * 60e3).unref()
