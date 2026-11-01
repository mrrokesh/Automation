// Part 2 of the screens from the screenshot inventory: email tools, voice, account pages,
// integration discovery and inbox channels. Loaded after modules.js.

const fillHtml = (html, c) => String(html).replace(/\{\{\s*name\s*\}\}/g, esc(c.name || '')).replace(/\{\{\s*email\s*\}\}/g, esc(c.email || ''));
const httpsOnly = u => /^https:\/\//i.test(u || '') ? u : '#';

// ---------- email design library ----------
S.designs = S.designs || []; S.senders = S.senders || [];
const BLOCKS = { heading: 'Heading', text: 'Paragraph', button: 'Button', image: 'Image (https URL)', divider: 'Divider' };
function designHtml(blocks) {
  const row = b => ({
    heading: `<h1 style="margin:0 0 12px;font-size:26px;color:#14171f">${esc(b.text)}</h1>`,
    text: `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#333">${esc(b.text).replace(/\n/g, '<br>')}</p>`,
    button: `<p style="margin:0 0 16px"><a href="${esc(httpsOnly(b.url))}" style="background:#5b3df5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:6px;display:inline-block;font-weight:bold">${esc(b.text)}</a></p>`,
    image: `<p style="margin:0 0 16px"><img src="${esc(httpsOnly(b.url))}" alt="${esc(b.text)}" style="max-width:100%;border-radius:6px"></p>`,
    divider: '<hr style="border:0;border-top:1px solid #e3e6ee;margin:16px 0">',
  }[b.type] || '');
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;font-family:Arial,sans-serif;padding:28px;max-width:100%"><tr><td>${blocks.map(row).join('')}</td></tr></table></td></tr></table></body></html>`;
}
const STARTER_DESIGNS = [
  { name: 'Welcome email', subject: 'Welcome, {{name}}!', blocks: [{ type: 'heading', text: 'Welcome, {{name}}!' }, { type: 'text', text: 'Thanks for joining us. Here is how to get started.' }, { type: 'button', text: 'Get started', url: 'https://example.com' }] },
  { name: 'Offer announcement', subject: 'A little something for you, {{name}}', blocks: [{ type: 'heading', text: 'Our biggest offer' }, { type: 'text', text: 'Hi {{name}}, enjoy a special discount this week only.' }, { type: 'button', text: 'Claim offer', url: 'https://example.com/offer' }, { type: 'divider' }, { type: 'text', text: 'You are receiving this because you opted in.' }] },
];
let designEdit = null, designTab = 'mine';
V.design = () => {
  if (designEdit) { const d = S.designs.find(x => x.id === designEdit); return `<div class="row"><button class="btn s o" id="dback">← Back</button><input id="dn" value="${esc(d.name)}" style="width:220px"><input id="ds" value="${esc(d.subject)}" placeholder="Subject" style="width:260px"><button class="btn s" id="dsave">Save</button></div>
  <div class="two"><div>${d.blocks.map((b, i) => `<div class="card" style="margin-bottom:8px"><b>${BLOCKS[b.type]}</b> <button class="btn s o" data-up="${i}">↑</button><button class="btn s o" data-dn="${i}">↓</button><button class="btn s d" data-rm="${i}">✕</button>
  ${b.type !== 'divider' ? `<input data-bi="${i}" data-bk="text" value="${esc(b.text)}" placeholder="${b.type === 'image' ? 'Alt text' : 'Text'}">` : ''}${b.type === 'button' || b.type === 'image' ? `<input data-bi="${i}" data-bk="url" value="${esc(b.url || '')}" placeholder="https://…">` : ''}</div>`).join('')}
  <div class="row">${Object.entries(BLOCKS).map(([k, v]) => `<button class="btn s o" data-addb="${k}">+ ${v}</button>`).join('')}</div></div>
  <div><p>Preview</p><iframe sandbox style="width:100%;height:480px;border:1px solid var(--bd);border-radius:8px;background:#fff" srcdoc="${esc(designHtml(d.blocks).replace(/\{\{\s*name\s*\}\}/g, 'Alex'))}"></iframe></div></div>`; }
  return `<h2>Design library</h2><div class="row tabs"><a href="#design" data-dt="mine" class="${designTab === 'mine' ? 'on' : ''}">Your Design</a><a href="#design" data-dt="starter" class="${designTab === 'starter' ? 'on' : ''}">Email Templates</a><span style="flex:1"></span><button class="btn s" id="dnew">Create a Template</button></div>
  <div class="grid">${(designTab === 'mine' ? S.designs : STARTER_DESIGNS).map((d, i) => `<div class="card"><h3>${esc(d.name)}</h3><p>${esc(d.subject)}</p><p>${designTab === 'mine' ? `<button class="btn s" data-de="${d.id}">Edit</button> <button class="btn s d" data-dd="${d.id}">Delete</button>` : `<button class="btn s" data-dc="${i}">Use template</button>`}</p></div>`).join('') || '<p>Looks like you have not created any template. Create an email from scratch or explore templates.</p>'}</div>`;
};
V.design.bind = () => {
  if (designEdit) {
    const d = S.designs.find(x => x.id === designEdit), re = () => { save(); route(); };
    $('#dback').onclick = () => { designEdit = null; route(); }; $('#dsave').onclick = () => { d.name = $('#dn').value; d.subject = $('#ds').value; save(); toast('Saved'); };
    document.querySelectorAll('[data-bi]').forEach(i => i.onchange = () => { d.blocks[+i.dataset.bi][i.dataset.bk] = i.value; d.name = $('#dn').value; d.subject = $('#ds').value; re(); });
    document.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { d.blocks.splice(+b.dataset.rm, 1); re(); });
    document.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { const i = +b.dataset.up; if (i > 0) { [d.blocks[i - 1], d.blocks[i]] = [d.blocks[i], d.blocks[i - 1]]; re(); } });
    document.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => { const i = +b.dataset.dn; if (i < d.blocks.length - 1) { [d.blocks[i + 1], d.blocks[i]] = [d.blocks[i], d.blocks[i + 1]]; re(); } });
    document.querySelectorAll('[data-addb]').forEach(b => b.onclick = () => { d.blocks.push({ type: b.dataset.addb, text: b.dataset.addb === 'divider' ? '' : 'New ' + BLOCKS[b.dataset.addb].toLowerCase(), url: '' }); re(); });
    return;
  }
  document.querySelectorAll('[data-dt]').forEach(a => a.onclick = e => { e.preventDefault(); designTab = a.dataset.dt; route(); });
  $('#dnew').onclick = () => { const d = { id: uid(), name: 'Untitled', subject: 'Hello {{name}}', blocks: [{ type: 'heading', text: 'Hello {{name}}' }, { type: 'text', text: 'Write your message here.' }] }; S.designs.push(d); designEdit = d.id; save(); route(); };
  document.querySelectorAll('[data-de]').forEach(b => b.onclick = () => { designEdit = b.dataset.de; route(); });
  document.querySelectorAll('[data-dd]').forEach(b => b.onclick = () => { S.designs = S.designs.filter(d => d.id !== b.dataset.dd); save(); route(); });
  document.querySelectorAll('[data-dc]').forEach(b => b.onclick = () => { const t = STARTER_DESIGNS[+b.dataset.dc]; const d = { id: uid(), name: t.name, subject: t.subject, blocks: JSON.parse(JSON.stringify(t.blocks)) }; S.designs.push(d); designEdit = d.id; save(); route(); });
};

