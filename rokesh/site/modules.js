// Part 1 of the screens from the screenshot inventory: notifications, visual flow builder,
// account settings, and analytics pages. Loaded after workspace.js and reuses its globals.

// ---------- helpers ----------
const csvDownload = (rows, name) => {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
const fmtTime = t => new Date(t).toLocaleString();
const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '--';

// ---------- notifications ----------
S.notes = S.notes || [];
function updateBell() {
  const n = S.notes.filter(x => !x.read).length;
  document.querySelectorAll('[data-count]').forEach(el => { el.hidden = !n; el.textContent = n > 9 ? '9+' : String(n); });
}
function notify(text) { S.notes.unshift({ id: uid(), at: Date.now(), text, read: false }); if (S.notes.length > 100) S.notes.length = 100; save(); updateBell(); }
updateBell();
let audioCtx;
function beep() {
  if (!(S.inboxSet || {}).sound) return;
  try { audioCtx = audioCtx || new AudioContext(); const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); g.gain.value = 0.05; o.frequency.value = 880; o.start(); o.stop(audioCtx.currentTime + 0.15); } catch { }
}
function fireHooks(event, payload) {
  (S.hooks || []).filter(h => !h.events || h.events.includes(event)).forEach(h => { fetch(h.url, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ event, payload }) }).catch(() => { }); });
}
function onInboundExtras(m, c) { notify(`New ${m.channel} message from ${c.name}: ${String(m.text).slice(0, 60)}`); beep(); fireHooks('message.received', { from: m.from, text: m.text, channel: m.channel }); }
V.notifications = () => `<h2>Notifications</h2><div class="row"><button class="btn s o" id="nread">Mark all read</button><button class="btn s d" id="nclear">Clear</button></div>
${S.notes.map(n => `<div class="card" style="margin-bottom:8px;${n.read ? 'opacity:.6' : ''}"><p>${esc(n.text)}</p><small style="color:var(--mut)">${fmtTime(n.at)}</small></div>`).join('') || '<p>No notifications yet.</p>'}`;
V.notifications.bind = () => { $('#nread').onclick = () => { S.notes.forEach(n => n.read = true); save(); updateBell(); route(); }; $('#nclear').onclick = () => { S.notes = []; save(); updateBell(); route(); }; };

// ---------- visual flow builder ----------
const NODE_DEFS = {
  t_wa: { kind: 'trigger', name: 'Incoming WhatsApp', color: '#16a34a', fields: [['keyword', 'Keyword (blank = any message)', 'text']] },
  t_webhook: { kind: 'trigger', name: 'Incoming Webhook', color: '#0d9488', fields: [] },
  t_contact: { kind: 'trigger', name: 'New Contact', color: '#0891b2', fields: [] },
  t_campaign: { kind: 'trigger', name: 'Campaign Sent', color: '#4f46e5', fields: [['campaign', 'Campaign name (blank = any)', 'text']] },
  a_msg: { kind: 'action', name: 'Response Message', color: '#16a34a', fields: [['text', 'Message body ({{name}} works)', 'area']] },
  a_ask: { kind: 'action', name: 'Ask a Question (waits for reply)', color: '#15803d', fields: [['text', 'Question ({{name}} works)', 'area'], ['var', 'Save reply as variable / attribute name', 'text']] },
  a_attr: { kind: 'action', name: 'Update Attribute', color: '#7c3aed', fields: [['attr', 'Attribute name', 'text'], ['value', 'Value', 'text']] },
  a_label: { kind: 'action', name: 'Add Label', color: '#7c3aed', fields: [['value', 'Label', 'text']] },
  a_cond: { kind: 'action', name: 'Condition (yes / no)', color: '#d97706', fields: [['attr', 'Attribute or "label"', 'text'], ['op', 'Operator', ['equals', 'contains', 'is empty', 'is not empty']], ['value', 'Value', 'text']], branches: true },
  a_wait: { kind: 'action', name: 'Wait', color: '#64748b', fields: [['seconds', 'Seconds (max 30 when live)', 'text']] },
  a_ai: { kind: 'action', name: 'Assign AI Assistant', color: '#0f766e', fields: [] },
  a_catalog: { kind: 'action', name: 'Send WA Catalog', color: '#ea580c', fields: [] },
  a_pay: { kind: 'action', name: 'Payment Message', color: '#a855f7', fields: [['amount', 'Amount (INR)', 'text'], ['desc', 'Description', 'text']] },
  a_call: { kind: 'action', name: 'Make Call (reads script)', color: '#6366f1', fields: [['script', 'Script (max 500 chars)', 'area']] },
  a_agent: { kind: 'action', name: 'Assign Agent', color: '#f97316', fields: [['email', 'Agent email', 'text']] },
  a_status: { kind: 'action', name: 'Update Chat Status', color: '#14b8a6', fields: [['status', 'Status', ['resolved', 'open']]] },
  a_hook: { kind: 'action', name: 'Send Webhook', color: '#475569', fields: [['url', 'https URL', 'text']] },
};
const DISABLED_NODES = ['Shopify Events', 'Facebook Lead', 'Kylas Event Create', 'Kylas Event Update', 'Pabbly Event', 'Incoming Voice Call', 'Messenger Action', 'Meta Pixel', 'Shopify Actions', 'Assign GPT'];
const FLOW_LIBRARY = [
  { name: 'Admission registration (sample)', nodes: [['t_wa', { keyword: 'admission' }], ['a_msg', { text: 'Hi {{name}}, thanks for your interest! Which class are you looking for?' }], ['a_label', { value: 'Lead' }], ['a_ai', {}]] },
  { name: 'Welcome new contact', nodes: [['t_contact', {}], ['a_msg', { text: 'Welcome {{name}}! Reply HELP any time.' }], ['a_label', { value: 'Customer' }]] },
  { name: 'Payment follow-up', nodes: [['t_wa', { keyword: 'pay' }], ['a_pay', { amount: '499', desc: 'Order' }], ['a_wait', { seconds: '5' }], ['a_msg', { text: 'Let us know if you need help paying, {{name}}.' }]] },
];
S.flows = S.flows || [];
let flowEdit = null;
const newFlowFrom = lib => {
  const nodes = lib.nodes.map(([type, cfg], i) => ({ id: uid(), type, x: 40 + i * 260, y: 60 + (i % 2) * 40, cfg: { ...cfg } }));
  return { id: uid(), name: lib.name, on: false, nodes, edges: nodes.slice(1).map((n, i) => ({ id: uid(), from: nodes[i].id, to: n.id, label: '' })) };
};

