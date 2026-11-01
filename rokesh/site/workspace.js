// Workspace: contacts, templates, campaigns, workflows, AI agent. State lives in localStorage.
// Real delivery: set window.SEND_ENDPOINT (POST {channel,to,text}) to a backend that holds provider keys.
// Real AI replies: set window.AGENT_ENDPOINT (POST {system,knowledge,messages}) -> {reply}.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const SEED_TEMPLATES = [
  ['Offer message', 'Ecommerce', 'Hi {{1}}! {{2}}% off on any purchase. Use code {{3}}. Offer ends tonight.'],
  ['Order cancelled', 'Ecommerce', 'Hi {{1}}! Your order {{2}} of {{3}} has been cancelled. We hope to see you again.'],
  ['COD to Prepaid', 'Ecommerce', 'Hey {{1}}, your order for {{2}} is confirmed. Pay now and get {{3}} off with code {{4}}.'],
  ['Delivery tracking', 'Ecommerce', 'Hey {{1}}, your order of {{2}} from {{3}} has shipped. Track it here.'],
  ['Admission enquiry', 'Education', 'Hi {{1}}, thanks for your interest in {{2}}. Reply YES to book a counselling call.'],
  ['Appointment reminder', 'Healthcare', 'Hi {{1}}, a reminder of your appointment on {{2}} at {{3}}.'],
  ['Webinar invite', 'Webinar', 'Hi {{1}}, join our webinar "{{2}}" on {{3}}. Register here.'],
].map(([name, cat, body]) => ({ id: uid(), name, cat, body, channel: 'whatsapp' }));

const DEFAULT = () => ({
  contacts: [], labels: ['Lead', 'Customer'], templates: SEED_TEMPLATES, campaigns: [],
  workflows: [{ id: uid(), name: 'Admission Registration (sample)', event: 'incomingWA', on: false, steps: [
    { type: 'send', channel: 'whatsapp', text: 'Hi {{name}}, thanks for your interest! Which course are you looking for?' },
    { type: 'label', value: 'Lead' }, { type: 'wait', value: '1' },
    { type: 'send', channel: 'email', text: 'Hi {{name}}, here is our admission brochure.' }] }],
  agent: { name: 'Support agent', system: 'You are a helpful support agent. Answer briefly and politely.', knowledge: 'Our hours are 9am to 6pm Monday to Saturday.\nRefunds are processed in 5-7 working days.\nWe support WhatsApp, email and SMS.', exit: 'bye, thanks' },
  wallet: 50,
});
let S; try { S = JSON.parse(localStorage.getItem('ws') || 'null'); } catch { S = null; }
S = S || DEFAULT();
const save = () => { try { localStorage.setItem('ws', JSON.stringify(S)); } catch { } };
const toast = m => { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(toast.h); toast.h = setTimeout(() => t.style.display = 'none', 2500); };

// Delivery: simulated unless SEND_ENDPOINT is set.
// The local backend (server/server.mjs) exposes /api/status and /api/send; if it is absent we stay simulated.
// deliver() records every attempt in S.msglog (used by the analytics pages) and delegates to deliverRaw().
async function deliver(channel, to, text, extra) {
  const r = await deliverRaw(channel, to, text, extra);
  (S.msglog = S.msglog || []).push({ at: Date.now(), channel, to, status: r === 'failed' ? 'failed' : 'sent', mode: r });
  if (S.msglog.length > 3000) S.msglog.splice(0, S.msglog.length - 3000);
  save(); return r;
}
async function deliverRaw(channel, to, text, extra) {
  await sleep(120);
  if (window.SEND_ENDPOINT) {
    try {
      const r = await fetch(window.SEND_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, to, text, ...(extra || {}) }) });
      const j = await r.json().catch(() => ({}));
      if (j.error) toast(j.error);
      return j.status || (r.ok ? 'sent' : 'failed');
    } catch { return 'failed'; }
  }
  return 'simulated';
}
fetch('/api/status').then(r => r.json()).then(j => { if (j.agentLive) window.AGENT_ENDPOINT = '/api/agent'; if (j.live) { window.SEND_ENDPOINT = '/api/send'; } route(); }).catch(() => { });
const fill = (t, c) => String(t).replace(/\{\{\s*name\s*\}\}/g, c.name || '').replace(/\{\{\s*1\s*\}\}/g, c.name || '').replace(/\{\{\s*(\d+)\s*\}\}/g, '…');

const MENU = [['Dashboard', [['dash', 'Dashboard']]], ['Data', [['contacts', 'Contacts'], ['attributes', 'Attributes'], ['labels', 'Labels'], ['forms', 'Smart Forms']]], ['Marketing', [['campaigns', 'Broadcasts'], ['templates', 'Template Library'], ['qr', 'QR & Chat Button']]], ['Automations', [['keywords', 'Keywords'], ['workflows', 'Workflows'], ['sequences', 'Sequences'], ['integrations', 'Integrations']]], ['Agentic AI', [['agent', 'AI Chat Agent'], ['voice', 'Voice Calls']]], ['Support', [['inbox', 'Team Inbox'], ['canned', 'Canned Responses'], ['team', 'Team & Chat Settings']]], ['Commerce', [['catalog', 'WhatsApp Catalog'], ['payments', 'Payment Links']]]];
const V = {};

V.dash = () => {
  const sent = S.campaigns.reduce((a, c) => a + c.sent, 0);
  return `<h2>Hello</h2><div class="k">
  <div class="card"><p>Contacts</p><div class="n">${S.contacts.length}</div></div>
  <div class="card"><p>Campaigns</p><div class="n">${S.campaigns.length}</div></div>
  <div class="card"><p>Messages sent</p><div class="n">${sent}</div></div>
  <div class="card"><p>Workflows on</p><div class="n">${S.workflows.filter(w => w.on).length}/${S.workflows.length}</div></div>
  <div class="card"><p>Wallet</p><div class="n">₹${S.wallet}</div></div></div>
  <p style="color:var(--mut)">Delivery mode: <b>${window.SEND_ENDPOINT ? 'live backend' : 'simulated (no messages leave this browser)'}</b></p>`;
};

V.contacts = () => `<h2>Contacts</h2>
<form class="row" id="cf"><input name="name" placeholder="Name" required style="width:160px"><input name="phone" placeholder="Phone" style="width:150px"><input name="email" type="email" placeholder="Email" style="width:190px">
<select name="label" style="width:130px">${S.labels.map(l => `<option>${esc(l)}</option>`).join('')}</select><button class="btn s">Add contact</button></form>
<div class="row"><label>Import CSV (name,phone,email,label): <input type="file" id="csv" accept=".csv" style="width:auto"></label></div>
<table><tr><th>Name</th><th>Phone</th><th>Email</th><th>Label</th><th></th></tr>${S.contacts.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td>${esc(c.email)}</td><td>${esc(c.label)}</td><td><button class="btn s d" data-del="${c.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=5>No contacts yet.</td></tr>'}</table>`;
V.contacts.bind = () => {
  $('#cf').onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); S.contacts.push({ id: uid(), ...d }); save(); route(); };
  $('#csv').onchange = async e => { const t = await e.target.files[0].text(); let n = 0; t.split(/\r?\n/).slice(1).forEach(l => { const [name, phone, email, label] = l.split(','); if (name?.trim()) { S.contacts.push({ id: uid(), name: name.trim(), phone: (phone || '').trim(), email: (email || '').trim(), label: (label || '').trim() }); n++; } }); save(); toast(n + ' imported'); route(); };
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.contacts = S.contacts.filter(c => c.id !== b.dataset.del); save(); route(); });
};

V.labels = () => `<h2>Labels</h2><form class="row" id="lf"><input name="l" placeholder="New label" required style="width:200px"><button class="btn s">Add label</button></form>
<table><tr><th>Label</th><th>Contacts</th><th></th></tr>${S.labels.map(l => `<tr><td>${esc(l)}</td><td>${S.contacts.filter(c => c.label === l).length}</td><td><button class="btn s d" data-ld="${esc(l)}">Delete</button></td></tr>`).join('')}</table>`;
V.labels.bind = () => {
  $('#lf').onsubmit = e => { e.preventDefault(); const v = e.target.l.value.trim(); if (v && !S.labels.includes(v)) S.labels.push(v); save(); route(); };
  document.querySelectorAll('[data-ld]').forEach(b => b.onclick = () => { S.labels = S.labels.filter(l => l !== b.dataset.ld); save(); route(); });
};