// ---------- HTML / design email campaign ----------
V.htmlcampaign = () => `<h2>HTML Email Campaign</h2><p style="color:var(--mut)">Send a designed email or your own HTML to contacts that have an email address. In live mode this uses Resend; otherwise it is simulated.</p>
<form id="hc"><div class="row"><input name="name" placeholder="Campaign name" required style="width:200px"><input name="subject" placeholder="Subject ({{name}} works)" required style="width:300px"><select name="label" style="width:150px"><option value="">All contacts</option>${S.labels.map(l => `<option>${esc(l)}</option>`).join('')}</select>
<select name="sender" style="width:220px"><option value="">Default sender</option>${S.senders.map(s => `<option value="${esc(s.name)} &lt;${esc(s.email)}&gt;">${esc(s.name)} (${esc(s.email)})</option>`).join('')}</select></div>
<div class="row"><select name="design" id="hd" style="width:240px"><option value="">Use my own HTML below</option>${S.designs.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select><label>or upload .html <input type="file" id="hf" accept=".html,.htm" style="width:auto"></label></div>
<textarea name="html" id="hh" rows="8" placeholder="<html>…</html>"></textarea><p><button class="btn s">Send campaign</button> <button type="button" class="btn s o" id="hp">Preview</button></p></form><div id="hprev"></div>`;
V.htmlcampaign.bind = () => {
  $('#hf').onchange = async e => { $('#hh').value = await e.target.files[0].text(); };
  $('#hp').onclick = () => { const f = $('#hc'); const d = S.designs.find(x => x.id === f.design.value); const h = d ? designHtml(d.blocks) : f.html.value; $('#hprev').innerHTML = `<iframe sandbox style="width:100%;height:420px;border:1px solid var(--bd);background:#fff" srcdoc="${esc(fillHtml(h, { name: 'Alex' }))}"></iframe>`; };
  $('#hc').onsubmit = async e => {
    e.preventDefault(); const f = e.target, d = S.designs.find(x => x.id === f.design.value), html = d ? designHtml(d.blocks) : f.html.value.trim(); if (!html) return toast('Add some HTML or choose a design');
    const to = S.contacts.filter(c => c.email && (!f.label.value || c.label === f.label.value)); if (!to.length) return toast('No contacts with an email address');
    if (!confirm(`Send "${f.name.value}" to ${to.length} contact(s)${window.SEND_ENDPOINT ? ' (live)' : ' (simulated)'}?`)) return;
    let sent = 0, failed = 0;
    for (const c of to) { const r = await deliver('email', c.email, '', { subject: fill(f.subject.value, c), html: fillHtml(html, c), from: f.sender.value || undefined }); if (r === 'failed') failed++; else sent++; }
    S.campaigns.unshift({ id: uid(), name: f.name.value, channel: 'email', total: to.length, sent, failed, mode: window.SEND_ENDPOINT ? 'live' : 'simulated', at: Date.now() }); save(); notify(`Email campaign "${f.name.value}": ${sent} sent, ${failed} failed`); toast(`${sent} sent, ${failed} failed`);
  };
};