// {{name}} / {{1}} via fill(), plus any variable saved by an "Ask a Question" node (stored on the contact).
const fillV = (t, c) => fill(t, c).replace(/\{\{\s*([A-Za-z_]\w*)\s*\}\}/g, (m, k) => (c.vars && k in c.vars) ? c.vars[k] : m);
S.pendingAsk = S.pendingAsk || {};
async function execFlow(flow, c, log, ctx = {}) {
  const byId = Object.fromEntries(flow.nodes.map(n => [n.id, n]));
  const start = flow.nodes.find(n => NODE_DEFS[n.type]?.kind === 'trigger'); if (!start) { log('No trigger node.'); return; }
  // Resuming after a reply: continue from the nodes connected to the question node.
  const queue = ctx.resumeFrom ? flow.edges.filter(e => e.from === ctx.resumeFrom).map(e => e.to) : [start.id]; let steps = 0; const seen = new Set();
  while (queue.length && steps++ < 50) {
    const n = byId[queue.shift()]; if (!n) continue; const d = NODE_DEFS[n.type]; if (!d) continue; const cfg = n.cfg || {}; let branch = '', waiting = false;
    log(`> ${d.name}`); ctx.onNode?.(n.id, 'run');
    if (n.type === 'a_ask') {
      const r = await deliver('whatsapp', c.phone, fillV(cfg.text || '', c)); log(`  asked (${r})`); const m = meta(c.phone); m.bot = true; m.lastBotAt = Date.now(); m.ch = 'whatsapp';
      if (ctx.test) { (c.vars = c.vars || {})[(cfg.var || 'reply').trim()] = 'test reply'; log('  (test) assuming reply "test reply"'); }
      else { S.pendingAsk[c.phone] = { flow: flow.id, node: n.id, at: Date.now() }; save(); log('  waiting for the customer to reply'); waiting = true; }
    }
    else if (n.type === 'a_msg') { const r = await deliver('whatsapp', c.phone, fillV(cfg.text || '', c)); log(`  sent (${r})`); const m = meta(c.phone); m.bot = true; m.lastBotAt = Date.now(); m.ch = 'whatsapp'; }
    else if (n.type === 'a_attr') { const a = attrs().find(x => x.name === (cfg.attr || '').trim()); if (a) { (c.attrs = c.attrs || {})[a.id] = fillV(cfg.value || '', c); save(); log('  set'); } else log('  no such attribute'); }
    else if (n.type === 'a_label') { c.label = cfg.value || c.label; save(); log('  label ' + c.label); }
    else if (n.type === 'a_cond') {
      const v = cfg.attr === 'label' ? c.label : getVal(c, (attrs().find(x => x.name === cfg.attr) || { id: cfg.attr }).id); const x = String(v || '').toLowerCase(), y = String(cfg.value || '').toLowerCase();
      const ok = { equals: x === y, contains: x.includes(y), 'is empty': x === '', 'is not empty': x !== '' }[cfg.op || 'equals']; branch = ok ? 'yes' : 'no'; log('  ' + branch);
    }
    else if (n.type === 'a_wait') { const s = Math.min(+cfg.seconds || 0, ctx.test ? 3 : 30); await sleep(s * 1000); log(`  waited ${s}s`); }
    else if (n.type === 'a_ai') { const r = await agentReply([{ role: 'user', content: ctx.text || 'Hello' }]); log('  ' + r); if (!/^HANDOFF\b/.test(r) && !ctx.test && c.phone) await deliver('whatsapp', c.phone, r); }
    else if (n.type === 'a_catalog') { const ps = S.products || []; log(`  ${ps.length} product(s)`); if (!ctx.test) for (const p of ps.slice(0, 10)) await deliver('whatsapp', c.phone, `${p.name} - ${p.price}\n${p.desc}`); }
    else if (n.type === 'a_pay') { const r = await post('/api/payment-link', { amount: cfg.amount, description: cfg.desc, name: c.name, phone: c.phone }).catch(() => ({ status: 'failed' })); log('  payment link: ' + r.status); (S.pays = S.pays || []).push({ at: Date.now(), name: c.name, amount: +cfg.amount, desc: cfg.desc, status: r.status, url: r.url || '' }); if (r.url && !ctx.test) await deliver('whatsapp', c.phone, `Pay ₹${cfg.amount} for ${cfg.desc}: ${r.url}`); }
    else if (n.type === 'a_call') { if (ctx.test) log('  skipped in test'); else { const r = await post('/api/call', { to: c.phone, text: fillV(cfg.script || '', c) }).catch(() => ({ status: 'failed' })); (S.calls = S.calls || []).push({ at: Date.now(), to: c.phone, status: r.status, agent: 'flow' }); log('  call ' + r.status); } }
    else if (n.type === 'a_agent') { meta(c.phone).assignee = (cfg.email || '').toLowerCase(); meta(c.phone).bot = false; save(); log('  assigned'); }
    else if (n.type === 'a_status') { meta(c.phone).resolved = cfg.status === 'resolved'; save(); log('  ' + cfg.status); }
    else if (n.type === 'a_hook') { if (/^https:\/\//.test(cfg.url || '')) { fetch(cfg.url, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ contact: c }) }).catch(() => { }); log('  sent'); } else log('  invalid URL'); }
    ctx.onNode?.(n.id, 'done'); if (waiting) continue;
    for (const e of flow.edges.filter(e => e.from === n.id && (!d.branches || e.label === branch))) { if (!seen.has(e.id + steps)) queue.push(e.to); }
  }
  log('Done.');
}
async function runFlowsFor(m, c) {
  if (m.channel !== 'whatsapp') return false; let ran = false;
  // A pending "Ask a Question" node: this message is the answer. Save it and resume that flow.
  const pend = S.pendingAsk[m.from];
  if (pend) {
    delete S.pendingAsk[m.from]; save(); const f = S.flows.find(x => x.id === pend.flow), node = f && f.nodes.find(n => n.id === pend.node);
    if (node && Date.now() - pend.at < 24 * 3600e3) {
      const key = (node.cfg.var || 'reply').trim(), a = attrs().find(x => x.name === key);
      (c.vars = c.vars || {})[key] = m.text; if (a) (c.attrs = c.attrs || {})[a.id] = m.text; save();
      await execFlow(f, c, x => console.log('[flow]', f.name, x), { text: m.text, resumeFrom: node.id }); return true;
    }
  }
  for (const f of S.flows.filter(x => x.on)) {
    const t = f.nodes.find(n => n.type === 't_wa'); if (!t) continue; const kw = (t.cfg.keyword || '').trim().toLowerCase();
    if (kw && !String(m.text).toLowerCase().includes(kw)) continue;
    await execFlow(f, c, x => console.log('[flow]', f.name, x), { text: m.text }); ran = true; break;
  }
  return ran;
}
async function runFlowsEvent(type, c, info = {}) {
  for (const f of S.flows.filter(x => x.on)) {
    const t = f.nodes.find(n => n.type === type); if (!t) continue;
    if (type === 't_campaign' && t.cfg.campaign && t.cfg.campaign !== info.campaign) continue;
    await execFlow(f, c, x => console.log('[flow]', f.name, x), {});
  }
}

const NW = 230; // node width in px (matches .fn in workspace.css)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Deep-copy a flow with fresh ids; unknown node types and non-string config values are dropped (used by duplicate and import).
function cloneFlow(src, name) {
  const map = {}, nodes = [];
  for (const n of (src.nodes || []).slice(0, 50)) {
    if (!NODE_DEFS[n.type]) continue; const id = uid(); map[n.id] = id;
    const cfg = {}; for (const [k, v] of Object.entries(n.cfg || {})) if (typeof v === 'string') cfg[String(k).slice(0, 30)] = v.slice(0, 2000);
    nodes.push({ id, type: n.type, x: clamp(+n.x || 0, 0, 2800), y: clamp(+n.y || 0, 0, 1500), cfg });
  }
  const edges = (src.edges || []).filter(e => map[e.from] && map[e.to]).slice(0, 200).map(e => ({ id: uid(), from: map[e.from], to: map[e.to], label: ['yes', 'no'].includes(e.label) ? e.label : '' }));
  return { id: uid(), name: String(name || src.name || 'Imported flow').slice(0, 80), on: false, nodes, edges };
}
// Rule-based "describe your flow" generator (no AI model is called).
function flowFromText(text) {
  const t = String(text).toLowerCase(), found = [];
  const rules = [[/\bkeyword\s+["']?(\w+)/, 't_wa'], [/new contact|new lead|sign ?up|lead arrives/, 't_contact'], [/webhook/, 't_webhook'], [/campaign sent/, 't_campaign'], [/incoming|receive|message arrives|customer (writes|messages)/, 't_wa'],
    [/\bask\b|question/, 'a_ask'], [/welcome|reply|respond|send (a )?(message|whatsapp)|greet/, 'a_msg'], [/\blabel|tag\b/, 'a_label'], [/attribute|save (the )?(name|email|city)/, 'a_attr'], [/\bif\b|condition|check/, 'a_cond'], [/wait|delay|after \d/, 'a_wait'],
    [/\bai\b|assistant|gpt|bot answer/, 'a_ai'], [/catalog|product/, 'a_catalog'], [/payment|pay link|invoice/, 'a_pay'], [/\bcall\b|phone/, 'a_call'], [/human|assign agent|agent/, 'a_agent'], [/resolve|close chat/, 'a_status'], [/send webhook|call (a|the) url|notify system/, 'a_hook']];
  let keyword = ''; // only the explicit "keyword X" phrase sets the trigger keyword
  for (const [re, type] of rules) { const m = t.match(re); if (m) { found.push({ type, i: m.index }); if (/keyword/.test(re.source)) keyword = m[1]; } }
  found.sort((a, b) => a.i - b.i); const seen = new Set(), seq = [];
  for (const f of found) { if (!seen.has(f.type)) { seen.add(f.type); seq.push(f); } }
  const trig = { ...(seq.find(f => NODE_DEFS[f.type].kind === 'trigger') || { type: 't_wa' }), kw: keyword }, acts = seq.filter(f => NODE_DEFS[f.type].kind === 'action');
  const defaults = { a_msg: { text: 'Hi {{name}}, thanks for getting in touch!' }, a_ask: { text: 'What is your email address?', var: 'email' }, a_label: { value: 'Lead' }, a_wait: { seconds: '5' }, a_pay: { amount: '499', desc: 'Order' }, a_call: { script: 'Hello {{name}}, this is a courtesy call.' }, a_status: { status: 'resolved' } };
  const list = [[trig.type, trig.type === 't_wa' && trig.kw ? { keyword: trig.kw } : {}], ...acts.map(a => [a.type, { ...(defaults[a.type] || {}) }])];
  return { name: 'AI flow: ' + String(text).slice(0, 40), nodes: list.map(([type, cfg], i) => ({ id: 'n' + i, type, x: 40 + i * 270, y: 60, cfg })), edges: list.slice(1).map((_, i) => ({ id: 'e' + i, from: 'n' + i, to: 'n' + (i + 1), label: '' })) };
}
function flowWarnings(f) {
  const w = [], trig = f.nodes.find(n => NODE_DEFS[n.type].kind === 'trigger'); if (!trig) w.push('Add a trigger so the flow knows when to start.');
  if (trig) { const reach = new Set([trig.id]), q = [trig.id]; while (q.length) { const id = q.shift(); f.edges.filter(e => e.from === id).forEach(e => { if (!reach.has(e.to)) { reach.add(e.to); q.push(e.to); } }); } const lost = f.nodes.filter(n => !reach.has(n.id)).length; if (lost) w.push(`${lost} node(s) are not connected to the trigger and will never run.`); }
  f.nodes.forEach(n => { const d = NODE_DEFS[n.type]; if (d.branches) { ['yes', 'no'].forEach(l => { if (!f.edges.some(e => e.from === n.id && e.label === l)) w.push(`"${d.name}" has no ${l.toUpperCase()} connection.`); }); } if ((n.type === 'a_msg' || n.type === 'a_ask') && !(n.cfg.text || '').trim()) w.push(`"${d.name}" has no message text.`); if (n.type === 'a_ask' && !(n.cfg.var || '').trim()) w.push('"Ask a Question" needs a variable name to save the reply.'); });
  return w;
}
function autoLayout(f) {
  const trig = f.nodes.find(n => NODE_DEFS[n.type].kind === 'trigger'), depth = {}; if (trig) { depth[trig.id] = 0; const q = [trig.id]; while (q.length) { const id = q.shift(); f.edges.filter(e => e.from === id).forEach(e => { if (!(e.to in depth)) { depth[e.to] = depth[id] + 1; q.push(e.to); } }); } }
  const max = Math.max(-1, ...Object.values(depth)); f.nodes.forEach(n => { if (!(n.id in depth)) depth[n.id] = max + 1; });
  const cols = {}; f.nodes.forEach(n => (cols[depth[n.id]] = cols[depth[n.id]] || []).push(n));
  Object.entries(cols).forEach(([d, ns]) => ns.forEach((n, i) => { n.x = 40 + d * 280; n.y = 40 + i * 200; }));
}

V.flows = () => {
  if (flowEdit) return flowEditor();
  return `<h2>Flows</h2><div class="row"><button class="btn s" id="fnew">+ Add flow</button><button class="btn s o" id="fai">AI ✦ Describe a flow</button><label class="btn s o" style="cursor:pointer">Import JSON<input type="file" id="fimp" accept=".json" hidden></label></div>
  <h3>My flows</h3><table><tr><th>Name</th><th>Trigger</th><th>Nodes</th><th>Active</th><th></th></tr>${S.flows.map(f => `<tr><td>${esc(f.name)}</td><td>${esc((NODE_DEFS[(f.nodes.find(n => NODE_DEFS[n.type]?.kind === 'trigger') || {}).type] || {}).name || '-')}</td><td>${f.nodes.length}/50</td><td><input type="checkbox" data-fon="${f.id}" ${f.on ? 'checked' : ''} style="width:auto"></td><td><button class="btn s o" data-fed="${f.id}">Edit</button> <button class="btn s o" data-fdup="${f.id}">Duplicate</button> <button class="btn s o" data-fexp="${f.id}">Export</button> <button class="btn s d" data-fdel="${f.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=5>No flows yet.</td></tr>'}</table>
  <h3>Workflows library</h3><div class="grid">${FLOW_LIBRARY.map((l, i) => `<div class="card"><h3>${esc(l.name)}</h3><p>${l.nodes.length} nodes</p><p><button class="btn s" data-flib="${i}">Use this</button></p></div>`).join('')}</div>`;
};
V.flows.bind = () => {
  if (flowEdit) return flowBind();
  const open = f => { S.flows.push(f); flowEdit = f.id; save(); route(); };
  $('#fnew').onclick = () => open({ id: uid(), name: 'New flow', on: false, nodes: [], edges: [] });
  $('#fai').onclick = () => { const t = prompt('Describe the flow, e.g. "When a customer writes the keyword hello, welcome them, ask for their email, add the label lead and assign the AI assistant"'); if (t && t.trim()) open(cloneFlow(flowFromText(t))); };
  $('#fimp').onchange = async e => { try { const j = JSON.parse(await e.target.files[0].text()); const f = cloneFlow(j); if (!f.nodes.length) return toast('No valid nodes found in that file'); open(f); } catch { toast('That file is not valid flow JSON'); } };
  document.querySelectorAll('[data-fed]').forEach(b => b.onclick = () => { flowEdit = b.dataset.fed; route(); });
  document.querySelectorAll('[data-fdup]').forEach(b => b.onclick = () => { const f = S.flows.find(x => x.id === b.dataset.fdup); S.flows.push(cloneFlow(f, f.name + ' (copy)')); save(); route(); });
  document.querySelectorAll('[data-fexp]').forEach(b => b.onclick = () => { const f = S.flows.find(x => x.id === b.dataset.fexp); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ name: f.name, nodes: f.nodes, edges: f.edges }, null, 1)], { type: 'application/json' })); a.download = f.name.replace(/\W+/g, '-') + '.json'; a.click(); });
  document.querySelectorAll('[data-fdel]').forEach(b => b.onclick = () => { S.flows = S.flows.filter(f => f.id !== b.dataset.fdel); save(); route(); });
  document.querySelectorAll('[data-fon]').forEach(b => b.onchange = () => { const f = S.flows.find(x => x.id === b.dataset.fon); if (b.checked && !f.nodes.some(n => NODE_DEFS[n.type].kind === 'trigger')) { b.checked = false; return toast('Add a trigger before activating'); } f.on = b.checked; save(); });
  document.querySelectorAll('[data-flib]').forEach(b => b.onclick = () => open(newFlowFrom(FLOW_LIBRARY[+b.dataset.flib])));
};
function flowEditor() {
  const f = S.flows.find(x => x.id === flowEdit); const trig = Object.entries(NODE_DEFS).filter(([, d]) => d.kind === 'trigger'), act = Object.entries(NODE_DEFS).filter(([, d]) => d.kind === 'action');
  const pal = list => list.map(([k, d]) => `<button class="btn s o pal" data-add="${k}" style="border-left:4px solid ${d.color};text-align:left">${d.name}</button>`).join('');
  return `<div class="row"><button class="btn s o" id="fback">← Back</button><input id="fname" value="${esc(f.name)}" style="width:220px"><span class="pill" id="fcount"></span><label><input type="checkbox" id="fon" ${f.on ? 'checked' : ''} style="width:auto"> Active</label><button class="btn s" id="fsave">Save flow</button><button class="btn s o" id="fai2">AI ✦</button></div>
  <div class="row"><button class="btn s o" id="fundo" title="Undo (Ctrl+Z)">↶ Undo</button><button class="btn s o" id="fredo" title="Redo (Ctrl+Y)">↷ Redo</button><button class="btn s o" id="fzo">−</button><span class="pill" id="fzl">100%</span><button class="btn s o" id="fzi">+</button><button class="btn s o" id="ffit">Fit</button><button class="btn s o" id="flay">Auto-layout</button><button class="btn s o" id="fdupn" title="Ctrl+D">Duplicate node</button><button class="btn s o" id="fexp2">Export</button></div>
  <div id="fwarn"></div>
  <div class="fb"><div class="palette"><h6>Triggers</h6>${pal(trig)}<h6>Actions</h6>${pal(act)}<h6>Needs an integration</h6>${DISABLED_NODES.map(n => `<button class="btn s o pal" disabled title="Not available: needs an external integration or module" style="text-align:left;opacity:.5">${n}</button>`).join('')}</div>
  <div id="cvwrap" style="position:relative;flex:1;min-width:0"><div class="cv" id="cv"><div id="sizer"><div id="stage"><svg id="edges" width="3000" height="1600"></svg><div id="nodes"></div></div></div></div><div id="mini" title="Minimap: click to jump"></div></div></div>
  <p style="color:var(--mut);font-size:13px">Click a node's right dot, then another node's left dot to connect. Click a line to delete it. Drag a node by its title. Keys: Delete removes the selected node, Ctrl+D duplicates, Ctrl+Z / Ctrl+Y undo and redo. Conditions have yes and no outputs. "Ask a Question" waits for the customer's reply and saves it as a variable you can use as {{variable}}.</p>
  <div class="row"><select id="ftc" style="width:220px">${S.contacts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option value="">(add a contact first)</option>'}</select><button class="btn s" id="frun">Run test</button></div><pre class="log" id="flog"></pre>`;
}
function flowBind() {
  const f = S.flows.find(x => x.id === flowEdit); let pending = null; const E = { z: 1, sel: null, hist: [], fut: [] };
  const cv = $('#cv'), stage = $('#stage'), svg = $('#edges'), host = $('#nodes'), sizer = $('#sizer'), mini = $('#mini');
  const snapshot = () => JSON.stringify({ nodes: f.nodes, edges: f.edges });
  const snap = () => { E.hist.push(snapshot()); if (E.hist.length > 50) E.hist.shift(); E.fut = []; };
  const restore = s => { const o = JSON.parse(s); f.nodes = o.nodes; f.edges = o.edges; E.sel = null; save(); draw(); };
  const undo = () => { if (!E.hist.length) return toast('Nothing to undo'); E.fut.push(snapshot()); restore(E.hist.pop()); };
  const redo = () => { if (!E.fut.length) return toast('Nothing to redo'); E.hist.push(snapshot()); restore(E.fut.pop()); };
  const hOf = id => (host.querySelector(`.fn[data-id="${id}"]`) || {}).offsetHeight || 100;
  const field = (n, [k, label, type]) => {
    const v = n.cfg[k] ?? ''; const common = `data-nid="${n.id}" data-k="${k}" title="${esc(label)}" placeholder="${esc(label)}"`;
    if (Array.isArray(type)) return `<select ${common}>${type.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
    return type === 'area' ? `<textarea rows="3" ${common}>${esc(v)}</textarea>` : `<input ${common} value="${esc(v)}">`;
  };
  function setZoom(z) { E.z = clamp(z, 0.4, 1.5); stage.style.transform = `scale(${E.z})`; sizer.style.width = 3000 * E.z + 'px'; sizer.style.height = 1600 * E.z + 'px'; $('#fzl').textContent = Math.round(E.z * 100) + '%'; minimap(); }
  function bounds() { if (!f.nodes.length) return null; const xs = f.nodes.map(n => n.x), ys = f.nodes.map(n => n.y); return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...f.nodes.map(n => n.x + NW)), y1: Math.max(...f.nodes.map(n => n.y + hOf(n.id))) }; }
  function minimap() {
    const b = bounds(); if (!b) { mini.innerHTML = ''; return; } const w = b.x1 - b.x0 + 80, h = b.y1 - b.y0 + 80, s = Math.min(170 / w, 100 / h);
    mini.innerHTML = f.nodes.map(n => `<i style="left:${(n.x - b.x0 + 40) * s + 5}px;top:${(n.y - b.y0 + 40) * s + 5}px;width:${Math.max(3, NW * s)}px;height:${Math.max(3, hOf(n.id) * s)}px;background:${NODE_DEFS[n.type].color}"></i>`).join('') +
      `<b style="left:${(cv.scrollLeft / E.z - b.x0 + 40) * s + 5}px;top:${(cv.scrollTop / E.z - b.y0 + 40) * s + 5}px;width:${cv.clientWidth / E.z * s}px;height:${cv.clientHeight / E.z * s}px"></b>`; mini._m = { b, s };
  }
  function warn() { const w = flowWarnings(f); $('#fwarn').innerHTML = w.length ? `<div class="card" style="border-color:#f59e0b;margin:6px 0"><b>Check this flow:</b><ul style="margin:4px 0 0 18px;padding:0">${w.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''; $('#fcount').textContent = `Nodes: ${f.nodes.length}/50`; }
  function draw() {
    host.innerHTML = f.nodes.map(n => { const d = NODE_DEFS[n.type]; return `<div class="fn ${E.sel === n.id ? 'sel' : ''}" data-id="${n.id}" style="left:${n.x}px;top:${n.y}px"><div class="fh" style="background:${d.color}"><span>${d.name}</span><b data-del="${n.id}" title="Delete node">✕</b></div>
      <div class="fbody">${d.fields.map(fd => field(n, fd)).join('')}</div>
      ${d.kind === 'action' ? `<i class="port in" data-in="${n.id}" title="Input"></i>` : ''}
      ${d.branches ? `<i class="port out yes" data-out="${n.id}" data-l="yes" title="Yes output">Y</i><i class="port out no" data-out="${n.id}" data-l="no" title="No output">N</i>` : `<i class="port out" data-out="${n.id}" data-l="" title="Output"></i>`}</div>`; }).join('');
    host.querySelectorAll('[data-k]').forEach(i => { i.onfocus = () => { i._before = snapshot(); }; i.onchange = () => { const before = i._before || snapshot(); f.nodes.find(n => n.id === i.dataset.nid).cfg[i.dataset.k] = i.value; E.hist.push(before); E.fut = []; save(); warn(); }; });
    host.querySelectorAll('[data-del]').forEach(b => b.onclick = () => delNode(b.dataset.del));
    host.querySelectorAll('.fh').forEach(h => h.onpointerdown = e => {
      if (e.target.dataset.del) return; const el = h.parentElement, n = f.nodes.find(x => x.id === el.dataset.id), sx = e.clientX / E.z - n.x, sy = e.clientY / E.z - n.y, before = snapshot(); let moved = false;
      E.sel = n.id; host.querySelectorAll('.fn').forEach(x => x.classList.toggle('sel', x === el)); h.setPointerCapture(e.pointerId);
      h.onpointermove = ev => { moved = true; n.x = clamp(ev.clientX / E.z - sx, 0, 2800); n.y = clamp(ev.clientY / E.z - sy, 0, 1500); el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; edges(); minimap(); };
      h.onpointerup = () => { h.onpointermove = h.onpointerup = null; if (moved) { E.hist.push(before); E.fut = []; save(); } };
    });
    host.querySelectorAll('[data-out]').forEach(p => p.onclick = e => { e.stopPropagation(); pending = { from: p.dataset.out, label: p.dataset.l }; host.querySelectorAll('.port').forEach(x => x.classList.remove('sel')); p.classList.add('sel'); });
    host.querySelectorAll('[data-in]').forEach(p => p.onclick = e => {
      e.stopPropagation(); if (!pending || pending.from === p.dataset.in) return;
      if (!f.edges.some(x => x.from === pending.from && x.to === p.dataset.in && x.label === pending.label)) { snap(); f.edges.push({ id: uid(), from: pending.from, to: p.dataset.in, label: pending.label }); }
      pending = null; save(); draw();
    });
    edges(); warn(); minimap();
  }
  function edges() {
    svg.innerHTML = f.edges.map(e => {
      const a = f.nodes.find(n => n.id === e.from), b = f.nodes.find(n => n.id === e.to); if (!a || !b) return '';
      const x1 = a.x + NW + 1, y1 = a.y + hOf(a.id) * (e.label === 'yes' ? 0.35 : e.label === 'no' ? 0.7 : 0.5) + 8, x2 = b.x - 1, y2 = b.y + hOf(b.id) * 0.5 + 8, dx = Math.max(40, Math.abs(x2 - x1) / 2);
      return `<path data-e="${e.id}" d="M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}" fill="none" stroke="${e.label === 'no' ? '#dc2626' : '#7c3aed'}" stroke-width="3" style="cursor:pointer;pointer-events:stroke"><title>Click to delete</title></path>`;
    }).join('');
    svg.querySelectorAll('[data-e]').forEach(p => p.onclick = () => { snap(); f.edges = f.edges.filter(e => e.id !== p.dataset.e); save(); edges(); warn(); });
  }
  function delNode(id) { snap(); f.nodes = f.nodes.filter(n => n.id !== id); f.edges = f.edges.filter(e => e.from !== id && e.to !== id); if (E.sel === id) E.sel = null; save(); draw(); }
  function dupNode() {
    const n = f.nodes.find(x => x.id === E.sel); if (!n) return toast('Select a node first (click its title)'); if (NODE_DEFS[n.type].kind === 'trigger') return toast('A flow can have only one trigger'); if (f.nodes.length >= 50) return toast('Limit is 50 nodes per flow');
    snap(); const c = { id: uid(), type: n.type, x: n.x + 30, y: n.y + 30, cfg: { ...n.cfg } }; f.nodes.push(c); E.sel = c.id; save(); draw();
  }
  function addNode(t) {
    if (f.nodes.length >= 50) return toast('Limit is 50 nodes per flow'); if (NODE_DEFS[t].kind === 'trigger' && f.nodes.some(n => NODE_DEFS[n.type].kind === 'trigger')) return toast('A flow can have only one trigger');
    snap(); const x = clamp((cv.scrollLeft + cv.clientWidth / 2) / E.z - NW / 2 + (f.nodes.length % 5) * 20, 0, 2800), y = clamp((cv.scrollTop + 60) / E.z + (f.nodes.length % 5) * 24, 0, 1500);
    const n = { id: uid(), type: t, x, y, cfg: {} }; f.nodes.push(n); E.sel = n.id; save(); draw();
  }
  function fit() { const b = bounds(); if (!b) return setZoom(1); const z = clamp(Math.min(cv.clientWidth / (b.x1 - b.x0 + 80), cv.clientHeight / (b.y1 - b.y0 + 80)), 0.4, 1); setZoom(z); cv.scrollLeft = (b.x0 - 40) * z; cv.scrollTop = (b.y0 - 40) * z; }
  document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => addNode(b.dataset.add));
  $('#fname').onchange = e => { f.name = e.target.value; save(); };
  $('#fon').onchange = e => { if (e.target.checked && !f.nodes.some(n => NODE_DEFS[n.type].kind === 'trigger')) { e.target.checked = false; return toast('Add a trigger before activating'); } f.on = e.target.checked; save(); };
  $('#fsave').onclick = () => { save(); toast('Flow saved'); };
  $('#fback').onclick = () => { save(); flowEdit = null; route(); };
  $('#fundo').onclick = undo; $('#fredo').onclick = redo; $('#fzi').onclick = () => setZoom(E.z + 0.1); $('#fzo').onclick = () => setZoom(E.z - 0.1); $('#ffit').onclick = fit; $('#fdupn').onclick = dupNode;
  $('#flay').onclick = () => { if (!f.nodes.length) return; snap(); autoLayout(f); save(); draw(); fit(); };
  const doAi = () => { const t = prompt('Describe the flow in plain words (rule-based, no AI model is used):'); if (!t || !t.trim()) return; if (f.nodes.length && !confirm('Replace the nodes in this flow?')) return; snap(); const g = cloneFlow(flowFromText(t)); f.nodes = g.nodes; f.edges = g.edges; save(); draw(); fit(); };
  $('#fai2').onclick = doAi;
  $('#fexp2').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ name: f.name, nodes: f.nodes, edges: f.edges }, null, 1)], { type: 'application/json' })); a.download = f.name.replace(/\W+/g, '-') + '.json'; a.click(); };
  cv.onscroll = minimap;
  cv.addEventListener('wheel', e => { if (e.ctrlKey) { e.preventDefault(); setZoom(E.z + (e.deltaY < 0 ? 0.1 : -0.1)); } }, { passive: false });
  mini.onclick = e => { const m = mini._m; if (!m) return; const r = mini.getBoundingClientRect(), x = ((e.clientX - r.left - 5) / m.s + m.b.x0 - 40) * E.z, y = ((e.clientY - r.top - 5) / m.s + m.b.y0 - 40) * E.z; cv.scrollLeft = x - cv.clientWidth / 2; cv.scrollTop = y - cv.clientHeight / 2; };
  if (flowBind.key) document.removeEventListener('keydown', flowBind.key);
  flowBind.key = e => {
    if (!flowEdit || location.hash !== '#flows') { document.removeEventListener('keydown', flowBind.key); return; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return; const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if ((k === 'delete' || k === 'backspace') && E.sel) { e.preventDefault(); delNode(E.sel); }
    else if (ctrl && k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); } else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    else if (ctrl && k === 'd') { e.preventDefault(); dupNode(); } else if (k === 'escape') { pending = null; E.sel = null; draw(); }
  };
  document.addEventListener('keydown', flowBind.key);
  $('#frun').onclick = async () => {
    const c = S.contacts.find(x => x.id === $('#ftc').value); const log = $('#flog'); log.textContent = ''; host.querySelectorAll('.fn').forEach(x => x.classList.remove('run', 'done')); if (!c) return (log.textContent = 'Add a contact first.');
    await execFlow(f, c, t => { log.textContent += t + '\n'; }, { test: true, onNode: (id, st) => { const el = host.querySelector(`.fn[data-id="${id}"]`); if (el) { el.classList.remove('run', 'done'); el.classList.add(st); } } });
  };
  setZoom(1); draw(); if (f.nodes.length > 4) fit();
}