V.templates = () => `<h2>Template Library</h2>
<form class="row" id="tf"><input name="name" placeholder="Template name" required style="width:170px"><select name="channel" style="width:120px"><option>whatsapp</option><option>email</option><option>sms</option></select>
<input name="cat" placeholder="Category" style="width:130px"><input name="body" placeholder="Body with {{1}} variables" required style="width:320px"><button class="btn s">Add</button></form>
<div class="grid">${S.templates.map(t => `<div class="card"><h3>${esc(t.name)}</h3><p style="font-size:12px">${esc(t.cat)} · ${esc(t.channel)}</p><p style="margin-top:8px">${esc(t.body)}</p><p><button class="btn s d" data-td="${t.id}">Delete</button></p></div>`).join('')}</div>`;
V.templates.bind = () => {
  $('#tf').onsubmit = e => { e.preventDefault(); S.templates.push({ id: uid(), ...Object.fromEntries(new FormData(e.target)) }); save(); route(); };
  document.querySelectorAll('[data-td]').forEach(b => b.onclick = () => { S.templates = S.templates.filter(t => t.id !== b.dataset.td); save(); route(); });
};

V.campaigns = () => `<h2>Broadcasts</h2>
<form class="row" id="bf"><input name="name" placeholder="Campaign name" required style="width:170px"><select name="tpl" style="width:190px">${S.templates.map(t => `<option value="${t.id}">${esc(t.name)} (${esc(t.channel)})</option>`).join('')}</select>
<select name="label" style="width:150px"><option value="">All contacts</option>${S.labels.map(l => `<option>${esc(l)}</option>`).join('')}</select><button class="btn s">Send campaign</button></form>
<table><tr><th>Name</th><th>Channel</th><th>Contacts</th><th>Sent</th><th>Failed</th><th>Mode</th></tr>${S.campaigns.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.channel)}</td><td>${c.total}</td><td>${c.sent}</td><td>${c.failed}</td><td>${esc(c.mode)}</td></tr>`).join('') || '<tr><td colspan=6>No campaigns yet.</td></tr>'}</table>`;
V.campaigns.bind = () => {
  $('#bf').onsubmit = async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); const t = S.templates.find(x => x.id === d.tpl);
    const to = S.contacts.filter(c => !d.label || c.label === d.label);
    if (!t || !to.length) return toast('No template or no matching contacts');
    let sent = 0, failed = 0, mode = 'simulated';
    for (const c of to) { const dest = t.channel === 'email' ? c.email : c.phone; if (!dest) { failed++; continue; } const r = await deliver(t.channel, dest, fill(t.body, c)); if (r === 'failed') failed++; else { sent++; mode = r; } }
    if (!window.SEND_ENDPOINT) mode = 'simulated';
    S.campaigns.unshift({ id: uid(), name: d.name, channel: t.channel, label: d.label || 'All', type: 'Broadcast', total: to.length, sent, failed, opened: 0, clicked: 0, mode, at: Date.now() }); save();
    if (typeof notify === 'function') notify(`Campaign "${d.name}" finished: ${sent} sent, ${failed} failed`);
    if (typeof fireHooks === 'function') fireHooks('campaign.finished', { name: d.name, sent, failed });
    if (typeof runFlowsEvent === 'function') for (const c of to) await runFlowsEvent('t_campaign', c, { campaign: d.name });
    route();
  };
};

// Workflows: trigger event + ordered steps. Engine runs steps against a chosen contact.
const STEP = { send: 'Send message', label: 'Add label', attr: 'Set attribute (name=value)', wait: 'Wait (seconds)', cond: 'If contact has label (else stop)', webhook: 'Send webhook', ai: 'AI reply (uses agent)', call: 'Make call (reads script aloud)' };
let editing = null;
V.workflows = () => {
  if (editing) { const w = S.workflows.find(x => x.id === editing); return `<h2>Edit workflow</h2>
  <div class="row"><input id="wn" value="${esc(w.name)}" style="width:260px"><select id="we" style="width:170px">${['incomingWA', 'instagramEvent', 'newContact', 'keyword'].map(x => `<option ${x === w.event ? 'selected' : ''}>${x}</option>`).join('')}</select>
  <label><input type="checkbox" id="won" ${w.on ? 'checked' : ''} style="width:auto"> Active</label></div>
  <div class="flow">${w.steps.map((s, i) => `<div class="node"><b>${i + 1}. ${STEP[s.type]}</b><div class="row">
  ${s.type === 'send' ? `<select data-i="${i}" data-k="channel" style="width:110px">${['whatsapp', 'email', 'sms'].map(c => `<option ${c === s.channel ? 'selected' : ''}>${c}</option>`).join('')}</select><input data-i="${i}" data-k="text" value="${esc(s.text)}" style="width:340px">` : `<input data-i="${i}" data-k="value" value="${esc(s.value || '')}" style="width:260px">`}
  <button class="btn s o" data-up="${i}">↑</button><button class="btn s o" data-dn="${i}">↓</button><button class="btn s d" data-rm="${i}">✕</button></div></div>`).join('')}</div>
  <div class="row">Add step: ${Object.entries(STEP).map(([k, v]) => `<button class="btn s o" data-add="${k}">${v}</button>`).join('')}</div>
  <div class="row"><select id="tc" style="width:200px">${S.contacts.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('') || '<option value="">(add a contact first)</option>'}</select><button class="btn s" id="runw">Run test</button><button class="btn s o" id="back">Done</button></div>
  <pre class="log" id="wlog"></pre>`; }
  return `<h2>Workflows</h2><div class="row"><button class="btn s" id="newf">+ Add flow</button></div>
  <table><tr><th>Name</th><th>Event</th><th>Steps</th><th>Active</th><th></th></tr>${S.workflows.map(w => `<tr><td>${esc(w.name)}</td><td>${esc(w.event)}</td><td>${w.steps.length}</td><td><input type="checkbox" data-on="${w.id}" ${w.on ? 'checked' : ''} style="width:auto"></td><td><button class="btn s o" data-ed="${w.id}">Edit</button> <button class="btn s d" data-wd="${w.id}">Delete</button></td></tr>`).join('')}</table>`;
};
V.workflows.bind = () => {
  if (!editing) {
    $('#newf').onclick = () => { const w = { id: uid(), name: 'New workflow', event: 'incomingWA', on: false, steps: [] }; S.workflows.push(w); editing = w.id; save(); route(); };
    document.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => { editing = b.dataset.ed; route(); });
    document.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => { S.workflows = S.workflows.filter(w => w.id !== b.dataset.wd); save(); route(); });
    document.querySelectorAll('[data-on]').forEach(b => b.onchange = () => { S.workflows.find(w => w.id === b.dataset.on).on = b.checked; save(); });
    return;
  }
  const w = S.workflows.find(x => x.id === editing); const re = () => { save(); route(); };
  $('#wn').onchange = e => { w.name = e.target.value; save(); }; $('#we').onchange = e => { w.event = e.target.value; save(); }; $('#won').onchange = e => { w.on = e.target.checked; save(); };
  document.querySelectorAll('[data-k]').forEach(i => i.onchange = () => { w.steps[+i.dataset.i][i.dataset.k] = i.value; save(); });
  document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { w.steps.splice(+b.dataset.rm, 1); re(); });
  document.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const i = +b.dataset.up; if (i > 0) { [w.steps[i - 1], w.steps[i]] = [w.steps[i], w.steps[i - 1]]; re(); } });
  document.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => { const i = +b.dataset.dn; if (i < w.steps.length - 1) { [w.steps[i + 1], w.steps[i]] = [w.steps[i], w.steps[i + 1]]; re(); } });
  document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const t = b.dataset.add; w.steps.push(t === 'send' ? { type: t, channel: 'whatsapp', text: 'Hi {{name}}' } : { type: t, value: t === 'wait' ? '1' : '' }); re(); });
  $('#back').onclick = () => { editing = null; route(); };
  $('#runw').onclick = async () => {
    const c = S.contacts.find(x => x.id === $('#tc').value); const log = $('#wlog'); log.textContent = '';
    if (!c) return (log.textContent = 'Add a contact first.');
    await execute(w, c, t => { log.textContent += t + '\n'; }, { test: true });
  };
};
// Workflow engine, shared by "Run test" and live triggers (inbound messages, form submissions).
async function execute(w, c, p, { test = false, inbound = '' } = {}) {
  p(`Trigger: ${w.event} for ${c.name}`);
  for (const [i, s] of w.steps.entries()) {
    if (s.type === 'send') { const r = await deliver(s.channel, s.channel === 'email' ? c.email : c.phone, fill(s.text, c)); p(`${i + 1}. send ${s.channel} -> ${r}: ${fill(s.text, c)}`); }
    else if (s.type === 'label') { c.label = s.value; save(); p(`${i + 1}. label set to ${s.value}`); }
    else if (s.type === 'wait') { const n = test ? Math.min(+s.value || 0, 3) : Math.min(+s.value || 0, 30); await sleep(n * 1000); p(`${i + 1}. waited ${n}s${n < +s.value ? ' (capped)' : ''}`); }
    else if (s.type === 'cond') { if (c.label !== s.value) { p(`${i + 1}. condition failed (label is "${c.label}"), stopping`); return; } p(`${i + 1}. condition passed`); }
    else if (s.type === 'webhook') { try { if (s.value) await fetch(s.value, { method: 'POST', body: JSON.stringify(c) }); p(`${i + 1}. webhook ${s.value ? 'called' : '(no url)'}`); } catch { p(`${i + 1}. webhook failed`); } }
    else if (s.type === 'attr') { const [k, ...v] = String(s.value).split('='); const a = (S.attrs || []).find(x => x.name === k.trim()); if (a) { (c.attrs = c.attrs || {})[a.id] = v.join('=').trim(); save(); p(`${i + 1}. set ${a.name}`); } else p(`${i + 1}. no attribute named "${k}"`); }
    else if (s.type === 'call') { if (test) p(`${i + 1}. call skipped in test (would read: ${fill(s.value, c)})`); else { const r = await post('/api/call', { to: c.phone, text: fill(s.value, c) }).catch(() => ({ status: 'failed' })); p(`${i + 1}. call -> ${r.status}`); } }
    else if (s.type === 'ai') { const r = await agentReply([{ role: 'user', content: inbound || 'Hello' }]); p(`${i + 1}. AI reply: ${r}`); if (!test && c.phone && !/^HANDOFF\b/.test(r)) await deliver('whatsapp', c.phone, r); }
  }
  p('Done.');
}

// Agent: with AGENT_ENDPOINT it calls your backend; otherwise answers from the knowledge base by keyword overlap.
async function agentReply(msgs) {
  const a = S.agent;
  if (window.AGENT_ENDPOINT) {
    try {
      const r = await fetch(window.AGENT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: a.system, knowledge: a.knowledge, messages: msgs }) });
      const j = await r.json().catch(() => ({})); if (r.status === 401) location.replace('login.html');
      if (j.reply) return j.reply; if (j.error) return 'Agent error: ' + j.error; // no reply and no error: fall back to keyword match
    } catch { return 'Agent backend unreachable.'; }
  }
  const q = new Set(msgs[msgs.length - 1].content.toLowerCase().match(/\w{3,}/g) || []);
  let best = '', score = 0; a.knowledge.split('\n').forEach(l => { const s = (l.toLowerCase().match(/\w{3,}/g) || []).filter(w => q.has(w)).length; if (s > score) { score = s; best = l; } });
  return best || "I'm not sure about that. A human agent will follow up.";
}
V.agent = () => `<h2>AI Chat Agent</h2><div class="two"><div>
<p>Name</p><input id="an" value="${esc(S.agent.name)}"><p>System prompt</p><textarea id="as" rows="4">${esc(S.agent.system)}</textarea>
<p>Knowledge base (one fact per line)</p><textarea id="ak" rows="6">${esc(S.agent.knowledge)}</textarea>
<p>Exit phrases (comma separated)</p><input id="ax" value="${esc(S.agent.exit)}"><p><label><input type="checkbox" id="aa" ${S.agent.auto ? 'checked' : ''} style="width:auto"> Auto-reply to inbound messages that match no keyword (needs the AI backend; unanswerable chats go to a human)</label></p><p><button class="btn s" id="asv">Save</button></p>
<p style="color:var(--mut);font-size:13px">${window.AGENT_ENDPOINT ? 'Replies come from the AI provider configured on your server (usage is billed by that provider).' : 'No ANTHROPIC_API_KEY or GEMINI_API_KEY on the server: answers come from the knowledge base by keyword match.'}</p></div>
<div><p>New chat</p><div class="chat" id="chat"></div><form class="row" id="cform"><input id="cin" placeholder="Type a message" style="width:70%"><button class="btn s">Send</button></form></div></div>`;
V.agent.bind = () => {
  $('#asv').onclick = () => { S.agent = { name: $('#an').value, system: $('#as').value, knowledge: $('#ak').value, exit: $('#ax').value, auto: $('#aa').checked }; save(); toast('Saved'); };
  const hist = []; const add = (c, t) => { $('#chat').insertAdjacentHTML('beforeend', `<div class="${c}"><span>${esc(t)}</span></div>`); $('#chat').scrollTop = 1e9; };
  $('#cform').onsubmit = async e => {
    e.preventDefault(); const t = $('#cin').value.trim(); if (!t) return; $('#cin').value = ''; add('u', t); hist.push({ role: 'user', content: t });
    if (S.agent.exit.split(',').some(x => x.trim() && t.toLowerCase().includes(x.trim().toLowerCase()))) return add('a', 'Goodbye! Conversation ended.');
    const r = await agentReply(hist); hist.push({ role: 'assistant', content: r }); add('a', /^HANDOFF\b/.test(r) ? '(would hand off to a human agent)' : r);
  };
};

// ---- Smart Forms (stored on the backend so the public link works) ----
const api = (path, opt) => fetch(path, opt).then(r => { if (r.status === 401) location.replace('login.html'); return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); });
$('#logout')?.addEventListener('click', async () => { await fetch('/api/logout', { method: 'POST' }); location.replace('login.html'); });
fetch('/api/me').then(r => r.json()).then(j => { if (j.user) $('#who').textContent = j.user.email; }).catch(() => { });
const NOBACK = '<p>This needs the backend. Run <code>node server/server.mjs</code> and open the workspace from its address.</p>';
V.forms = () => '<h2>Smart Forms</h2><div id="fbox">Loading…</div>';
V.forms.bind = async () => {
  let d; try { d = await api('/api/forms'); } catch { $('#fbox').innerHTML = NOBACK; return; }
  const origin = location.origin;
  $('#fbox').innerHTML = `<form class="row" id="nf"><input name="title" placeholder="Form title" required style="width:200px"><input name="intro" placeholder="Intro text" style="width:260px">
  <textarea name="fields" rows="3" style="width:300px" placeholder="One field per line: label|type|required&#10;Name|text|required&#10;Phone|tel|required&#10;Email|email">Name|text|required\nPhone|tel|required\nEmail|email</textarea><button class="btn s">Create form</button></form>
  <p style="color:var(--mut);font-size:13px">To embed a form on a page, use: <code>&lt;iframe src="${esc(origin)}/form.html?id=FORM_ID" width="100%" height="420" style="border:0"&gt;&lt;/iframe&gt;</code> (replace FORM_ID with the id in its link).</p>
  <table><tr><th>Form</th><th>Link</th><th>Responses</th><th></th></tr>${d.forms.map(f => `<tr><td>${esc(f.title)}</td><td><a href="/form.html?id=${f.id}" target="_blank">${esc(origin)}/form.html?id=${f.id}</a></td><td>${d.submissions.filter(s => s.form === f.id).length}</td><td><button class="btn s o" data-imp="${f.id}">Import to contacts</button> <button class="btn s d" data-fd="${f.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=4>No forms yet.</td></tr>'}</table>`;
  $('#nf').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    const fields = f.fields.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [label, type, req] = l.split('|'); return { label, name: label.toLowerCase().replace(/\W/g, '_'), type: (type || 'text').trim(), required: /req/i.test(req || '') }; });
    await api('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: f.title.value, intro: f.intro.value, fields }) }); route();
  };
  document.querySelectorAll('[data-fd]').forEach(b => b.onclick = async () => { await api('/api/forms/' + b.dataset.fd, { method: 'DELETE' }); route(); });
  document.querySelectorAll('[data-imp]').forEach(b => b.onclick = () => {
    let n = 0; d.submissions.filter(s => s.form === b.dataset.imp).forEach(s => {
      const v = s.values, name = v.name || v.full_name || '', phone = v.phone || v.mobile || '', email = v.email || '';
      if ((phone || email) && !S.contacts.some(c => (phone && c.phone === phone) || (email && c.email === email))) { S.contacts.push({ id: uid(), name: name || email || phone, phone, email, label: S.labels[0] || '' }); n++; }
    }); save(); toast(n + ' new contacts imported');
  });
};