// ---------- email verifier ----------
V.verifier = () => `<h2>Email Verifier</h2><p style="color:var(--mut)">Checks syntax, known disposable domains and whether the domain has mail servers (MX). It cannot confirm that a specific mailbox exists. Up to 100 addresses per check, 10 checks a minute.</p>
<textarea id="vl" rows="6" placeholder="One email per line"></textarea><p><button class="btn s" id="vgo">Verify</button> <button class="btn s o" id="vall">Verify all contacts</button> <button class="btn s o" id="vx" style="display:none">Export CSV</button></p><div id="vres"></div>`;
V.verifier.bind = () => {
  let last = [];
  const run = async list => {
    if (!list.length) return toast('Nothing to verify'); $('#vres').textContent = 'Checking…';
    try { const r = await post('/api/verify-email', { emails: list }); if (!r.ok) { $('#vres').textContent = r.error || 'Failed'; return; } last = r.results; }
    catch { $('#vres').innerHTML = NOBACK; return; }
    $('#vx').style.display = ''; const sum = {}; last.forEach(x => sum[x.result] = (sum[x.result] || 0) + 1);
    $('#vres').innerHTML = `<p>${Object.entries(sum).map(([k, v]) => `<span class="pill">${k}: ${v}</span>`).join(' ')}</p><table><tr><th>Email</th><th>Result</th></tr>${last.map(x => `<tr><td>${esc(x.email)}</td><td>${esc(x.result)}</td></tr>`).join('')}</table>`;
  };
  $('#vgo').onclick = () => run($('#vl').value.split(/[\s,;]+/).filter(Boolean));
  $('#vall').onclick = () => run(S.contacts.map(c => c.email).filter(Boolean).slice(0, 100));
  $('#vx').onclick = () => csvDownload([['email', 'result'], ...last.map(x => [x.email, x.result])], 'email-verification.csv');
};

// ---------- sender identities ----------
V.sender = () => `<h2>Manage Sender</h2><p style="color:var(--mut)">Saved "from" identities for email campaigns. The backend only honours addresses on the same domain as <code>EMAIL_FROM</code> (your verified sending domain); others fall back to the default sender. Domain verification itself happens in Resend.</p>
<form class="row" id="sf2"><input name="name" placeholder="Display name" required style="width:180px"><input name="email" type="email" placeholder="sender@yourdomain.com" required style="width:260px"><button class="btn s">Add sender</button></form>
<table><tr><th>Name</th><th>Address</th><th></th></tr>${S.senders.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.email)}</td><td><button class="btn s d" data-sd2="${s.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=3>None. The default sender from the server is used.</td></tr>'}</table>`;
V.sender.bind = () => {
  $('#sf2').onsubmit = e => { e.preventDefault(); S.senders.push({ id: uid(), name: e.target.name.value.replace(/[<>\r\n]/g, ''), email: e.target.email.value }); save(); route(); };
  document.querySelectorAll('[data-sd2]').forEach(b => b.onclick = () => { S.senders = S.senders.filter(s => s.id !== b.dataset.sd2); save(); route(); });
};