// ---------- account settings ----------
V.people = () => V.team();
V.people.bind = () => V.team.bind();
S.autoset = S.autoset || { abandoned: false, mode: 'exit_send', days: 0, hrs: 24, mins: 0, text: 'Are you still there? Reply to continue.' };
V.autosettings = () => { const a = S.autoset; return `<h2>Automation Settings</h2><div class="card"><h3>Abandoned WhatsApp chat <label style="font-weight:400"><input type="checkbox" id="ab" ${a.abandoned ? 'checked' : ''} style="width:auto"> On</label></h3>
<p style="color:var(--mut)">When a contact stops replying to an active workflow bot, choose what happens after the wait time. Runs while this workspace is open.</p>
<div class="row"><label><input type="radio" name="md" value="exit" ${a.mode === 'exit' ? 'checked' : ''} style="width:auto"> Exit queue</label><label><input type="radio" name="md" value="exit_send" ${a.mode === 'exit_send' ? 'checked' : ''} style="width:auto"> Exit queue + send message</label></div>
<div class="row"><label>Days <input id="ad" type="number" min="0" value="${a.days}" style="width:80px"></label><label>Hrs <input id="ah" type="number" min="0" max="23" value="${a.hrs}" style="width:80px"></label><label>Mins <input id="am" type="number" min="0" max="59" value="${a.mins}" style="width:80px"></label></div>
<p>Follow-up message</p><textarea id="at" rows="3">${esc(a.text)}</textarea><p><button class="btn s" id="asv2">Save</button></p></div>`; };
V.autosettings.bind = () => $('#asv2').onclick = () => { S.autoset = { abandoned: $('#ab').checked, mode: document.querySelector('[name=md]:checked').value, days: +$('#ad').value || 0, hrs: +$('#ah').value || 0, mins: +$('#am').value || 0, text: $('#at').value }; save(); toast('Saved'); };
setInterval(async () => {
  const a = S.autoset; if (!a?.abandoned) return; const limit = ((a.days * 24 + a.hrs) * 60 + a.mins) * 60e3; if (limit <= 0) return;
  for (const [f, m] of Object.entries(S.meta || {})) {
    if (!m.bot || !m.lastBotAt || m.abandonedSent || m.resolved) continue; if (new Date(m.lastIn || 0).getTime() > m.lastBotAt) continue; if (Date.now() - m.lastBotAt < limit) continue;
    m.abandonedSent = true; m.bot = false; if (a.mode === 'exit_send' && Date.now() - m.lastBotAt < 24 * 3600e3) await deliver(m.ch || 'whatsapp', f, a.text); notify(`Chat with ${f} marked abandoned`); save();
  }
}, 30000);
S.inboxSet = S.inboxSet || { sound: false };
V.inboxsettings = () => { S.chat = S.chat || { frt: 5 }; return `<h2>Inbox Settings</h2><div class="card"><h3>Notification sound</h3><label><input type="checkbox" id="snd" ${S.inboxSet.sound ? 'checked' : ''} style="width:auto"> Play a sound for incoming chats</label></div>
<div class="card" style="margin-top:12px"><h3>First Response Time</h3><p style="color:var(--mut)">Time between a customer's first message and an agent's first follow-up. If the limit is breached the chat is marked FRT exceeded (red dot).</p><label>FRT limit (minutes) <input id="frtm" type="number" min="1" max="1440" value="${S.chat.frt}" style="width:100px"></label> <button class="btn s" id="isv">Save</button></div>`; };
V.inboxsettings.bind = () => { $('#snd').onchange = e => { S.inboxSet.sound = e.target.checked; save(); if (e.target.checked) beep(); }; $('#isv').onclick = () => { S.chat.frt = Math.max(1, +$('#frtm').value || 5); save(); toast('Saved'); }; };
const HOOK_EVENTS = ['message.received', 'contact.created', 'form.submitted', 'campaign.finished'];
V.webhooks = () => `<h2>Webhooks</h2><p style="color:var(--mut)">Send an HTTPS POST to your URL when something happens. Browsers cannot read cross-site responses, so deliveries are fire-and-forget. Currently emitted: message.received. The other events are listed for planning but not fired yet.</p>
<form class="row" id="hf2"><input name="name" placeholder="Name" required style="width:160px"><input name="url" type="url" placeholder="https://…" required style="width:300px">${HOOK_EVENTS.map(e => `<label><input type="checkbox" name="ev" value="${e}" ${e === 'message.received' ? 'checked' : ''} style="width:auto"> ${e}</label>`).join(' ')}<button class="btn s">Add</button></form>
<table><tr><th>Name</th><th>URL</th><th>Events</th><th></th></tr>${(S.hooks || []).map(h => `<tr><td>${esc(h.name)}</td><td>${esc(h.url)}</td><td>${esc((h.events || ['all']).join(', '))}</td><td><button class="btn s o" data-wt="${h.id}">Test</button> <button class="btn s d" data-wd="${h.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=4>None.</td></tr>'}</table>`;
V.webhooks.bind = () => {
  S.hooks = S.hooks || [];
  $('#hf2').onsubmit = e => { e.preventDefault(); const u = e.target.url.value; if (!/^https:\/\//.test(u)) return toast('Use an https URL'); S.hooks.push({ id: uid(), name: e.target.name.value, url: u, events: [...e.target.querySelectorAll('[name=ev]:checked')].map(x => x.value) }); save(); route(); };
  document.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => { S.hooks = S.hooks.filter(h => h.id !== b.dataset.wd); save(); route(); });
  document.querySelectorAll('[data-wt]').forEach(b => b.onclick = () => { const h = S.hooks.find(x => x.id === b.dataset.wt); fetch(h.url, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ event: 'test' }) }).then(() => toast('Test sent')).catch(() => toast('Failed')); });
};
V.settingsattr = () => V.attributes();
V.settingsattr.bind = () => V.attributes.bind();