// ---- Integrations: saved outbound webhooks (Zapier, Make, Slack, Google Apps Script, your own API) ----
V.integrations = () => `<h2>Integrations</h2><p style="color:var(--mut)">Save webhook endpoints and use them in a workflow's "Send webhook" step. Zapier, Make, Slack incoming webhooks and Google Apps Script URLs all work this way. Browsers block reading cross-site responses, so test calls report only that the request was sent.</p>
<form class="row" id="wf"><input name="name" placeholder="Name (e.g. Slack alerts)" required style="width:200px"><input name="url" type="url" placeholder="https://hooks…" required style="width:340px"><button class="btn s">Save</button></form>
<table><tr><th>Name</th><th>URL</th><th></th></tr>${(S.hooks || []).map(h => `<tr><td>${esc(h.name)}</td><td>${esc(h.url)}</td><td><button class="btn s o" data-ht="${h.id}">Test</button> <button class="btn s d" data-hd="${h.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=3>None saved.</td></tr>'}</table>
<h3>Inbound: push contacts in</h3><p style="color:var(--mut);font-size:13px">Set <code>INBOUND_KEY</code> (16+ random characters) in server/.env, then have Shopify, Pabbly, Zapier or Make POST JSON <code>{"name","phone","email"}</code> to <code>${esc(location.origin)}/webhook/contact?key=YOUR_KEY</code>. This needs a public https URL (for example a tunnel). New contacts appear here and start "newContact" workflows while this workspace is open.</p>
<p style="color:var(--mut);font-size:13px">Not built: native connector screens for Shopify, Facebook, HubSpot or Salesforce. Use webhooks through Zapier, Make or Pabbly.</p>`;
V.integrations.bind = () => {
  S.hooks = S.hooks || [];
  $('#wf').onsubmit = e => { e.preventDefault(); const u = e.target.url.value; if (!/^https:\/\//.test(u)) return toast('Use an https URL'); S.hooks.push({ id: uid(), name: e.target.name.value, url: u }); save(); route(); };
  document.querySelectorAll('[data-hd]').forEach(b => b.onclick = () => { S.hooks = S.hooks.filter(h => h.id !== b.dataset.hd); save(); route(); });
  document.querySelectorAll('[data-ht]').forEach(b => b.onclick = async () => { const h = S.hooks.find(x => x.id === b.dataset.ht); try { await fetch(h.url, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ test: true, from: 'workspace' }) }); toast('Test request sent'); } catch { toast('Request failed'); } });
};

// ---- Team Inbox: inbound WhatsApp/SMS captured by the backend webhook ----
let seen = new Set(S.seen || []);
async function pollInbox() {
  let d; try { d = await api('/api/inbox'); } catch { return null; }
  const fresh = d.messages.filter(m => m.dir === 'in' && !seen.has(m.id));
  for (const m of fresh) {
    seen.add(m.id); S.seen = [...seen].slice(-500);
    let c = S.contacts.find(x => x.phone === m.from); if (!c) { c = { id: uid(), name: m.from, phone: m.from, email: '', label: S.labels[0] || '' }; S.contacts.push(c); }
    if (await onInbound(m, c)) continue; // a keyword rule handled it
    for (const w of S.workflows.filter(x => x.on && x.event === (m.channel === 'whatsapp' ? 'incomingWA' : 'newContact'))) await execute(w, c, t => console.log('[wf]', w.name, t), { inbound: m.text });
  }
  if (fresh.length) save(); return d.messages;
}
setInterval(async () => { if (window.SEND_ENDPOINT && await pollInbox() && location.hash === '#inbox') route(); }, 8000);
V.inbox = () => '<h2>Team Inbox</h2><div id="ibox">Loading…</div>';
V.inbox.bind = async () => {
  const msgs = await pollInbox(); if (!msgs) { $('#ibox').innerHTML = NOBACK; return; }
  const threads = {}; msgs.forEach(m => (threads[m.from] = threads[m.from] || []).push(m));
  $('#ibox').innerHTML = Object.keys(threads).map(f => `<div class="card" style="margin-bottom:12px"><h3>${esc(f)} <small>(${esc(threads[f][0].channel)})</small></h3>${threads[f].map(m => `<p style="${m.dir === 'out' ? 'text-align:right;color:var(--pri)' : ''}">${esc(m.text)}</p>`).join('')}
  <form class="row" data-rf="${esc(f)}" data-ch="${esc(threads[f][0].channel)}"><input name="t" placeholder="Reply" required style="width:70%"><button class="btn s">Send</button></form></div>`).join('') || '<p>No messages yet. Point Twilio\'s inbound webhook at <code>/webhook/twilio</code> (needs a public URL).</p>';
  document.querySelectorAll('[data-rf]').forEach(f => f.onsubmit = async e => { e.preventDefault(); const to = f.dataset.rf, ch = f.dataset.ch, text = f.t.value; const r = await deliver(ch, to, text); if (r !== 'failed') await api('/api/inbox/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: ch, to, text }) }); route(); });
};

// ---- WhatsApp Catalog (local product list; sends product text to a label) ----
V.catalog = () => `<h2>WhatsApp Catalog</h2><p style="color:var(--mut)">A local product list. Meta's Commerce catalog and WhatsApp Payments are not connected; "Send" shares a product as a normal message.</p>
<form class="row" id="pf"><input name="name" placeholder="Product" required style="width:170px"><input name="price" placeholder="Price" style="width:90px"><input name="desc" placeholder="Description" style="width:260px"><button class="btn s">Add</button></form>
<div class="grid">${(S.products || []).map(p => `<div class="card"><h3>${esc(p.name)}</h3><p>${esc(p.price)}</p><p>${esc(p.desc)}</p><p class="row"><select data-pl="${p.id}" style="width:120px"><option value="">All</option>${S.labels.map(l => `<option>${esc(l)}</option>`).join('')}</select><button class="btn s" data-ps="${p.id}">Send</button> <button class="btn s d" data-pd="${p.id}">Delete</button></p></div>`).join('') || '<p>No products yet.</p>'}</div>`;
V.catalog.bind = () => {
  S.products = S.products || [];
  $('#pf').onsubmit = e => { e.preventDefault(); S.products.push({ id: uid(), ...Object.fromEntries(new FormData(e.target)) }); save(); route(); };
  document.querySelectorAll('[data-pd]').forEach(b => b.onclick = () => { S.products = S.products.filter(p => p.id !== b.dataset.pd); save(); route(); });
  document.querySelectorAll('[data-ps]').forEach(b => b.onclick = async () => {
    const p = S.products.find(x => x.id === b.dataset.ps), lab = document.querySelector(`[data-pl="${p.id}"]`).value; let n = 0;
    for (const c of S.contacts.filter(c => c.phone && (!lab || c.label === lab))) { await deliver('whatsapp', c.phone, `${p.name} - ${p.price}\n${p.desc}`); n++; } toast(n + ' message(s) ' + (window.SEND_ENDPOINT ? 'sent' : 'simulated'));
  });
};

// ---- Sequences: timed drip messages. The scheduler runs inside the open workspace tab only. ----
const UNIT = { minutes: 1, hours: 60, days: 1440 };
const dueIn = s => (+s.delay || 0) * UNIT[s.unit || 'days'] * 60000;
V.sequences = () => {
  S.sequences = S.sequences || []; S.enrol = S.enrol || [];
  return `<h2>Sequences</h2><p style="color:var(--mut)">Send a series of messages with delays. Steps are sent only while this workspace is open in a browser tab; there is no background scheduler yet.</p>
  <form class="row" id="sf"><input name="name" placeholder="Sequence name" required style="width:200px">
  <textarea name="steps" rows="3" style="width:420px" placeholder="One step per line: delay|unit|channel|message&#10;0|minutes|whatsapp|Hi {{name}}, welcome!&#10;1|days|email|Here is more info">0|minutes|whatsapp|Hi {{name}}, welcome!\n1|days|email|Hi {{name}}, here is more info.</textarea><button class="btn s">Create</button></form>
  <table><tr><th>Sequence</th><th>Steps</th><th>Enrolled</th><th>Enroll contacts</th><th></th></tr>${S.sequences.map(q => `<tr><td>${esc(q.name)}</td><td>${q.steps.length}</td><td>${S.enrol.filter(e => e.seq === q.id).length}</td>
  <td><select data-el="${q.id}" style="width:130px"><option value="">All</option>${S.labels.map(l => `<option>${esc(l)}</option>`).join('')}</select> <button class="btn s" data-en="${q.id}">Enroll</button></td><td><button class="btn s d" data-sd="${q.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=5>No sequences yet.</td></tr>'}</table>
  <h2 style="font-size:18px">Enrollments</h2><table><tr><th>Contact</th><th>Sequence</th><th>Next step</th><th>Due</th></tr>${S.enrol.map(e => { const q = S.sequences.find(x => x.id === e.seq), c = S.contacts.find(x => x.id === e.contact); return `<tr><td>${esc(c?.name || '(deleted)')}</td><td>${esc(q?.name || '(deleted)')}</td><td>${e.done ? 'finished' : e.step + 1}</td><td>${e.done ? '' : new Date(e.due).toLocaleString()}</td></tr>`; }).join('') || '<tr><td colspan=4>None.</td></tr>'}</table>`;
};
V.sequences.bind = () => {
  $('#sf').onsubmit = e => {
    e.preventDefault(); const steps = e.target.steps.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [delay, unit, channel, ...t] = l.split('|'); return { delay: +delay || 0, unit: UNIT[unit] ? unit : 'days', channel: ['whatsapp', 'sms', 'email'].includes(channel) ? channel : 'whatsapp', text: t.join('|') }; });
    if (!steps.length) return toast('Add at least one step'); S.sequences.push({ id: uid(), name: e.target.name.value, steps }); save(); route();
  };
  document.querySelectorAll('[data-sd]').forEach(b => b.onclick = () => { S.sequences = S.sequences.filter(q => q.id !== b.dataset.sd); S.enrol = S.enrol.filter(x => x.seq !== b.dataset.sd); save(); route(); });
  document.querySelectorAll('[data-en]').forEach(b => b.onclick = () => {
    const q = S.sequences.find(x => x.id === b.dataset.en), lab = document.querySelector(`[data-el="${q.id}"]`).value; let n = 0;
    S.contacts.filter(c => !lab || c.label === lab).forEach(c => { if (!S.enrol.some(e => e.seq === q.id && e.contact === c.id)) { S.enrol.push({ id: uid(), seq: q.id, contact: c.id, step: 0, due: Date.now() + dueIn(q.steps[0]), done: false }); n++; } });
    save(); toast(n + ' enrolled'); tickSequences().then(route);
  });
};
let ticking = false;
async function tickSequences() {
  if (ticking) return; ticking = true;
  try {
    for (const e of (S.enrol || []).filter(x => !x.done && x.due <= Date.now())) {
      const q = S.sequences.find(x => x.id === e.seq), c = S.contacts.find(x => x.id === e.contact);
      if (!q || !c) { e.done = true; continue; }
      const s = q.steps[e.step]; const dest = s.channel === 'email' ? c.email : c.phone;
      if (dest) await deliver(s.channel, dest, fill(s.text, c));
      e.step++; if (e.step >= q.steps.length) e.done = true; else e.due = Date.now() + dueIn(q.steps[e.step]);
    }
    save();
  } finally { ticking = false; }
}
setInterval(() => tickSequences().then(() => { if (location.hash === '#sequences') route(); }), 10000);