// ---------- voice ----------
S.vagents = S.vagents || []; S.vcamps = S.vcamps || []; S.vnums = S.vnums || []; S.vcomp = S.vcomp || []; S.calls = S.calls || [];
const VOICES = ['Default', 'Female (en)', 'Male (en)'], LANGS = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada'];
let vEdit = null;
const speak = t => { try { const u = new SpeechSynthesisUtterance(t); speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { } };
async function voiceReply(a, msgs) {
  if (window.AGENT_ENDPOINT) { try { const r = await fetch(window.AGENT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: a.prompt + '\nYou are on a phone call: answer in one or two short spoken sentences.', knowledge: S.agent.knowledge, messages: msgs }) }); const j = await r.json(); if (j.reply) return j.reply; if (j.error) return 'Agent error: ' + j.error; } catch { return 'Agent backend unreachable.'; } }
  return agentReply(msgs);
}
async function placeCall(agentName, contact, text) {
  const r = await post('/api/call', { to: contact.phone, text }).catch(() => ({ status: 'failed', error: 'backend not running' }));
  S.calls.push({ at: Date.now(), to: contact.phone, name: contact.name, status: r.status, agent: agentName }); save(); return r;
}
V.voiceagents = () => {
  if (vEdit) { const a = S.vagents.find(x => x.id === vEdit); return `<div class="row"><button class="btn s o" id="vback">←</button><h2 style="margin:0">${a.name ? esc(a.name) : 'Create voice agent'}</h2><span style="flex:1"></span><button class="btn s o" id="vtalk">Talk in browser</button><button class="btn s o" id="vtest">Test Call</button><button class="btn s" id="vsave">Save</button></div>
  <div class="two"><div><p><b>Agent Prompt</b> <small style="color:var(--mut)">Type {{variable}} in this syntax</small></p><textarea id="vp" rows="10">${esc(a.prompt)}</textarea><p><b>First message</b></p><textarea id="vf" rows="3">${esc(a.first)}</textarea></div>
  <div><p><b>Agent Settings</b></p><p>Agent name</p><input id="vn" value="${esc(a.name)}" placeholder="Name your voice agent"><p>Voice</p><select id="vv">${VOICES.map(v => `<option ${v === a.voice ? 'selected' : ''}>${v}</option>`).join('')}</select><p>Language</p><select id="vlg">${LANGS.map(v => `<option ${v === a.lang ? 'selected' : ''}>${v}</option>`).join('')}</select>
  <p style="color:var(--mut);font-size:13px">Phone calls use Twilio text-to-speech reading the first message. A live two-way conversation on the phone is not built; "Talk in browser" simulates the conversation using your browser's voice.</p>
  <div id="vchat" class="chat" style="display:none;height:200px"></div></div></div>`; }
  return `<h2>Voice Agents</h2><p style="color:var(--mut)">Build AI voice agents that talk, automate tasks and handle customer queries.</p><p><button class="btn s" id="vnew">Create Assistant</button></p>
  <div class="grid">${S.vagents.map(a => `<div class="card"><h3>${esc(a.name || 'Untitled')}</h3><p>${esc(a.lang)} · ${esc(a.voice)}</p><p>${esc(a.first).slice(0, 80)}</p><p><button class="btn s" data-ve="${a.id}">Edit</button> <button class="btn s d" data-vd="${a.id}">Delete</button></p></div>`).join('') || '<p>No voice agents yet.</p>'}</div>`;
};
V.voiceagents.bind = () => {
  if (vEdit) {
    const a = S.vagents.find(x => x.id === vEdit); const grab = () => { a.name = $('#vn').value; a.prompt = $('#vp').value; a.first = $('#vf').value; a.voice = $('#vv').value; a.lang = $('#vlg').value; };
    $('#vback').onclick = () => { grab(); save(); vEdit = null; route(); }; $('#vsave').onclick = () => { grab(); save(); toast('Saved'); };
    $('#vtest').onclick = async () => {
      grab(); save(); const c = S.contacts.find(x => x.phone); if (!c) return toast('Add a contact with a phone number first');
      if (!confirm(`Place a test call to ${c.name} (${c.phone}) reading the first message?`)) return; const r = await placeCall(a.name, c, fill(a.first, c)); toast(`Call: ${r.status}${r.error ? ' - ' + r.error : r.note ? ' - ' + r.note : ''}`);
    };
    $('#vtalk').onclick = () => {
      grab(); const box = $('#vchat'); box.style.display = ''; box.innerHTML = ''; const hist = []; const add = (c, t) => { box.insertAdjacentHTML('beforeend', `<div class="${c}"><span>${esc(t)}</span></div>`); box.scrollTop = 1e9; };
      add('a', a.first); speak(a.first);
      box.insertAdjacentHTML('afterend', '<form class="row" id="vcf"><input id="vci" placeholder="Type (or use your mic below)" style="width:60%"><button class="btn s">Send</button><button type="button" class="btn s o" id="vmic">🎤</button></form>');
      const send = async t => { add('u', t); hist.push({ role: 'user', content: t }); const r = await voiceReply(a, hist); hist.push({ role: 'assistant', content: r }); add('a', r); speak(r); };
      $('#vcf').onsubmit = e => { e.preventDefault(); const t = $('#vci').value.trim(); if (t) { $('#vci').value = ''; send(t); } };
      $('#vmic').onclick = () => { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return toast('Speech recognition is not supported in this browser'); const r = new SR(); r.onresult = e => send(e.results[0][0].transcript); r.start(); };
    };
    return;
  }
  $('#vnew').onclick = () => { const a = { id: uid(), name: '', prompt: 'You are a friendly assistant for {{company}}. Ask how you can help and answer briefly.', first: 'Hello. How can I help you today?', voice: 'Default', lang: 'English' }; S.vagents.push(a); vEdit = a.id; save(); route(); };
  document.querySelectorAll('[data-ve]').forEach(b => b.onclick = () => { vEdit = b.dataset.ve; route(); });
  document.querySelectorAll('[data-vd]').forEach(b => b.onclick = () => { S.vagents = S.vagents.filter(a => a.id !== b.dataset.vd); save(); route(); });
};
V.voicecampaigns = () => `<h2>Voice Campaigns</h2><p style="color:var(--mut)">Call a group of contacts and read an agent's first message. Calls cost money on Twilio, so this asks for confirmation and stops at 20 calls.</p>
<form class="row" id="vcf2"><input name="name" placeholder="Campaign name" required style="width:180px"><select name="agent" style="width:200px">${S.vagents.map(a => `<option value="${a.id}">${esc(a.name || 'Untitled')}</option>`).join('') || '<option value="">(create a voice agent first)</option>'}</select><select name="label" style="width:150px"><option value="">All contacts</option>${S.labels.map(l => `<option>${esc(l)}</option>`).join('')}</select><button class="btn s">Start campaign</button></form>
<table><tr><th>Campaign</th><th>Agent</th><th>Calls</th><th>OK</th><th>Failed</th><th>Date</th></tr>${S.vcamps.map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.agent)}</td><td>${c.total}</td><td>${c.ok}</td><td>${c.failed}</td><td>${fmtTime(c.at)}</td></tr>`).join('') || '<tr><td colspan=6>None yet.</td></tr>'}</table>`;
V.voicecampaigns.bind = () => $('#vcf2').onsubmit = async e => {
  e.preventDefault(); const f = e.target, a = S.vagents.find(x => x.id === f.agent.value); if (!a) return toast('Create a voice agent first');
  const to = S.contacts.filter(c => c.phone && (!f.label.value || c.label === f.label.value)).slice(0, 20); if (!to.length) return toast('No contacts with a phone number');
  if (!confirm(`Place ${to.length} call(s) ${window.SEND_ENDPOINT ? 'LIVE (billed by Twilio)' : '(simulated)'}?`)) return;
  let ok = 0, failed = 0; for (const c of to) { const r = await placeCall(a.name, c, fill(a.first, c)); if (r.status === 'failed') failed++; else ok++; }
  S.vcamps.unshift({ id: uid(), name: f.name.value, agent: a.name || 'Untitled', total: to.length, ok, failed, at: Date.now() }); save(); notify(`Voice campaign "${f.name.value}": ${ok} ok, ${failed} failed`); route();
};
V.voicenumbers = () => `<h2>Voice Numbers</h2><p style="color:var(--mut)">A record of the phone numbers you use for calls. Numbers are rented in Twilio, not here; the number actually used as caller ID is <code>TWILIO_VOICE_FROM</code> in server/.env.</p>
<form class="row" id="nf3"><input name="number" placeholder="+14155550100" required pattern="\\+[1-9][0-9]{6,14}" style="width:200px"><input name="label" placeholder="Label (e.g. Support line)" style="width:220px"><button class="btn s">Add number</button></form>
<table><tr><th>Number</th><th>Label</th><th></th></tr>${S.vnums.map(n => `<tr><td>${esc(n.number)}</td><td>${esc(n.label)}</td><td><button class="btn s d" data-nd="${n.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=3>None.</td></tr>'}</table>`;
V.voicenumbers.bind = () => { $('#nf3').onsubmit = e => { e.preventDefault(); S.vnums.push({ id: uid(), number: e.target.number.value, label: e.target.label.value }); save(); route(); }; document.querySelectorAll('[data-nd]').forEach(b => b.onclick = () => { S.vnums = S.vnums.filter(n => n.id !== b.dataset.nd); save(); route(); }); };
V.voiceanalytics = () => { const c = S.calls; const ok = c.filter(x => x.status === 'sent').length, sim = c.filter(x => x.status === 'simulated').length, fail = c.filter(x => x.status === 'failed').length;
  return `<h2>Voice Analytics</h2><div class="k"><div class="card"><p>Calls placed</p><div class="n">${c.length}</div></div><div class="card"><p>Connected to Twilio</p><div class="n">${ok}</div></div><div class="card"><p>Simulated</p><div class="n">${sim}</div></div><div class="card"><p>Failed</p><div class="n">${fail}</div></div></div>
  <p style="color:var(--mut);font-size:13px">"Connected" means Twilio accepted the call request; answered and duration need Twilio status callbacks, which are not wired up.</p>
  <table><tr><th>Time</th><th>Contact</th><th>Number</th><th>Agent</th><th>Status</th></tr>${c.slice().reverse().slice(0, 100).map(x => `<tr><td>${fmtTime(x.at)}</td><td>${esc(x.name || '')}</td><td>${esc(x.to)}</td><td>${esc(x.agent)}</td><td>${esc(x.status)}</td></tr>`).join('') || '<tr><td colspan=5>No calls yet.</td></tr>'}</table>`; };
V.voicecompliance = () => `<h2>Compliance</h2><p style="color:var(--mut)">Voice calling often needs regulatory registration (for example DLT/TRAI in India, or STIR/SHAKEN and A2P rules elsewhere). This page only keeps your own record; it does not submit anything to a regulator.</p>
<form class="row" id="cf3"><input name="biz" placeholder="Business name" required style="width:200px"><input name="use" placeholder="Use case (e.g. appointment reminders)" required style="width:300px"><button class="btn s">New Application</button></form>
<table><tr><th>Business</th><th>Use case</th><th>Status</th><th></th></tr>${S.vcomp.map(a => `<tr><td>${esc(a.biz)}</td><td>${esc(a.use)}</td><td><select data-cs="${a.id}" style="width:150px">${['draft', 'submitted (externally)', 'approved', 'rejected'].map(s => `<option ${s === a.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td><td><button class="btn s d" data-cd2="${a.id}">Delete</button></td></tr>`).join('') || '<tr><td colspan=4>No applications recorded.</td></tr>'}</table>`;
V.voicecompliance.bind = () => { $('#cf3').onsubmit = e => { e.preventDefault(); S.vcomp.push({ id: uid(), biz: e.target.biz.value, use: e.target.use.value, status: 'draft' }); save(); route(); }; document.querySelectorAll('[data-cs]').forEach(s => s.onchange = () => { S.vcomp.find(a => a.id === s.dataset.cs).status = s.value; save(); }); document.querySelectorAll('[data-cd2]').forEach(b => b.onclick = () => { S.vcomp = S.vcomp.filter(a => a.id !== b.dataset.cd2); save(); route(); }); };

// ---------- account pages ----------
S.profile = S.profile || { name: '', phone: '', company: '', tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
V.profile = () => `<h2>Manage Profile</h2><div id="pbox">Loading…</div>`;
V.profile.bind = async () => {
  const me = await api('/api/me').catch(() => ({})); const p = S.profile;
  $('#pbox').innerHTML = `<form id="pf3" style="max-width:420px"><p>Email</p><input value="${esc(me.user?.email || '')}" disabled><p>Name</p><input name="name" value="${esc(p.name)}"><p>Phone</p><input name="phone" value="${esc(p.phone)}"><p>Company</p><input name="company" value="${esc(p.company)}"><p>Time zone</p><input name="tz" value="${esc(p.tz)}"><p><button class="btn s">Save</button> <a class="btn s o" href="#inboxsettings">Chat preferences</a></p></form>`;
  $('#pf3').onsubmit = e => { e.preventDefault(); S.profile = Object.fromEntries(new FormData(e.target)); save(); toast('Saved'); };
};
S.wallet = typeof S.wallet === 'number' ? { balance: S.wallet, ledger: [] } : (S.wallet || { balance: 0, ledger: [] });
V.wallet = () => `<h2>Wallet</h2><div class="k"><div class="card"><p>Balance</p><div class="n">₹${S.wallet.balance.toFixed(2)}</div></div></div>
<p style="color:var(--mut)">This wallet is a local ledger you keep yourself. It does not move real money and does not limit sending; real costs are billed by Twilio, Resend, Razorpay and your AI provider.</p>
<form class="row" id="wf3"><input name="amt" type="number" step="0.01" placeholder="Amount (negative to deduct)" required style="width:220px"><input name="note" placeholder="Note" style="width:260px"><button class="btn s">Add entry</button></form>
<table><tr><th>Date</th><th>Amount</th><th>Note</th></tr>${S.wallet.ledger.slice().reverse().map(l => `<tr><td>${fmtTime(l.at)}</td><td>₹${l.amt.toFixed(2)}</td><td>${esc(l.note)}</td></tr>`).join('') || '<tr><td colspan=3>No entries.</td></tr>'}</table>`;
V.wallet.bind = () => $('#wf3').onsubmit = e => { e.preventDefault(); const amt = +e.target.amt.value; if (!isFinite(amt) || !amt) return; S.wallet.balance += amt; S.wallet.ledger.push({ at: Date.now(), amt, note: e.target.note.value }); save(); route(); };
let priceTerm = 'annual';
V.pricing = () => { const f = { quarterly: 1 / 0.8, half: 0.92 / 0.8, annual: 1 }[priceTerm], plans = [['Startup', '3,000 Automation Tasks/month', 1999], ['Growth', '10,000 Automation Tasks/month', 4999]];
  return `<h2 style="text-align:center">AI-powered workflows, priced for your needs</h2><div class="row" style="justify-content:center">${[['quarterly', 'Quarterly'], ['half', 'Half Yearly · Save 8%'], ['annual', 'Annual · Save 20%']].map(([k, v]) => `<button class="btn s ${priceTerm === k ? '' : 'o'}" data-pt="${k}">${v}</button>`).join('')}</div>
  <div class="grid">${plans.map(([n, t, p]) => `<div class="card"><h3>${n}</h3><p>Includes ${t}</p><div style="font-size:30px;font-weight:800;margin:10px 0">₹${Math.round(p * f).toLocaleString('en-IN')} <small style="font-size:14px;font-weight:400">/ month</small></div><button class="btn s o" disabled title="Billing is not built">Upgrade Plan</button></div>`).join('')}<div class="card"><h3>Enterprise</h3><p>Custom limits, onboarding and support</p><p><a class="btn s" href="index.html#contact">Talk to sales</a></p></div></div>
  <p style="color:var(--mut);font-size:13px;text-align:center">Prices are as shown on the reference screens (annual); quarterly and half-yearly are estimated from the stated discounts. Billing and upgrades are not implemented in this replica.</p>`; };
V.pricing.bind = () => document.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { priceTerm = b.dataset.pt; route(); });
V.setup = () => '<h2>Setup Workspace</h2><div id="sbox">Checking…</div>';
V.setup.bind = async () => {
  const st = await fetch('/api/status').then(r => r.json()).catch(() => ({})); const forms = await api('/api/forms').then(r => r.forms.length).catch(() => 0);
  const steps = [['Connect WhatsApp / SMS (Twilio keys in server/.env)', !!st.live, '#integrations'], ['Connect email sending (Resend)', !!st.emailLive, '#sender'], ['Connect an AI provider for the agent', !!st.agentLive, '#agent'], ['Add your first contacts', S.contacts.length > 0, '#contacts'], ['Create your own template', S.templates.length > 7, '#templates'], ['Build and activate a flow', S.flows.some(f => f.on) || S.workflows.some(w => w.on), '#flows'], ['Create a smart form', forms > 0, '#forms'], ['Send your first campaign', S.campaigns.length > 0, '#campaigns']];
  const done = steps.filter(s => s[1]).length;
  $('#sbox').innerHTML = `<p>${done} of ${steps.length} done</p><div style="background:var(--bd);border-radius:8px;height:10px;max-width:420px"><div style="background:var(--pri);height:10px;border-radius:8px;width:${Math.round(done / steps.length * 100)}%"></div></div>
  <table>${steps.map(([t, ok, h]) => `<tr><td>${ok ? '✅' : '⬜'}</td><td>${esc(t)}</td><td>${ok ? '' : `<a href="${h}">Open</a>`}</td></tr>`).join('')}</table>`;
};

// ---------- integrations discovery ----------
const PLATFORMS = [['Twilio (WhatsApp + SMS + voice)', 'live', 'Set Twilio keys in server/.env'], ['Resend (email)', 'emailLive', 'Set RESEND_API_KEY and EMAIL_FROM'], ['AI agent (Claude or Gemini)', 'agentLive', 'Set ANTHROPIC_API_KEY or GEMINI_API_KEY'], ['Razorpay (payment links)', 'razorpayLive', 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET'],
  ['Shopify', null, 'Use a Shopify webhook or Zapier/Make to POST contacts to /webhook/contact (set INBOUND_KEY). Native store connection is not built.'], ['Facebook Lead Ads', null, 'Use Zapier/Make to POST leads to /webhook/contact. Native connection is not built.'], ['Pabbly / Zapier / Make', null, 'POST JSON {name, phone, email} to /webhook/contact?key=YOUR_KEY.'], ['Kylas CRM', null, 'Not built. Use Zapier/Make with the inbound webhook.'], ['Google Sheets', null, 'Not built. The agent cannot read or write sheets here.'], ['Instagram / Messenger', null, 'Not built: needs a Meta app with Graph API access and review.']];
V.discover = () => '<h2>Discover Platforms</h2><div id="dbox">Loading…</div>';
V.discover.bind = async () => {
  const st = await fetch('/api/status').then(r => r.json()).catch(() => ({}));
  $('#dbox').innerHTML = `<div class="grid">${PLATFORMS.map(([n, k, d]) => `<div class="card"><h3>${esc(n)}</h3><p>${k ? (st[k] ? '<b style="color:#1a9d5c">Connected</b>' : '<b style="color:#c0392b">Not connected</b>') : '<b>Via webhook / not built</b>'}</p><p>${esc(d)}</p></div>`).join('')}</div>`;
};
V.manageint = () => V.integrations();
V.manageint.bind = () => V.integrations.bind();
const notConnected = (title, why) => () => `<h2>${title}</h2><div class="card"><h3>Not connected</h3><p>${why}</p></div>`;
V.instagraminbox = notConnected('Instagram Inbox', 'Instagram messaging needs a Meta app with Instagram Graph API access, which requires business verification and app review. It is not built in this replica.');
V.messengerinbox = notConnected('Messenger Inbox', 'Facebook Messenger needs a Meta app with Messenger Platform access and a connected Page. It is not built in this replica.');
V.waproxy = () => V.inbox(); V.waproxy.bind = () => V.inbox.bind();

// "New Campaign" shortcuts on the Broadcasts page (the reference screens show a dropdown of campaign types)
const camp0 = V.campaigns, campBind = camp0.bind;
V.campaigns = () => `<div class="row"><b>New campaign:</b> <a class="btn s o" href="#htmlcampaign">HTML email</a> <a class="btn s o" href="#voicecampaigns">Voice call</a> <a class="btn s o" href="#sequences">Drip sequence</a> <a class="btn s o" href="#analytics">Analytics</a></div>` + camp0();
V.campaigns.bind = campBind;

// ---------- menu ----------
const mgr =name => MENU.find(g => g[0] === name);
mgr('Marketing')[1].push(['design', 'Email Design'], ['htmlcampaign', 'HTML Campaign'], ['verifier', 'Email Verifier'], ['sender', 'Senders']);
mgr('Agentic AI')[1].push(['voiceagents', 'Voice Agents'], ['voicecampaigns', 'Voice Campaigns'], ['voicenumbers', 'Voice Numbers'], ['voiceanalytics', 'Voice Analytics'], ['voicecompliance', 'Voice Compliance']);
mgr('Support')[1].push(['instagraminbox', 'Instagram Inbox'], ['messengerinbox', 'Messenger Inbox']);
mgr('Automations')[1].push(['discover', 'Discover Platforms'], ['manageint', 'Manage Integrations']);
MENU.unshift(['Workspace', [['setup', 'Setup Workspace']]]);
mgr('Account Settings')[1].push(['profile', 'Manage Profile'], ['wallet', 'Wallet'], ['pricing', 'Pricing Plans']);
route();