// ---------- analytics ----------
const ch = c => ({ whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS', rcs: 'RCS' }[c] || c);
V.analytics = () => { const cs = S.campaigns, tot = cs.reduce((a, c) => a + c.total, 0), sent = cs.reduce((a, c) => a + c.sent, 0), fail = cs.reduce((a, c) => a + c.failed, 0);
  return `<h2>Broadcast Analytics</h2><div class="k"><div class="card"><p>Campaigns</p><div class="n">${cs.length}</div></div><div class="card"><p>Recipients</p><div class="n">${tot}</div></div><div class="card"><p>Sent</p><div class="n">${sent}</div></div><div class="card"><p>Failed</p><div class="n">${fail}</div></div><div class="card"><p>Success rate</p><div class="n">${pct(sent, tot)}</div></div></div>
  <p style="color:var(--mut);font-size:13px">Delivered, opened and clicked need delivery callbacks from your provider, which are not wired up, so they are not shown.</p>
  <table><tr><th>Campaign</th><th>Channel</th><th>Date</th><th>Recipients</th><th>Sent</th><th>Failed</th><th>Success</th><th></th></tr>${cs.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(ch(c.channel))}</td><td>${c.at ? fmtTime(c.at) : ''}</td><td>${c.total}</td><td>${c.sent}</td><td>${c.failed}</td><td><div style="background:var(--bd);width:100px;border-radius:6px"><div style="background:var(--pri);height:8px;border-radius:6px;width:${c.total ? Math.round(c.sent / c.total * 100) : 0}px"></div></div>${pct(c.sent, c.total)}</td><td>${esc(c.mode)}</td></tr>`).join('') || '<tr><td colspan=8>No campaigns yet.</td></tr>'}</table>`; };
let gaTab = 'whatsapp', gaQ = '', gaSt = '';
V.globalanalytics = () => {
  const all = (S.msglog || []).filter(m => m.channel === gaTab), sent = all.filter(m => m.status === 'sent').length, failed = all.filter(m => m.status === 'failed').length;
  const rows = all.filter(m => (!gaSt || m.status === gaSt) && (!gaQ || String(m.to).toLowerCase().includes(gaQ.toLowerCase()))).slice().reverse();
  return `<h2>Global Analytics</h2><div class="row tabs">${['whatsapp', 'email', 'sms', 'rcs'].map(t => `<a href="#globalanalytics" data-ga="${t}" class="${t === gaTab ? 'on' : ''}">${ch(t)}</a>`).join('')}<span class="sp" style="flex:1"></span><button class="btn s" id="gex">Export</button></div>
  <div class="k">${[['Sent', sent], ['Delivered', '--'], ['Opened', '--'], ['Clicked', '--'], ['Failed', failed], ['Queued', 0]].map(([k, v]) => `<div class="card"><p>${k}</p><div class="n">${v}</div></div>`).join('')}</div>
  <div class="row"><select id="gst" style="width:130px"><option value="">All status</option><option ${gaSt === 'sent' ? 'selected' : ''}>sent</option><option ${gaSt === 'failed' ? 'selected' : ''}>failed</option></select><input id="gq" placeholder="Search recipient" value="${esc(gaQ)}" style="width:220px"></div>
  <table><tr><th>Recipient</th><th>Channel</th><th>Status</th><th>Mode</th><th>Time</th></tr>${rows.slice(0, 200).map(m => `<tr><td>${esc(m.to)}</td><td>${esc(ch(m.channel))}</td><td>${esc(m.status)}</td><td>${esc(m.mode)}</td><td>${fmtTime(m.at)}</td></tr>`).join('') || '<tr><td colspan=5>No messages in this channel.</td></tr>'}</table><p style="color:var(--mut);font-size:13px">RCS is not supported by the backend, so that tab stays empty. Delivered/opened/clicked need provider callbacks.</p>`;
};
V.globalanalytics.bind = () => {
  document.querySelectorAll('[data-ga]').forEach(a => a.onclick = e => { e.preventDefault(); gaTab = a.dataset.ga; route(); });
  $('#gst').onchange = e => { gaSt = e.target.value; route(); }; $('#gq').onchange = e => { gaQ = e.target.value; route(); };
  $('#gex').onclick = () => csvDownload([['recipient', 'channel', 'status', 'mode', 'time'], ...(S.msglog || []).filter(m => m.channel === gaTab).map(m => [m.to, m.channel, m.status, m.mode, new Date(m.at).toISOString()])], `analytics-${gaTab}.csv`);
};
V.supportanalytics = () => '<h2>WA Support Analytics</h2><div id="sab">Loading…</div>';
V.supportanalytics.bind = async () => {
  const msgs = await pollInbox(); if (!msgs) { $('#sab').innerHTML = NOBACK; return; }
  const th = {}; msgs.forEach(m => (th[m.from] = th[m.from] || []).push(m)); const stat = {}; let frtSum = 0, frtN = 0, exceeded = 0; const byAgent = {};
  Object.entries(th).forEach(([f, ms]) => {
    const s = chatStatus(f, ms); s.forEach(x => stat[x] = (stat[x] || 0) + 1); if (s.has('FRT EXCEEDED')) exceeded++;
    const first = ms.find(m => m.dir === 'in'), reply = first && ms.find(m => m.dir === 'out' && !m.bot && new Date(m.at) > new Date(first.at)); if (reply) { frtSum += new Date(reply.at) - new Date(first.at); frtN++; }
    const a = meta(f).assignee || 'Unassigned'; byAgent[a] = (byAgent[a] || 0) + 1;
  });
  $('#sab').innerHTML = `<div class="k"><div class="card"><p>Chats</p><div class="n">${Object.keys(th).length}</div></div><div class="card"><p>Avg first response</p><div class="n">${frtN ? (frtSum / frtN / 60000).toFixed(1) + ' min' : '--'}</div></div><div class="card"><p>FRT exceeded</p><div class="n">${exceeded}</div></div><div class="card"><p>Inbound messages</p><div class="n">${msgs.filter(m => m.dir === 'in').length}</div></div></div>
  <h3>By status</h3><table>${Object.entries(stat).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('') || '<tr><td>No chats yet</td></tr>'}</table><h3>By agent</h3><table>${Object.entries(byAgent).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('') || '<tr><td>No chats yet</td></tr>'}</table>`;
};
V.wapay = () => { const p = S.pays || [], tot = p.filter(x => x.status === 'created').reduce((a, x) => a + x.amount, 0);
  return `<h2>WhatsApp Payments</h2><div class="k"><div class="card"><p>Links created</p><div class="n">${p.filter(x => x.status === 'created').length}</div></div><div class="card"><p>Total requested</p><div class="n">₹${tot}</div></div><div class="card"><p>Failed / simulated</p><div class="n">${p.filter(x => x.status !== 'created').length}</div></div></div>
  <p style="color:var(--mut);font-size:13px">These are Razorpay payment links. Paid status needs Razorpay webhooks, which are not connected, so payments are not marked as collected.</p>
  <p><a class="btn s" href="#payments">Create a payment link</a></p><table><tr><th>Date</th><th>Contact</th><th>Amount</th><th>For</th><th>Status</th><th>Link</th></tr>${p.slice().reverse().map(x => `<tr><td>${fmtTime(x.at)}</td><td>${esc(x.name)}</td><td>₹${x.amount}</td><td>${esc(x.desc)}</td><td>${esc(x.status)}</td><td>${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">open</a>` : ''}</td></tr>`).join('') || '<tr><td colspan=6>None yet.</td></tr>'}</table>`; };

// Dashboard: add a 7-day message chart (supersedes V.dash)
const dash0 = V.dash;
V.dash = () => {
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
  const counts = days.map(d => (S.msglog || []).filter(m => m.at >= d.getTime() && m.at < d.getTime() + 864e5).length), max = Math.max(1, ...counts);
  return dash0() + `<h3>Messages, last 7 days</h3><div style="display:flex;align-items:flex-end;gap:8px;height:120px">${counts.map((c, i) => `<div style="flex:1;text-align:center"><div style="background:var(--pri);height:${Math.round(c / max * 90)}px;border-radius:4px 4px 0 0" title="${c}"></div><small>${days[i].toLocaleDateString(undefined, { weekday: 'short' })}<br>${c}</small></div>`).join('')}</div>`;
};

// ---------- menu ----------
const mg = name => MENU.find(g => g[0] === name);
mg('Marketing')[1].push(['analytics', 'Broadcast Analytics'], ['globalanalytics', 'Global Analytics']);
mg('Automations')[1].unshift(['flows', 'Flow Builder']);
mg('Support')[1].push(['supportanalytics', 'WA Support Analytics']);
mg('Commerce')[1].push(['wapay', 'Payment Analytics']);
MENU.push(['Account Settings', [['people', 'People'], ['autosettings', 'Automation Settings'], ['inboxsettings', 'Inbox Settings'], ['webhooks', 'Webhooks'], ['settingsattr', 'Attributes'], ['notifications', 'Notifications']]]);
route();