// ---- QR code + chat button ----
V.qr = () => `<h2>QR Code &amp; Chat Button</h2><div class="two"><div>
<p>WhatsApp number (with country code, digits only)</p><input id="qp" placeholder="919876543210"><p>Pre-filled message</p><input id="qt" value="Hi, I'd like to know more"><p>Button label</p><input id="ql" value="Chat with us">
<p><button class="btn s" id="qg">Generate</button></p></div><div id="qout"></div></div>`;
V.qr.bind = () => {
  const load = () => window.qrcode ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; s.onload = ok; s.onerror = no; document.head.append(s); });
  $('#qg').onclick = async () => {
    const ph = $('#qp').value.replace(/\D/g, ''); if (ph.length < 8) return toast('Enter a valid number');
    const link = `https://wa.me/${ph}?text=${encodeURIComponent($('#qt').value)}`;
    let qr = ''; try { await load(); const q = qrcode(0, 'M'); q.addData(link); q.make(); qr = q.createSvgTag(5, 4); } catch { qr = '<p>Could not load the QR library (offline?).</p>'; }
    const snip = `<script src="${location.origin}/chat-widget.js" data-phone="${ph}" data-text="${esc($('#qt').value)}" data-label="${esc($('#ql').value)}" async><\/script>`;
    $('#qout').innerHTML = `<div class="card"><div style="background:#fff;display:inline-block;padding:6px">${qr}</div><p><a href="${esc(link)}" target="_blank" rel="noopener">${esc(link)}</a></p>
    <p>Embed the floating chat button on any site:</p><textarea rows="3" readonly onclick="this.select()">${esc(snip)}</textarea></div>`;
  };
};

// ---- Payment links (Razorpay) and voice calls (Twilio) ----
const post = (path, body) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async r => ({ ok: r.ok, ...(await r.json().catch(() => ({}))) }));
const contactOptions = () => S.contacts.map(c => `<option value="${c.id}">${esc(c.name)} ${esc(c.phone)}</option>`).join('') || '<option value="">(add a contact first)</option>';
V.payments = () => `<h2>Payment Links</h2><p style="color:var(--mut)">Creates a Razorpay payment link (INR) and can send it on WhatsApp. This is a link, not WhatsApp Pay inside the chat. Needs Razorpay keys in server/.env.</p>
<form class="row" id="pay"><select name="c" style="width:200px">${contactOptions()}</select><input name="amount" type="number" min="1" step="0.01" placeholder="Amount (INR)" required style="width:130px"><input name="d" placeholder="Description" required style="width:220px"><button class="btn s">Create link</button></form><div id="pout"></div>`;
V.payments.bind = () => $('#pay').onsubmit = async e => {
  e.preventDefault(); const f = e.target, c = S.contacts.find(x => x.id === f.c.value); if (!c) return toast('Pick a contact');
  const r = await post('/api/payment-link', { amount: f.amount.value, description: f.d.value, name: c.name, phone: c.phone }).catch(() => ({ status: 'failed', error: 'backend not running' }));
  (S.pays = S.pays || []).push({ at: Date.now(), name: c.name, amount: +f.amount.value, desc: f.d.value, status: r.status, url: r.url || '' }); save();
  if (r.status === 'created') { const m = `Hi ${c.name}, please pay ₹${f.amount.value} for ${f.d.value}: ${r.url}`; const s = await deliver('whatsapp', c.phone, m); $('#pout').innerHTML = `<p>Link: <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.url)}</a> (WhatsApp: ${esc(s)})</p>`; }
  else $('#pout').innerHTML = `<p>${esc(r.status)}: ${esc(r.error || r.note || '')}</p>`;
};
V.voice = () => `<h2>Voice Calls</h2><p style="color:var(--mut)">Places an outbound call that reads your script aloud (text-to-speech). It is not a two-way conversational voice AI. Needs Twilio credentials and a voice-capable number. Calls cost money and phone numbers must be E.164.</p>
<form class="row" id="vc"><select name="c" style="width:220px">${contactOptions()}</select><input name="t" placeholder="Script (max 500 chars)" required maxlength="500" style="width:420px"><button class="btn s">Call</button></form><div id="vout"></div>`;
V.voice.bind = () => $('#vc').onsubmit = async e => {
  e.preventDefault(); const c = S.contacts.find(x => x.id === e.target.c.value); if (!c) return toast('Pick a contact');
  if (!confirm(`Place a call to ${c.name} (${c.phone})?`)) return;
  const r = await post('/api/call', { to: c.phone, text: e.target.t.value }).catch(() => ({ status: 'failed', error: 'backend not running' })); $('#vout').innerHTML = `<p>${esc(r.status)}: ${esc(r.error || r.note || r.sid || '')}</p>`;
};

// Leads pushed by /webhook/contact (Shopify, Pabbly, Zapier...) become contacts and fire "newContact" workflows.
async function pullLeads() {
  let d; try { d = await api('/api/leads'); } catch { return; } if (!d.leads.length) return;
  for (const l of d.leads) {
    let c = S.contacts.find(x => (l.phone && x.phone === l.phone) || (l.email && x.email === l.email));
    if (!c) { c = { id: uid(), name: l.name || l.email || l.phone, phone: l.phone, email: l.email, label: S.labels[0] || '' }; S.contacts.push(c); for (const w of S.workflows.filter(x => x.on && x.event === 'newContact')) await execute(w, c, t => console.log('[wf]', w.name, t)); if (typeof runFlowsEvent === 'function') { await runFlowsEvent('t_webhook', c); await runFlowsEvent('t_contact', c); } if (typeof fireHooks === 'function') fireHooks('contact.created', { name: c.name, phone: c.phone, email: c.email }); }
  }
  save(); await api('/api/leads/ack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: d.leads.map(l => l.id) }) });
}
setInterval(() => { if (window.SEND_ENDPOINT || location.port) pullLeads(); }, 10000);

// ===== Features from the Platform Features guides (these supersede the earlier simple Contacts view) =====
const ATTR_TYPES = ['Textfield', 'Paragraph', 'Date', 'Time', 'Timestamp', 'Dropdown', 'Number', 'Phone', 'Email', 'Website', 'Link', 'Currency'];
const DEFAULTS = [['name', 'Name'], ['phone', 'Phone'], ['email', 'Email'], ['label', 'Label']];
const attrs = () => (S.attrs = S.attrs || []);
const getVal = (c, k) => DEFAULTS.some(d => d[0] === k) ? (c[k] || '') : ((c.attrs || {})[k] || '');
const csvParse = t => { const rows = []; let r = [], f = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; } else if (ch === '"') q = true; else if (ch === ',') { r.push(f); f = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; r.push(f); f = ''; if (r.some(x => x.trim())) rows.push(r); r = []; } else f += ch; } r.push(f); if (r.some(x => x.trim())) rows.push(r); return rows; };

V.attributes = () => `<h2>Contact Attributes</h2><p style="color:var(--mut)">Default attributes (name, phone, email, label) are built in. Create up to 50 of your own. Types: ${ATTR_TYPES.join(', ')}.</p>
<form class="row" id="af"><input name="name" placeholder="Attribute name" required maxlength="40" style="width:200px"><select name="type" style="width:140px">${ATTR_TYPES.map(t => `<option>${t}</option>`).join('')}</select><input name="opts" placeholder="Dropdown options, comma separated" style="width:260px"><button class="btn s">Create attribute</button></form>
<table><tr><th>Name</th><th>Type</th><th>Kind</th><th></th></tr>${DEFAULTS.map(d => `<tr><td>${d[1]}</td><td>—</td><td>Default</td><td></td></tr>`).join('')}${attrs().map(a => `<tr><td>${esc(a.name)}</td><td>${esc(a.type)}${a.opts ? ' (' + esc(a.opts) + ')' : ''}</td><td>Secondary</td><td><button class="btn s d" data-ad="${a.id}">Delete</button></td></tr>`).join('')}</table>`;
V.attributes.bind = () => {
  $('#af').onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); if (attrs().length >= 50) return toast('Limit is 50 attributes'); if (attrs().some(a => a.name.toLowerCase() === d.name.trim().toLowerCase())) return toast('Name already used'); attrs().push({ id: uid(), name: d.name.trim(), type: d.type, opts: d.type === 'Dropdown' ? d.opts : '' }); save(); route(); };
  document.querySelectorAll('[data-ad]').forEach(b => b.onclick = () => { S.attrs = attrs().filter(a => a.id !== b.dataset.ad); save(); route(); });
};

const OPS = { eq: 'is equal to', ne: 'is not equal to', has: 'contains', nhas: 'does not contain', empty: 'is empty', nempty: 'is not empty' };
const testOp = (op, val, v) => { val = String(val).toLowerCase(); v = String(v).toLowerCase(); return { eq: val === v, ne: val !== v, has: val.includes(v), nhas: !val.includes(v), empty: val === '', nempty: val !== '' }[op]; };
let filt = { mode: 'AND', rows: [], q: '' };
const allKeys = () => [...DEFAULTS.map(d => [d[0], d[1]]), ...attrs().map(a => [a.id, a.name])];
V.contacts = () => {
  const keys = allKeys(); const rows = filt.rows.filter(r => r.k);
  const list = S.contacts.filter(c => {
    if (filt.q && !JSON.stringify(c).toLowerCase().includes(filt.q.toLowerCase())) return false;
    if (!rows.length) return true; const res = rows.map(r => testOp(r.op, getVal(c, r.k), r.v || '')); return filt.mode === 'AND' ? res.every(Boolean) : res.some(Boolean);
  });
  return `<h2>Contacts <small style="color:var(--mut)">(${list.length}/${S.contacts.length})</small></h2>
  <div class="row"><input id="cq" placeholder="Search" value="${esc(filt.q)}" style="width:200px"><select id="fm" style="width:90px"><option ${filt.mode === 'AND' ? 'selected' : ''}>AND</option><option ${filt.mode === 'OR' ? 'selected' : ''}>OR</option></select><button class="btn s o" id="fadd">+ Filter (max 5)</button></div>
  ${filt.rows.map((r, i) => `<div class="row"><select data-fk="${i}" style="width:150px">${keys.map(k => `<option value="${k[0]}" ${k[0] === r.k ? 'selected' : ''}>${esc(k[1])}</option>`).join('')}</select><select data-fo="${i}" style="width:170px">${Object.entries(OPS).map(([k, v]) => `<option value="${k}" ${k === r.op ? 'selected' : ''}>${v}</option>`).join('')}</select><input data-fv="${i}" value="${esc(r.v)}" placeholder="value" style="width:160px"><button class="btn s d" data-fr="${i}">✕</button></div>`).join('')}
  <form class="row" id="cf"><input name="name" placeholder="Name" required style="width:140px"><input name="phone" placeholder="Phone +91…" style="width:140px"><input name="email" type="email" placeholder="Email" style="width:170px"><select name="label" style="width:120px">${S.labels.map(l => `<option>${esc(l)}</option>`).join('')}</select><button class="btn s">Add contact</button></form>
  <details><summary>Upload CSV and map columns</summary><div class="row"><input type="file" id="csv" accept=".csv" style="width:auto"></div><div id="map"></div></details>
  <table><tr>${keys.map(k => `<th>${esc(k[1])}</th>`).join('')}<th></th></tr>${list.map(c => `<tr>${keys.map(k => `<td>${esc(getVal(c, k[0]))}</td>`).join('')}<td><button class="btn s d" data-del="${c.id}">Delete</button></td></tr>`).join('') || `<tr><td colspan="${keys.length + 1}">No contacts.</td></tr>`}</table>`;
};
V.contacts.bind = () => {
  $('#cq').oninput = e => { filt.q = e.target.value; const p = e.target.selectionStart; route(); const n = $('#cq'); n.focus(); n.setSelectionRange(p, p); };
  $('#fm').onchange = e => { filt.mode = e.target.value; route(); };
  $('#fadd').onclick = () => { if (filt.rows.length >= 5) return toast('Up to 5 filters'); filt.rows.push({ k: 'name', op: 'has', v: '' }); route(); };
  document.querySelectorAll('[data-fk]').forEach(s => s.onchange = () => { filt.rows[+s.dataset.fk].k = s.value; route(); });
  document.querySelectorAll('[data-fo]').forEach(s => s.onchange = () => { filt.rows[+s.dataset.fo].op = s.value; route(); });
  document.querySelectorAll('[data-fv]').forEach(s => s.onchange = () => { filt.rows[+s.dataset.fv].v = s.value; route(); });
  document.querySelectorAll('[data-fr]').forEach(b => b.onclick = () => { filt.rows.splice(+b.dataset.fr, 1); route(); });
  $('#cf').onsubmit = e => { e.preventDefault(); S.contacts.push({ id: uid(), ...Object.fromEntries(new FormData(e.target)) }); save(); route(); };
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.contacts = S.contacts.filter(c => c.id !== b.dataset.del); save(); route(); });
  $('#csv').onchange = async e => {
    const rows = csvParse(await e.target.files[0].text()); if (rows.length < 2) return toast('CSV needs a header and at least one row');
    const head = rows[0].map(h => h.trim()), keys = allKeys();
    $('#map').innerHTML = `<p>Map each column to an attribute (unmapped columns are skipped):</p>${head.map((h, i) => { const g = keys.find(k => k[1].toLowerCase() === h.toLowerCase()); return `<div class="row"><span style="width:160px">${esc(h)}</span><select data-m="${i}" style="width:170px"><option value="">(skip)</option>${keys.filter(k => k[0] !== 'label').map(k => `<option value="${k[0]}" ${g && g[0] === k[0] ? 'selected' : ''}>${esc(k[1])}</option>`).join('')}</select></div>`; }).join('')}
    <div class="row"><select id="ml" style="width:170px">${S.labels.map(l => `<option>${esc(l)}</option>`).join('')}<option value="__new">+ New label…</option></select><input id="mln" placeholder="New label name" style="width:160px"><button class="btn s" id="mgo">Import ${rows.length - 1} rows</button></div>`;
    $('#mgo').onclick = () => {
      let label = $('#ml').value; if (label === '__new') { label = $('#mln').value.trim(); if (!label) return toast('Enter a label name'); if (!S.labels.includes(label)) S.labels.push(label); }
      const map = [...document.querySelectorAll('[data-m]')].map(s => s.value); let n = 0, skip = 0;
      rows.slice(1).forEach(r => { const c = { id: uid(), name: '', phone: '', email: '', label, attrs: {} }; map.forEach((k, i) => { if (!k) return; const v = (r[i] || '').trim(); if (DEFAULTS.some(d => d[0] === k)) c[k] = v; else c.attrs[k] = v; });
        if (!c.name && !c.phone && !c.email) { skip++; return; } if (!c.name) c.name = c.email || c.phone; S.contacts.push(c); n++; });
      save(); toast(`${n} imported${skip ? ', ' + skip + ' skipped' : ''}`); route();
    };
  };
};

// ---- Keywords ----
const tokens = s => (String(s).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
function kwMatch(k, text) {
  return k.words.some(w => k.match === 'exact' ? text === w : (() => { const a = text.toLowerCase(), b = w.toLowerCase(); if (a.includes(b) || b.includes(a)) return true; const tb = new Set(tokens(w)); return tokens(text).some(t => tb.has(t)); })());
}
const meta = f => ((S.meta = S.meta || {})[f] = S.meta[f] || {});
async function reply(m, text, bot = true) { const r = await deliver(m.channel === 'sms' ? 'sms' : 'whatsapp', m.from, text); if (window.SEND_ENDPOINT) await api('/api/inbox/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: m.channel, to: m.from, text, bot }) }).catch(() => { }); return r; }
async function onInbound(m, c) {
  meta(m.from).lastIn = m.at; meta(m.from).resolved = false; meta(m.from).abandonedSent = false;
  if (typeof onInboundExtras === 'function') onInboundExtras(m, c); // notifications, outbound webhooks (modules.js)
  if (typeof runFlowsFor === 'function' && await runFlowsFor(m, c)) return true; // visual flows (modules.js)
  const k = (S.keywords || []).find(x => kwMatch(x, m.text));
  if (!k) { // no keyword rule: let the AI agent answer if auto-reply is on, or hand off to a human
    if (!S.agent.auto || !window.AGENT_ENDPOINT) return false;
    const history = [...(S.hist = S.hist || {})[m.from] || [], { role: 'user', content: m.text }].slice(-12);
    const out = await agentReply(history); const handoff = /^HANDOFF\b/.test(out) || /^Agent (error|backend)/.test(out);
    if (handoff) { meta(m.from).bot = false; save(); return true; }
    S.hist[m.from] = [...history, { role: 'assistant', content: out }].slice(-12); meta(m.from).bot = true; await reply(m, out); save(); return true;
  }
  const a = k.action; meta(m.from).bot = true;
  if (a.type === 'message') await reply(m, fill(a.text, c));
  else if (a.type === 'template') { const t = S.templates.find(x => x.id === a.tpl); if (t) await reply(m, fill(t.body, c)); }
  else if (a.type === 'assign') { meta(m.from).assignee = a.agent; meta(m.from).bot = false; }
  else if (a.type === 'workflow') { const w = S.workflows.find(x => x.id === a.wf); if (w) await execute(w, c, t => console.log('[kw wf]', t), { inbound: m.text }); }
  save(); return true;
}
V.keywords = () => { S.keywords = S.keywords || []; return `<h2>Keywords</h2><p style="color:var(--mut)">A keyword runs an action when a customer's reply matches. Exact match is case-sensitive. Approximate match triggers when the reply contains the keyword, is contained in it, or shares a word with it. They run while this workspace is open and the backend receives inbound messages.</p>
<form class="row" id="kf"><input name="words" placeholder="Keywords, comma separated" required style="width:240px"><select name="match" style="width:130px"><option value="exact">Exact match</option><option value="approx">Approximate</option></select>
<select name="type" id="kt" style="width:160px"><option value="message">Send message</option><option value="template">Send template</option><option value="assign">Assign to agent</option><option value="workflow">Trigger workflow</option></select>
<input name="text" placeholder="Reply text" style="width:240px"><select name="tpl" style="width:150px">${S.templates.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><input name="agent" placeholder="Agent email" style="width:170px"><select name="wf" style="width:160px">${S.workflows.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('')}</select><button class="btn s">Save keyword</button></form>
<table><tr><th>Keywords</th><th>Match</th><th>Action</th><th></th></tr>${S.keywords.map(k => `<tr><td>${esc(k.words.join(', '))}</td><td>${k.match}</td><td>${esc(k.action.type)}${k.action.text ? ': ' + esc(k.action.text) : ''}${k.action.agent ? ': ' + esc(k.action.agent) : ''}</td><td><button class="btn s d" data-kd="${k.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=4>No keywords yet.</td></tr>'}</table>
<h3>Test a message</h3><form class="row" id="kt2"><input name="t" placeholder="Type a customer reply" style="width:300px"><button class="btn s o">Test</button><span id="kres"></span></form>`; };
V.keywords.bind = () => {
  $('#kf').onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); const words = d.words.split(',').map(x => x.trim()).filter(Boolean); if (!words.length) return;
    S.keywords.push({ id: uid(), words, match: d.match, action: { type: d.type, text: d.text, tpl: d.tpl, agent: d.agent.trim().toLowerCase(), wf: d.wf } }); save(); route(); };
  document.querySelectorAll('[data-kd]').forEach(b => b.onclick = () => { S.keywords = S.keywords.filter(k => k.id !== b.dataset.kd); save(); route(); });
  $('#kt2').onsubmit = e => { e.preventDefault(); const k = S.keywords.find(x => kwMatch(x, e.target.t.value)); $('#kres').textContent = k ? ' matches: ' + k.words.join(', ') + ' -> ' + k.action.type : ' no match'; };
};

// ---- Canned responses, team, chat preferences ----
V.canned = () => { S.canned = S.canned || []; return `<h2>Canned Responses</h2><p style="color:var(--mut)">In Team Inbox, type "/" in the reply box to see shortcuts, or type a full shortcut and press Send to expand it.</p>
<form class="row" id="nf2"><input name="short" placeholder="Shortcut (e.g. hours)" required pattern="[a-z0-9_-]+" style="width:160px"><select name="kind" style="width:130px"><option value="quick">Quick reply</option><option value="template">Template</option></select><input name="text" placeholder="Message text" style="width:300px"><select name="tpl" style="width:170px">${S.templates.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><button class="btn s">Add</button></form>
<table><tr><th>Shortcut</th><th>Type</th><th>Content</th><th></th></tr>${S.canned.map(c => `<tr><td>/${esc(c.short)}</td><td>${c.kind}</td><td>${esc(c.kind === 'quick' ? c.text : (S.templates.find(t => t.id === c.tpl) || {}).body || '')}</td><td><button class="btn s d" data-cd="${c.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=4>None.</td></tr>'}</table>`; };
V.canned.bind = () => {
  $('#nf2').onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); if (S.canned.some(c => c.short === d.short)) return toast('Shortcut exists'); S.canned.push({ id: uid(), ...d }); save(); route(); };
  document.querySelectorAll('[data-cd]').forEach(b => b.onclick = () => { S.canned = S.canned.filter(c => c.id !== b.dataset.cd); save(); route(); });
};
V.team = () => `<h2>Team &amp; Chat Settings</h2><div id="tbox">Loading…</div>`;
V.team.bind = async () => {
  S.chat = S.chat || { frt: 5 }; let u; try { u = (await api('/api/users')).users; } catch { $('#tbox').innerHTML = NOBACK; return; }
  const me = await api('/api/me').catch(() => ({}));
  $('#tbox').innerHTML = `<h3>Chat preferences</h3><form class="row" id="pf2"><label>First response time (minutes): <input name="frt" type="number" min="1" max="1440" value="${S.chat.frt}" style="width:90px"></label><button class="btn s">Save</button></form>
  <p style="color:var(--mut);font-size:13px">Chats with no reply after this time are marked PENDING and "FRT exceeded" in the Team Inbox.</p>
  <h3>Agents</h3><table><tr><th>Email</th><th>Role</th><th></th></tr>${u.map(x => `<tr><td>${esc(x.email)}</td><td>${x.role}</td><td>${me.user?.role === 'owner' && x.role !== 'owner' ? `<button class="btn s d" data-ud="${x.id}">Remove</button>` : ''}</td></tr>`).join('')}</table>
  ${me.user?.role === 'owner' ? `<h3>Invite an agent</h3><form class="row" id="uf"><input name="email" type="email" placeholder="Agent email" required style="width:220px"><input name="password" type="password" minlength="10" placeholder="Temporary password (10+ chars)" required style="width:240px" autocomplete="new-password"><button class="btn s">Create agent</button></form><p style="color:var(--mut);font-size:13px">Share the password with the agent over a private channel; there is no email invite or password reset yet.</p>` : '<p style="color:var(--mut)">Only the owner can invite agents.</p>'}`;
  $('#pf2').onsubmit = e => { e.preventDefault(); S.chat.frt = Math.max(1, +e.target.frt.value || 5); save(); toast('Saved'); };
  $('#uf')?.addEventListener('submit', async e => { e.preventDefault(); const r = await post('/api/users', Object.fromEntries(new FormData(e.target))); if (!r.ok) return toast(r.error || 'Failed'); route(); });
  document.querySelectorAll('[data-ud]').forEach(b => b.onclick = async () => { await api('/api/users/' + b.dataset.ud, { method: 'DELETE' }); route(); });
};

// ---- Team Inbox with chat statuses (supersedes the earlier simple inbox) ----
const WINDOW = 24 * 3600e3;
function chatStatus(f, msgs) {
  const mt = meta(f), frt = (S.chat?.frt || 5) * 60e3, ins = msgs.filter(m => m.dir === 'in'), lastIn = ins.length ? new Date(ins[ins.length - 1].at).getTime() : 0;
  const humanOut = msgs.some(m => m.dir === 'out' && !m.bot), botOut = msgs.some(m => m.dir === 'out' && m.bot);
  const lastMsg = msgs[msgs.length - 1], awaiting = lastMsg && lastMsg.dir === 'in', overdue = awaiting && Date.now() - new Date(lastMsg.at).getTime() > frt;
  const s = new Set();
  if (mt.resolved) s.add('RESOLVED'); else if (mt.bot && !humanOut) s.add('CHATBOT'); else if (mt.bot && humanOut) s.add('INTERVENED'); else if (overdue) s.add('PENDING'); else s.add('OPEN');
  s.add(Date.now() - lastIn < WINDOW ? 'ACTIVE' : 'EXPIRED'); if (overdue && !mt.resolved) { s.add('FRT EXCEEDED'); s.add('PENDING'); s.delete('OPEN'); }
  if (!mt.assignee) s.add('UNASSIGNED'); return s;
}
let inboxFilter = 'ALL', mine = '';
V.inbox = () => '<h2>Team Inbox</h2><div id="ibox">Loading…</div>';
V.inbox.bind = async () => {
  S.canned = S.canned || []; const msgs = await pollInbox(); if (!msgs) { $('#ibox').innerHTML = NOBACK; return; }
  if (!mine) mine = (await api('/api/me').catch(() => ({ user: {} }))).user?.email || '';
  const users = await api('/api/users').then(r => r.users).catch(() => []);
  const threads = {}; msgs.forEach(m => (threads[m.from] = threads[m.from] || []).push(m));
  const cats = ['ALL', 'OPEN', 'PENDING', 'RESOLVED', 'CHATBOT', 'INTERVENED', 'ACTIVE', 'EXPIRED', 'FRT EXCEEDED', 'UNASSIGNED', 'MINE'];
  const shown = Object.keys(threads).filter(f => { const st = chatStatus(f, threads[f]); return inboxFilter === 'ALL' || (inboxFilter === 'MINE' ? meta(f).assignee === mine : st.has(inboxFilter)); });
  $('#ibox').innerHTML = `<div class="row">${cats.map(c => `<button class="btn s ${c === inboxFilter ? '' : 'o'}" data-cat="${c}">${c}</button>`).join('')}</div>
  <form class="row" id="nc"><input name="to" placeholder="New conversation: phone with country code" required style="width:260px"><select name="tpl" style="width:200px">${S.templates.filter(t => t.channel === 'whatsapp').map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><button class="btn s">Send template</button></form>
  <datalist id="cl">${S.canned.map(c => `<option value="/${esc(c.short)}">`).join('')}</datalist>
  ${shown.map(f => { const st = chatStatus(f, threads[f]), mt = meta(f), exp = st.has('EXPIRED'); return `<div class="card" style="margin-bottom:12px"><h3>${esc(f)} <small>(${esc(threads[f][0].channel)})</small> ${[...st].map(x => `<span class="pill">${x}${x === 'FRT EXCEEDED' ? ' 🔴' : ''}</span>`).join(' ')}</h3>
  ${threads[f].map(m => `<p style="${m.dir === 'out' ? 'text-align:right;color:var(--pri)' : ''}">${esc(m.text)}${m.bot ? ' <small>(bot)</small>' : ''}</p>`).join('')}
  <div class="row"><select data-as="${esc(f)}" style="width:200px"><option value="">Unassigned</option>${users.map(u => `<option ${mt.assignee === u.email ? 'selected' : ''}>${esc(u.email)}</option>`).join('')}</select><button class="btn s o" data-rs="${esc(f)}">${mt.resolved ? 'Reopen' : 'Resolve'}</button></div>
  ${exp ? `<p style="color:var(--mut);font-size:13px">The 24-hour window has expired: send a template to reopen it.</p><form class="row" data-tf="${esc(f)}"><select name="tpl" style="width:220px">${S.templates.filter(t => t.channel === 'whatsapp').map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><button class="btn s">Send template</button></form>`
    : `<form class="row" data-rf="${esc(f)}" data-ch="${esc(threads[f][0].channel)}"><input name="t" list="cl" placeholder='Reply (type "/" for canned responses)' required style="width:70%" autocomplete="off"><button class="btn s">Send</button></form>`}</div>`; }).join('') || '<p>No chats in this view. Point Twilio\'s inbound webhook at <code>/webhook/twilio</code> (needs a public URL).</p>'}`;
  document.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { inboxFilter = b.dataset.cat; route(); });
  const logOut = (ch, to, text, bot) => api('/api/inbox/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: ch, to, text, bot }) });
  $('#nc').onsubmit = async e => { e.preventDefault(); const t = S.templates.find(x => x.id === e.target.tpl.value), to = e.target.to.value.trim(); if (!t) return; const c = S.contacts.find(x => x.phone === to) || { name: '' }; const r = await deliver('whatsapp', to, fill(t.body, c)); if (r !== 'failed') await logOut('whatsapp', to, fill(t.body, c), false); route(); };
  document.querySelectorAll('[data-tf]').forEach(f => f.onsubmit = async e => { e.preventDefault(); const to = f.dataset.tf, t = S.templates.find(x => x.id === f.tpl.value), c = S.contacts.find(x => x.phone === to) || { name: '' }; const r = await deliver('whatsapp', to, fill(t.body, c)); if (r !== 'failed') await logOut('whatsapp', to, fill(t.body, c), false); route(); });
  document.querySelectorAll('[data-rf]').forEach(f => f.onsubmit = async e => {
    e.preventDefault(); const to = f.dataset.rf, ch = f.dataset.ch; let text = f.t.value.trim(); const c = S.canned.find(x => '/' + x.short === text);
    if (c) text = c.kind === 'quick' ? c.text : ((S.templates.find(t => t.id === c.tpl) || {}).body || text);
    const ct = S.contacts.find(x => x.phone === to) || { name: '' }; text = fill(text, ct); const r = await deliver(ch, to, text); if (r !== 'failed') { await logOut(ch, to, text, false); } route();
  });
  document.querySelectorAll('[data-as]').forEach(s => s.onchange = () => { meta(s.dataset.as).assignee = s.value; save(); route(); });
  document.querySelectorAll('[data-rs]').forEach(b => b.onclick = () => { const m = meta(b.dataset.rs); m.resolved = !m.resolved; save(); route(); });
};

function route() {
  const id = (location.hash || '#dash').slice(1); const v = V[id] ? id : 'dash';
  if (v !== 'workflows') editing = null;
  $('#menu').innerHTML = MENU.map(([g, items]) => `<h6>${g}</h6>` + items.map(([k, n]) => `<a href="#${k}" class="${k === v ? 'on' : ''}">${n}</a>`).join('')).join('');
  $('#crumb').textContent = (MENU.flatMap(m => m[1]).find(x => x[0] === v) || [v, v])[1]; // routes not in the menu fall back to their id
  $('#cfg').textContent = window.SEND_ENDPOINT ? 'Live delivery' : 'Simulated delivery';
  $('#view').innerHTML = V[v](); V[v].bind?.(); $('#side').classList.remove('open');
}
$('#burger').onclick = () => $('#side').classList.toggle('open');
addEventListener('hashchange', route); route();
