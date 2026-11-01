// Workspace shell: sidebar, header, and the screens captured from the admin app.
const svg = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>'),
  home: svg('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>'),
  user: svg('<circle cx="12" cy="8" r="3"/><path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19"/>'),
  list: svg('<path d="M8 7h12M8 12h12M8 17h12"/><path d="M4 7h.01M4 12h.01M4 17h.01"/>'),
  mega: svg('<path d="M4 10v4l10 4V6L4 10zM14 9.5c1.5.8 2.5 2 2.5 2.5S15.5 13.7 14 14.5"/>'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>'),
  bolt: svg('<path d="M13 3 5 14h7l-1 7 8-11h-7z"/>'),
  key: svg('<circle cx="8" cy="14" r="3"/><path d="M11 14h9l-2 2 2 2"/>'),
  flow: svg('<rect x="3" y="4" width="6" height="5" rx="1"/><rect x="15" y="15" width="6" height="5" rx="1"/><path d="M6 9v3a3 3 0 0 0 3 3h6"/>'),
  bot: svg('<rect x="5" y="8" width="14" height="10" rx="3"/><path d="M12 8V5M9 13h.01M15 13h.01"/>'),
  phone: svg('<path d="M7 3h4l1 4-2 1a12 12 0 0 0 6 6l1-2 4 1v4a2 2 0 0 1-2 2A16 16 0 0 1 5 5a2 2 0 0 1 2-2z"/>'),
  inbox: svg('<path d="M3 12h5l2 3h4l2-3h5v7H3z"/><path d="M3 12 6 4h12l3 8"/>'),
  chart: svg('<path d="M4 19V5M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>'),
  card: svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/>'),
  book: svg('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3z"/><path d="M5 4v16"/>'),
  nodes: svg('<circle cx="6" cy="6" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="8" cy="18" r="2"/><path d="M8 7l8 2M7 16l9-6"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>'),
  wallet: svg('<rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="16" cy="12.5" r="1"/>'),
  bell: svg('<path d="M6 16V10a6 6 0 1 1 12 0v6l1 2H5z"/><path d="M10 18a2 2 0 0 0 4 0"/>'),
  headset: svg('<path d="M4 13a8 8 0 0 1 16 0"/><rect x="3" y="13" width="4" height="6" rx="1"/><rect x="17" y="13" width="4" height="6" rx="1"/>'),
};
const GROUPS = [
  { items: [
    { href: '#setup', icon: 'gear', label: 'Setup Workspace' },
    { href: '#dash', icon: 'home', label: 'Dashboard' },
  ]},
  { label: 'Data', items: [
    { href: '#contacts', icon: 'user', label: 'Contacts', fly: [['#contacts', 'All Contacts'], ['#labels', 'Labels']] },
    { href: '#forms', icon: 'list', label: 'Smart Forms' },
  ]},
  { label: 'Marketing', items: [
    { icon: 'mega', label: 'Broadcasts', fly: [['#campaigns', 'Campaigns'], ['#analytics', 'Broadcast Analytics'], ['#globalanalytics', 'Global Analytics']] },
    { icon: 'mail', label: 'Email Manager', fly: [['#design', 'Email Builder'], ['#sequences', 'Email Drips'], ['#verifier', 'Email Verifier'], ['#htmlcampaign', 'HTML Campaign'], ['#sender', 'Manage Sender IDs']] },
    { href: '#templates', icon: 'bolt', label: 'Template Library' },
    { href: '#qr', icon: 'nodes', label: 'QR & Chat Button' },
  ]},
  { label: 'Automations', items: [
    { href: '#keywords', icon: 'key', label: 'Keywords' },
    { href: '#workflows', icon: 'flow', label: 'Workflows' },
    { href: '#flows', icon: 'bolt', label: 'AI Workflows' },
  ]},
  { label: 'Agentic AI', items: [
    { href: '#agent', icon: 'bot', label: 'AI Chat Agents' },
    { icon: 'phone', label: 'AI Voice Agents', fly: [['#voiceagents', 'Voice Agents'], ['#voicecampaigns', 'Campaigns'], ['#voicenumbers', 'Numbers'], ['#voiceanalytics', 'Analytics'], ['#voicecompliance', 'Compliance'], ['#voice', 'Place a Test Call']] },
  ]},
  { label: 'Support', items: [
    { icon: 'inbox', label: 'Team Inbox', fly: [['#inbox', 'WhatsApp Inbox'], ['#instagraminbox', 'Instagram Inbox'], ['#messengerinbox', 'Messenger Inbox'], ['#canned', 'Canned Responses']] },
    { href: '#supportanalytics', icon: 'chart', label: 'WA Support Analytics' },
  ]},
  { label: 'Commerce', items: [
    { href: '#wapay', icon: 'card', label: 'WhatsApp Payments' },
    { href: '#catalog', icon: 'book', label: 'WhatsApp Catalog' },
    { href: '#payments', icon: 'card', label: 'Payment Links' },
  ]},
  { items: [
    { icon: 'nodes', label: 'Integrations', fly: [['#discover', 'Discover Platforms'], ['#manageint', 'Manage']] },
    { icon: 'settings', label: 'Account settings', fly: [['#people', 'People'], ['#autosettings', 'Automation Settings'], ['#inboxsettings', 'Inbox Settings'], ['#webhooks', 'Webhooks'], ['#settingsattr', 'Attributes'], ['#notifications', 'Notifications'], ['#profile', 'Manage Profile'], ['#wallet', 'Wallet'], ['#pricing', 'Pricing Plans']] },
  ]},
];
const LIB = [
  ['Offer message', 'Ecommerce', 'whatsapp', 'Hi {{1}}! {{2}}% off on any purchase. Use code {{3}}. Offer ends tonight.'],
  ['Order cancelled', 'Ecommerce', 'whatsapp', 'Hi {{1}}! Your order {{2}} of {{3}} has been cancelled. We hope to see you again.'],
  ['COD to Prepaid', 'Ecommerce', 'whatsapp', 'Hey {{1}}, your order for {{2}} is confirmed. Pay now and get {{3}} off.'],
  ['Delivery tracking', 'Ecommerce', 'whatsapp', 'Hey {{1}}, your order of {{2}} from {{3}} has shipped. Track it here.'],
  ['Order upsell', 'Ecommerce', 'whatsapp', 'Hi {{1}}, customers who bought {{2}} also like {{3}}.'],
  ['Product launch', 'Ecommerce', 'whatsapp', 'Hey {{1}}, {{2}} is now live. Reply YES for the link.'],
  ['Balance alert', 'Banking', 'whatsapp', 'Hi {{1}}, your account {{2}} balance is {{3}}.'],
  ['Fee reminder', 'Banking', 'whatsapp', 'Hi {{1}}, a payment of {{2}} is due on {{3}}.'],
  ['Admission enquiry', 'Education', 'whatsapp', 'Hi {{1}}, thanks for your interest in {{2}}. Reply YES to book a call.'],
  ['Site visit', 'Real Estate', 'whatsapp', 'Hi {{1}}, your visit to {{2}} is booked for {{3}}.'],
  ['Appointment reminder', 'Healthcare', 'whatsapp', 'Hi {{1}}, a reminder of your appointment on {{2}} at {{3}}.'],
  ['Webinar invite', 'Webinar', 'whatsapp', 'Hi {{1}}, join our webinar "{{2}}" on {{3}}.'],
  ['Welcome email', 'Ecommerce', 'email', 'Hi {{1}}, welcome to {{2}}. Here is 10% off your first order: {{3}}.'],
  ['Abandoned cart', 'Ecommerce', 'email', 'Hi {{1}}, you left {{2}} in your cart. Finish checkout: {{3}}'],
  ['Newsletter', 'Education', 'email', 'Hi {{1}}, this week at {{2}}: {{3}}'],
].map(([name, cat, channel, body], i) => ({ id: 'lib' + i, name, cat, channel, body }));

S.profile = S.profile || { name: '', phone: '', company: '', tz: '' };
if (typeof S.wallet === 'number') S.wallet = { balance: S.wallet, ledger: [] };
S.wallet = S.wallet || { balance: 0, ledger: [] };
S.tickets = S.tickets || [];
S.feedback = S.feedback || [];
if (!S.trialEnd) { S.trialEnd = Date.now() + 6 * 864e5; save(); }
try {
  const pending = sessionStorage.getItem('pendingProfile');
  if (pending) { sessionStorage.removeItem('pendingProfile'); S.profile = { ...S.profile, ...JSON.parse(pending) }; save(); }
} catch { /* ignore bad session storage */ }

const here = () => location.hash || '#dash';
const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const personName = () => (S.profile && S.profile.name) || (window.ME && ME.name) || 'there';
const companyName = () => (S.profile && S.profile.company) || (window.ME && ME.company) || 'My workspace';
const initials = (n) => (String(n).trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('') || 'R').toUpperCase();
const hasLib = (t) => S.templates.some(x => x.name === t.name && x.channel === t.channel);
const campStatus = (c) => (c.failed && !c.sent ? 'failed' : c.sent ? 'sent' : 'draft');

let contactMode = 'auto';
let campOpen = false, campMenu = false, campChannel = 'whatsapp', campQ = '', campCh = '', campSt = '';
let tplForm = false, tplTab = 'whatsapp', tplCat = 'All';
let notesOpen = false, profileOpen = false, walletOpen = false, supportOpen = false;
let noteTab = 'all', walletAmt = 1000, supportSubject = '';
let dashCh = 'whatsapp', dashDays = 7;
const socialThread = { instagram: '', messenger: '' };

const drawContacts = V.contacts, bindContacts = V.contacts.bind, bindCamp = V.campaigns.bind, inboxBind = V.inbox.bind;

function placeFly(item) {
  const fly = item.querySelector('.fly'); if (!fly) return;
  const r = item.getBoundingClientRect();
  fly.style.left = (r.right + 8) + 'px';
  fly.style.top = Math.max(8, Math.min(r.top, window.innerHeight - 300)) + 'px';
}
function isOn(href, fly) {
  const h = here();
  return href === h || (fly || []).some(x => x[0] === h);
}
function paintMenu() {
  $('#menu').innerHTML = GROUPS.map(g => (g.label ? `<div class="rail-sec">${g.label}</div>` : '') + g.items.map(it => {
    const on = isOn(it.href, it.fly);
    const link = it.href
      ? `<a class="navlink${on ? ' on' : ''}" href="${it.href}" title="${esc(it.label)}">${ICONS[it.icon] || ''}<span class="lbl">${esc(it.label)}</span></a>`
      : `<button type="button" class="navlink${on ? ' on' : ''}" title="${esc(it.label)}">${ICONS[it.icon] || ''}<span class="lbl">${esc(it.label)}</span></button>`;
    const fly = it.fly ? `<button type="button" class="flybtn" aria-label="Open ${esc(it.label)}">›</button><div class="fly"><b>${esc(it.label)}</b>${it.fly.map(([h, n]) => `<a href="${h}" class="${here() === h ? 'on' : ''}">${esc(n)}</a>`).join('')}</div>` : '';
    return `<div class="navitem${it.fly ? ' hasfly' : ''}${on ? ' on' : ''}">${link}${fly}</div>`;
  }).join('')).join('');
  $('#menu').querySelectorAll('.navitem').forEach(item => { item.onmouseenter = () => placeFly(item); });
  $('#menu').querySelectorAll('.flybtn, .navitem.hasfly > button.navlink').forEach(b => {
    b.onclick = (e) => { e.preventDefault(); e.stopPropagation(); const item = b.closest('.navitem'); item.classList.toggle('open'); placeFly(item); };
  });
}

function trialHtml() {
  if (S.hideTrial) return '';
  const days = Math.max(0, Math.ceil((S.trialEnd - Date.now()) / 864e5));
  const text = S.plan
    ? `You're on the ${S.plan} plan in this demo. No card was charged.`
    : `Your free trial of Rokesh expires in ${days} day${days === 1 ? '' : 's'}. Upgrade now to prevent disruption.`;
  return `<div class="trial"><span>${esc(text)}</span><span><a href="#pricing">Upgrade Plan</a> <button type="button" id="trialX" aria-label="Dismiss">×</button></span></div>`;
}
function accountHtml(bal) {
  return `<button type="button" class="wallet-pill" id="walletBtn">${ICONS.wallet}<span>${inr(bal)}</span></button>
  <a class="upgrade" href="#pricing">Upgrade Plan</a>
  <button type="button" class="iconbtn" id="noteBtn" aria-label="Notifications">${ICONS.bell}<i data-count hidden></i></button>
  <button type="button" class="iconbtn" id="supBtn" aria-label="Support">${ICONS.headset}</button>
  <button type="button" class="avatar" id="profBtn" aria-label="Account">${esc(initials(personName()))}</button>`;
}
function headerTools(v) {
  if (v === 'contacts') return `<input id="headQ" class="search" placeholder="Search in Contacts" value="${esc(filt.q)}"><button type="button" class="btn dark" id="headAdd">Add Contact</button>`;
  if (v === 'campaigns') return `<button type="button" class="btn o" id="headExport">Export Report</button><button type="button" class="btn" id="headNew">+ New Campaign</button>`;
  if (v === 'templates') return `<button type="button" class="btn" id="headCreate">Create a Template</button>`;
  return '';
}
function paintChrome() {
  const v = here().slice(1);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const pageH = document.querySelector('#view > h2');
  let title;
  if (v === 'dash') title = `<h1 class="hello">Hello ${esc(personName())},<br>${hello}</h1>`;
  else {
    const text = pageH ? pageH.textContent : ($('#crumb').textContent || 'Workspace');
    if (pageH && v !== 'pricing') pageH.classList.add('page-title-dup');
    title = `<button type="button" class="iconbtn menu-toggle" id="openMenu" aria-label="Open menu">${ICONS.menu}</button><h1 class="pagetitle">${esc(text)}</h1>`;
  }
  $('#top').innerHTML = `<div class="top__left">${title}</div><div class="top__tools">${headerTools(v)}</div><div class="account">${accountHtml(S.wallet.balance)}</div>`;
  $('#trial').innerHTML = trialHtml();
  if ($('#trialX')) $('#trialX').onclick = () => { S.hideTrial = true; save(); paintChrome(); };
  if ($('#openMenu')) $('#openMenu').onclick = () => $('#side').classList.toggle('open');
  $('#walletBtn').onclick = () => { walletOpen = true; notesOpen = profileOpen = campMenu = false; paintPop(); };
  $('#noteBtn').onclick = () => { notesOpen = !notesOpen; profileOpen = campMenu = false; paintPop(); };
  $('#supBtn').onclick = () => { supportOpen = true; supportSubject = ''; paintPop(); };
  $('#profBtn').onclick = () => { profileOpen = !profileOpen; notesOpen = campMenu = false; paintPop(); };
  const q = $('#headQ');
  if (q) q.oninput = (e) => { const p = e.target.selectionStart; filt.q = e.target.value; route(); const n = $('#headQ'); if (n) { n.focus(); n.setSelectionRange(p, p); } };
  if ($('#headAdd')) $('#headAdd').onclick = () => { contactMode = 'form'; if (here() !== '#contacts') location.hash = 'contacts'; else route(); };
  if ($('#headExport')) $('#headExport').onclick = () => csvDownload([['Name', 'Label', 'Type', 'Channel', 'Status', 'Contacts', 'Sent', 'Failed'], ...S.campaigns.map(c => [c.name, c.label || '', c.type || 'Broadcast', c.channel, campStatus(c), c.total, c.sent, c.failed])], 'campaigns.csv');
  if ($('#headNew')) $('#headNew').onclick = () => { campMenu = !campMenu; notesOpen = profileOpen = false; paintPop(); };
  if ($('#headCreate')) $('#headCreate').onclick = () => { tplForm = !tplForm; if (here() !== '#templates') location.hash = 'templates'; else route(); };
  paintMenu();
  paintPop();
  if (typeof updateBell === 'function') updateBell();
  document.title = (v === 'dash' ? 'Home' : ($('#crumb').textContent || 'Workspace')) + ' · Rokesh';
}

function paintPop() {
  const bits = [];
  if (notesOpen) {
    const list = (S.notes || []).filter(n => noteTab === 'all' || !n.read);
    bits.push(`<div class="popcard notes"><div class="modal-h"><b>Notifications</b><button type="button" id="noteX">×</button></div>
      <div class="seg"><button type="button" class="${noteTab === 'all' ? 'on' : ''}" data-nt="all">All</button><button type="button" class="${noteTab === 'unread' ? 'on' : ''}" data-nt="unread">Unread</button><span class="sp"></span><button type="button" class="linkish" id="noteRead">Mark all as read</button></div>
      ${list.map(n => `<div class="note"><p>${esc(n.text)}</p><small>${esc(fmtTime(n.at))}</small></div>`).join('') || '<p>No notifications.</p>'}
      <p><a href="#notifications">Open notification history</a></p></div>`);
  }
  if (profileOpen) {
    bits.push(`<div class="popcard profile"><div class="who"><span class="avatar">${esc(initials(personName()))}</span><div><b>${esc(personName())}</b><div style="color:#777;font-size:13px">${esc(companyName())}</div></div></div>
      <a href="#profile">Manage Profile</a><button type="button" class="out" id="doLogout">Logout</button></div>`);
  }
  if (walletOpen) {
    const amt = Number(walletAmt) || 0, gst = Math.round(amt * 18) / 100, total = amt + gst;
    bits.push(`<div class="modal-back" id="walletBack"><div class="modal"><div class="modal-h"><h3>Rokesh Wallet Top-up</h3><button type="button" id="walletX">×</button></div>
      <div class="card"><b>Description</b><p>Rokesh Wallet streamlines your business operations. It records in-app purchases and deductions. This demo ledger does not move real money. Balance is used as a record for:</p>
      <ul><li>Emails, SMS, RCS, and WhatsApp messages</li><li>AI assistant tokens</li><li>Email verification</li><li>Automation tasks past the monthly quota</li></ul>
      <p>Track credits and debits from wallet history.</p></div>
      <p>Top-up Amount</p><input id="walletAmt" type="number" min="1" step="1" value="${amt}">
      <p>Quick Selectors</p><div class="quick">${[1000, 2500, 5000, 10000].map(n => `<button type="button" data-amt="${n}">₹${n}</button>`).join('')}</div>
      <div class="sum"><span>Top up amount</span><b>${inr(amt)}</b></div>
      <div class="sum"><span>GST (18%)</span><b>${inr(gst)}</b></div>
      <div class="sum"><span>Total</span><b>${inr(total)}</b></div>
      <p style="color:#777;font-size:13px">GST is shown the way the reference screen shows it. This demo credits the top-up amount only and does not charge a card.</p>
      <button type="button" class="btn" id="walletGo">Proceed</button></div></div>`);
  }
  if (supportOpen) {
    bits.push(`<div class="modal-back" id="supBack"><div class="modal"><div class="modal-h"><h3>Rokesh Support</h3><button type="button" id="supX">×</button></div>
      <form id="supForm" class="formgrid"><input name="subject" placeholder="Subject" required value="${esc(supportSubject)}"><textarea name="message" placeholder="How can we help?" required></textarea><button class="btn">Save ticket</button></form>
      <p style="color:#777;font-size:13px">Tickets stay in this browser. Nothing is emailed.</p>
      ${(S.tickets || []).slice(0, 5).map(t => `<div class="note"><b>${esc(t.subject)}</b><p>${esc(t.message)}</p></div>`).join('')}</div></div>`);
  }
  if (campMenu) {
    const items = [['whatsapp', 'WhatsApp broadcast'], ['sms', 'SMS broadcast'], ['email', 'Email broadcast'], ['htmlcampaign', 'HTML email'], ['voicecampaigns', 'Voice call'], ['sequences', 'Drip sequence']];
    bits.push(`<div class="popcard menu-pop">${items.map(([k, n]) => `<button type="button" data-kind="${k}">${n}</button>`).join('')}</div>`);
  }
  $('#pop').innerHTML = bits.join('');
  $('#noteX') && ($('#noteX').onclick = () => { notesOpen = false; paintPop(); });
  document.querySelectorAll('[data-nt]').forEach(b => b.onclick = () => { noteTab = b.dataset.nt; paintPop(); });
  $('#noteRead') && ($('#noteRead').onclick = () => { S.notes.forEach(n => n.read = true); save(); updateBell(); paintPop(); });
  $('#doLogout') && ($('#doLogout').onclick = () => $('#logout').click());
  $('#walletX') && ($('#walletX').onclick = () => { walletOpen = false; paintPop(); });
  $('#walletBack') && ($('#walletBack').onclick = (e) => { if (e.target.id === 'walletBack') { walletOpen = false; paintPop(); } });
  const amtInput = $('#walletAmt');
  if (amtInput) amtInput.oninput = () => { walletAmt = +amtInput.value || 0; paintPop(); const n = $('#walletAmt'); if (n) n.focus(); };
  document.querySelectorAll('[data-amt]').forEach(b => b.onclick = () => { walletAmt = +b.dataset.amt; paintPop(); });
  $('#walletGo') && ($('#walletGo').onclick = () => {
    const amt = Number(walletAmt); if (!amt || amt < 0) return toast('Enter a top-up amount');
    const gst = Math.round(amt * 18) / 100;
    S.wallet.balance += amt; S.wallet.ledger.push({ at: Date.now(), amt, note: `Top-up (GST ${inr(gst)} shown, not charged)` });
    save(); walletOpen = false; toast(inr(amt) + ' added to the demo wallet'); route();
  });
  $('#supX') && ($('#supX').onclick = () => { supportOpen = false; paintPop(); });
  $('#supBack') && ($('#supBack').onclick = (e) => { if (e.target.id === 'supBack') { supportOpen = false; paintPop(); } });
  $('#supForm') && ($('#supForm').onsubmit = (e) => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    S.tickets.unshift({ id: uid(), at: Date.now(), subject: d.subject, message: d.message }); save();
    supportOpen = false; toast('Ticket saved in this workspace'); route();
  });
  document.querySelectorAll('[data-kind]').forEach(b => b.onclick = () => {
    const k = b.dataset.kind; campMenu = false;
    if (['htmlcampaign', 'voicecampaigns', 'sequences'].includes(k)) { location.hash = k; return; }
    campChannel = k; campOpen = true;
    if (here() !== '#campaigns') location.hash = 'campaigns'; else route();
  });
}

function emptyContacts() {
  return `<div class="empty-grid">
    <div class="empty-card"><h3>Create contact</h3><p>Add a contact manually by entering details</p><button type="button" data-empty="form">Create contact ›</button></div>
    <div class="empty-card"><h3>CSV File</h3><p>Upload a list of contacts</p><button type="button" data-empty="map">Upload a File ›</button></div>
    <div class="empty-card"><h3>Facebook Sync</h3><p>Sync leads from Facebook</p><button type="button" data-empty="fb">Sync Contacts ›</button></div>
    <div class="empty-card"><h3>Shopify</h3><p>Sync customers from Shopify</p><button type="button" data-empty="shop">Sync Contacts ›</button></div>
  </div>`;
}
function installViews() {
  V.contacts = () => {
    const searching = !!(filt.q || (filt.rows || []).length);
    if (!S.contacts.length && !searching && contactMode === 'auto') return emptyContacts();
    let html = drawContacts();
    if (contactMode === 'map') html = html.replace('<details>', '<details open>');
    if (!S.contacts.length) html = `<p><button type="button" class="btn o s" id="contactBack">All import options</button></p>` + html;
    return html;
  };
  V.contacts.bind = () => {
    document.querySelectorAll('[data-empty]').forEach(b => b.onclick = () => {
      const k = b.dataset.empty;
      if (k === 'form') { contactMode = 'form'; route(); }
      else if (k === 'map') { contactMode = 'map'; route(); }
      else { toast(k === 'fb' ? 'Facebook leads arrive through the inbound webhook.' : 'Shopify customers arrive through the inbound webhook.'); location.hash = 'discover'; }
    });
    if ($('#contactBack')) $('#contactBack').onclick = () => { contactMode = 'auto'; filt.q = ''; route(); };
    if ($('#cf')) bindContacts();
  };

  V.dash = () => {
    const since = Date.now() - dashDays * 864e5;
    const logs = (S.msglog || []).filter(m => m.at >= since && m.channel === dashCh);
    const delivery = logs.length ? (logs.filter(m => m.status !== 'failed').length / logs.length * 100).toFixed(2) + '%' : '0.00%';
    const uniq = new Set((S.msglog || []).map(m => m.to)).size;
    const bars = Math.min(dashDays, 14);
    const days = [...Array(bars)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (bars - 1 - i)); return d; });
    const counts = days.map(d => (S.msglog || []).filter(m => m.channel === dashCh && m.at >= d.getTime() && m.at < d.getTime() + 864e5).length);
    const max = Math.max(1, ...counts);
    return `<p class="section-label">Experience what you can achieve with Rokesh</p>
    <div class="promo-grid">
      <article class="promo"><div><h3>AI Chat Agent</h3><p>Implement AI chat agents that can provide immediate responses across your channels.</p><a class="btn" href="#agent">Talk to AI Chat Agent ›</a></div><div class="art">🤖</div></article>
      <article class="promo"><div><h3>AI Voice Agent</h3><p>Develop voice assistants that place test calls and read a script aloud.</p><a class="btn" href="#voiceagents">Talk to AI Voice Agent ›</a></div><div class="art">🎧</div></article>
      <article class="promo"><div><h3>Send WhatsApp Message</h3><p>Get started by sending your first message on WhatsApp.</p><a class="btn" href="#campaigns">New campaign ›</a></div><div class="art">💬</div></article>
      <article class="promo"><div><h3>Instagram automation</h3><p>Reply to demo Instagram messages and try a flow trigger.</p><a class="btn" href="#instagraminbox">Open Instagram inbox ›</a></div><div class="art">📸</div></article>
    </div>
    <div class="panel"><div class="metrics">
      <div class="metric"><span>CSAT</span><div class="n">0%</div></div>
      <div class="metric"><span>Total</span><div class="n">${uniq || '--'}</div></div>
      <div class="metric"><span>Completion</span><div class="n">--</div></div>
      <div class="metric"><span>Unique</span><div class="n">${uniq || '--'}</div></div>
    </div></div>
    <div class="panel"><div class="toolbar"><b>Messaging Analytics</b>
      <select id="dashCh">${['whatsapp', 'email', 'sms', 'rcs'].map(c => `<option value="${c}" ${c === dashCh ? 'selected' : ''}>${c[0].toUpperCase() + c.slice(1)}</option>`).join('')}</select>
      <select id="dashDays">${[7, 14, 30].map(n => `<option value="${n}" ${n === dashDays ? 'selected' : ''}>${n} days</option>`).join('')}</select>
      <button type="button" class="btn s" id="bookDemo">Schedule a demo</button></div>
      <div class="metrics">
        <div class="metric"><span>Delivery</span><div class="n">${delivery}</div></div>
        <div class="metric"><span>Open</span><div class="n">0.00%</div></div>
        <div class="metric"><span>Click-</span><div class="n">0.00%</div></div>
        <div class="metric"><span>Response</span><div class="n">0.00%</div></div>
      </div>
      <h3>${esc(dashCh[0].toUpperCase() + dashCh.slice(1))} Performance</h3>
      <div class="chart">${counts.map((c, i) => `<div style="flex:1"><i style="height:${Math.round(c / max * 110)}px" title="${c}"></i><b>${days[i].toLocaleDateString(undefined, { weekday: 'short' })}</b></div>`).join('')}</div>
      <p style="color:#777;font-size:13px">Delivery uses messages sent from this workspace. Opens and clicks stay at 0 until a provider reports them.</p>
    </div>`;
  };
  V.dash.bind = () => {
    $('#dashCh').onchange = (e) => { dashCh = e.target.value; route(); };
    $('#dashDays').onchange = (e) => { dashDays = +e.target.value; route(); };
    $('#bookDemo').onclick = () => { supportOpen = true; supportSubject = 'Demo request'; paintPop(); };
  };

  V.campaigns = () => {
    const rows = S.campaigns.map(c => `<tr data-name="${esc(c.name.toLowerCase())}" data-ch="${esc(c.channel)}" data-st="${campStatus(c)}"><td>${esc(c.name)}</td><td>${esc(c.label || '—')}</td><td>${esc(c.type || 'Broadcast')}</td><td>${esc(c.channel)}</td><td>${campStatus(c)}</td><td>${c.total}</td><td>${c.sent}</td><td>${c.failed}</td></tr>`).join('');
    return `<h2>Recent Campaigns</h2>
    <div class="toolbar"><input id="campQ" class="search" placeholder="Search for campaign" value="${esc(campQ)}">
      <select id="campCh"><option value="">All Channels</option>${['whatsapp', 'email', 'sms'].map(c => `<option ${campCh === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select id="campSt"><option value="">All Status</option>${['sent', 'failed', 'draft'].map(s => `<option ${campSt === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    </div>
    <p class="banner-note">Your templates might have moved to a different category. Add any you need from the template library, then send again.</p>
    <table id="campTable"><thead><tr><th>Campaign Name</th><th>Label</th><th>Campaign Type</th><th>Channels</th><th>Status</th><th>Contacts</th><th>Sent</th><th>Failed</th></tr></thead>
    <tbody>${rows}<tr id="campEmpty"${rows ? ' hidden' : ''}><td colspan="8">No campaigns yet. Use New Campaign to message a label.</td></tr></tbody></table>
    <p id="campMeta" style="text-align:right;color:#777"></p>
    <div class="modal-back" id="campBack"${campOpen ? '' : ' hidden'}><div class="modal"><div class="modal-h"><h3>New ${esc(campChannel)} campaign</h3><button type="button" id="campX">×</button></div>
    <form id="bf" class="formgrid"><input name="name" placeholder="Campaign name" required>
      <select name="tpl">${S.templates.map(t => `<option value="${t.id}">${esc(t.name)} (${esc(t.channel)})</option>`).join('') || '<option value="">No templates yet</option>'}</select>
      <select name="label"><option value="">All contacts</option>${S.labels.map(l => `<option>${esc(l)}</option>`).join('')}</select>
      <button class="btn">Send campaign</button></form>
    <p style="color:#777;font-size:13px">The template's channel is what gets sent. Pick a ${esc(campChannel)} template.</p></div></div>`;
  };
  V.campaigns.bind = () => {
    bindCamp();
    const form = $('#bf');
    if (form) {
      const prev = form.onsubmit;
      form.onsubmit = async (e) => {
        const t = S.templates.find(x => x.id === form.tpl.value);
        if (campChannel && t && t.channel !== campChannel) { e.preventDefault(); return toast('Choose a ' + campChannel + ' template'); }
        const n = S.campaigns.length;
        await prev(e);
        if (S.campaigns.length !== n) { campOpen = false; route(); }
      };
    }
    $('#campX') && ($('#campX').onclick = () => { campOpen = false; route(); });
    $('#campBack') && ($('#campBack').onclick = (e) => { if (e.target.id === 'campBack') { campOpen = false; route(); } });
    const apply = () => {
      let n = 0;
      document.querySelectorAll('#campTable tbody tr[data-name]').forEach(tr => {
        const ok = (!campQ || tr.dataset.name.includes(campQ.toLowerCase())) && (!campCh || tr.dataset.ch === campCh) && (!campSt || tr.dataset.st === campSt);
        tr.hidden = !ok; if (ok) n++;
      });
      const empty = $('#campEmpty'); if (empty) empty.hidden = n > 0;
      if ($('#campMeta')) $('#campMeta').textContent = n + ' of ' + S.campaigns.length;
    };
    $('#campQ') && ($('#campQ').oninput = (e) => { campQ = e.target.value; apply(); });
    $('#campCh') && ($('#campCh').onchange = (e) => { campCh = e.target.value; apply(); });
    $('#campSt') && ($('#campSt').onchange = (e) => { campSt = e.target.value; apply(); });
    apply();
  };

  V.templates = () => {
    const cats = ['All', 'Ecommerce', 'Banking', 'Education', 'Real Estate', 'Healthcare', 'Webinar'];
    const items = LIB.filter(t => t.channel === tplTab && (tplCat === 'All' || t.cat === tplCat));
    const form = tplForm ? `<form id="tf" class="card formgrid"><h3>Create a template</h3>
      <input name="name" placeholder="Template name" required>
      <select name="channel"><option ${tplTab === 'whatsapp' ? 'selected' : ''}>whatsapp</option><option ${tplTab === 'email' ? 'selected' : ''}>email</option><option>sms</option></select>
      <input name="cat" placeholder="Category" value="${esc(tplCat === 'All' ? '' : tplCat)}">
      <textarea name="body" required placeholder="Message body. Use {{1}}, {{2}} or {{name}}"></textarea>
      <p><button class="btn">Save template</button> <button type="button" class="btn o" id="tplCancel">Cancel</button></p></form>` : '';
    return `<h2>Template Library</h2>${form}
    <div class="tabsline"><button type="button" data-tab="whatsapp" class="${tplTab === 'whatsapp' ? 'on' : ''}">WhatsApp Templates</button><button type="button" data-tab="email" class="${tplTab === 'email' ? 'on' : ''}">Email Templates</button></div>
    <div class="lib"><div class="cats">${cats.map(c => `<button type="button" data-cat="${esc(c)}" class="${tplCat === c ? 'on' : ''}">${esc(c)}</button>`).join('')}</div>
    <div class="libgrid">${items.map(t => `<article class="tcard"><h3>${esc(t.name)}</h3><p>${esc(t.body)}</p><button type="button" class="add${hasLib(t) ? ' have' : ''}" data-addlib="${t.id}">${hasLib(t) ? 'Added' : 'Add Template'}</button></article>`).join('') || '<p>No templates in this category.</p>'}</div></div>
    <h3>Your templates</h3><div class="libgrid">${S.templates.map(t => `<article class="tcard"><h3>${esc(t.name)}</h3><p style="color:#888;font-size:12px">${esc(t.cat || '')} · ${esc(t.channel)}</p><p>${esc(t.body)}</p><button type="button" class="btn s d" data-td="${t.id}">Delete</button></article>`).join('') || '<p>None yet. Add one from the library or create your own.</p>'}</div>`;
  };
  V.templates.bind = () => {
    document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tplTab = b.dataset.tab; if (tplTab === 'email' && !['All', 'Ecommerce', 'Education'].includes(tplCat)) tplCat = 'All'; route(); });
    document.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { tplCat = b.dataset.cat; route(); });
    document.querySelectorAll('[data-addlib]').forEach(b => b.onclick = () => {
      const t = LIB.find(x => x.id === b.dataset.addlib); if (!t || hasLib(t)) return toast('Already in your templates');
      S.templates.unshift({ id: uid(), name: t.name, cat: t.cat, body: t.body, channel: t.channel }); save(); toast('Template added'); route();
    });
    document.querySelectorAll('[data-td]').forEach(b => b.onclick = () => { S.templates = S.templates.filter(t => t.id !== b.dataset.td); save(); route(); });
    $('#tplCancel') && ($('#tplCancel').onclick = () => { tplForm = false; route(); });
    $('#tf') && ($('#tf').onsubmit = (e) => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); S.templates.unshift({ id: uid(), ...d }); tplForm = false; save(); toast('Template saved'); route(); });
  };

  V.setup = () => `<h2>Setup your workspace</h2><div id="sbox">Checking…</div>`;
  V.setup.bind = async () => {
    const st = await fetch('/api/status').then(r => r.json()).catch(() => ({}));
    const steps = [
      ['WhatsApp', !!st.live, 'Use WhatsApp to chat, send campaigns, and receive replies.', '#inbox'],
      ['Email', !!st.emailLive, 'Send designed email once Resend is configured.', '#sender'],
      ['SMS', !!st.live, 'Send SMS through the same Twilio account.', '#campaigns'],
      ['Instagram', false, 'Try the demo Instagram inbox. A live Meta connection is not included.', '#instagraminbox'],
      ['Messenger', false, 'Try the demo Messenger inbox.', '#messengerinbox'],
      ['AI assistant', !!st.agentLive, 'Add a system prompt and test the chat agent.', '#agent'],
      ['Voice', false, 'Place a scripted test call when Twilio voice is configured.', '#voiceagents'],
    ];
    const done = steps.filter(s => s[1]).length;
    $('#sbox').innerHTML = `<div class="setup"><aside class="setup-nav"><h3>Setup your workspace</h3><div class="empty-card"><b>Channels</b> <span class="pilltag">${done}/7 Steps</span></div></aside>
      <div><div class="toolbar"><div><h3 style="margin:0">Setup your workspace</h3><p>Set up your channels, launch AI assistants, and start customer conversations.</p></div><a class="upgrade" href="#pricing">Upgrade Plan</a><button type="button" class="btn o" id="needHelp">Need help? Contact Support</button></div>
      <h3>Connect Communication Channels</h3><p>Integrate messaging and email so you can send campaigns and reply from one workspace.</p>
      ${steps.map(([name, ok, text, href]) => `<article class="chan"><b>${esc(name)}</b> <span class="pilltag ${ok ? 'ok' : ''}">${ok ? 'Connected' : 'Not Started'}</span>
        <p>${esc(text)}</p><div class="bar"><span style="width:${ok ? 100 : 8}%"></span></div><a class="btn" href="${href}">Get Started</a></article>`).join('')}
      </div></div>`;
    $('#needHelp').onclick = () => { supportOpen = true; supportSubject = 'Help with setup'; paintPop(); };
  };

  function social(channel, title, blurb) {
    return () => `<h2>${esc(title)}</h2><p style="color:#666">${blurb}</p><div id="socialbox">Loading…</div>`;
  }
  async function bindSocial(channel) {
    const box = $('#socialbox'); if (!box) return;
    let msgs = [];
    try { msgs = (await api('/api/inbox')).messages.filter(m => m.channel === channel); }
    catch { box.innerHTML = '<p>The inbox needs the local server and a signed-in session.</p>'; return; }
    const threads = {};
    msgs.forEach(m => { (threads[m.from] = threads[m.from] || []).push(m); });
    const ids = Object.keys(threads);
    if (!socialThread[channel] || !threads[socialThread[channel]]) socialThread[channel] = ids[0] || '';
    const cur = socialThread[channel];
    box.innerHTML = `<div class="split"><div class="split-list">${ids.map(id => `<button type="button" class="thread${id === cur ? ' on' : ''}" data-th="${esc(id)}"><b>${esc(id)}</b><div style="color:#777;font-size:12px">${esc(threads[id].at(-1).text).slice(0, 60)}</div></button>`).join('') || '<p style="padding:12px">No conversations yet.</p>'}
      <form id="sim" class="formgrid" style="padding:12px"><input name="from" placeholder="${channel === 'instagram' ? '@customer' : 'Customer name'}" required><input name="text" placeholder="Simulate an incoming message" required><button class="btn s">Add incoming</button></form></div>
      <div class="split-chat">${cur ? `<div class="bubbles">${threads[cur].map(m => `<div class="bubble${m.dir === 'out' ? ' out' : ''}">${esc(m.text)}</div>`).join('')}</div>
        <form id="reply" class="toolbar"><input name="t" placeholder="Reply" required style="flex:1"><button class="btn">Send</button></form>` : '<p>Add an incoming message to start a conversation.</p>'}</div></div>`;
    document.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { socialThread[channel] = b.dataset.th; route(); });
    $('#sim').onsubmit = async (e) => {
      e.preventDefault();
      await api('/api/inbox/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, to: e.target.from.value.trim(), text: e.target.text.value.trim(), dir: 'in' }) });
      await pollInbox(); socialThread[channel] = e.target.from.value.trim(); route();
    };
    if ($('#reply')) $('#reply').onsubmit = async (e) => {
      e.preventDefault(); const text = e.target.t.value.trim();
      const r = await deliver(channel, cur, text);
      if (r !== 'failed') await api('/api/inbox/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel, to: cur, text }) });
      route();
    };
  }
  V.instagraminbox = social('instagram', 'Instagram Inbox', 'Meta is not connected. Messages you add here stay in this workspace and can trigger flows.');
  V.instagraminbox.bind = () => bindSocial('instagram');
  V.messengerinbox = social('messenger', 'Messenger Inbox', 'A Facebook Page is not connected. Use this inbox to try replies locally.');
  V.messengerinbox.bind = () => bindSocial('messenger');

  V.inbox.bind = async () => {
    await inboxBind();
    if (!$('#ibox') || $('#simIn')) return;
    const f = document.createElement('form');
    f.id = 'simIn'; f.className = 'toolbar';
    f.innerHTML = `<input name="to" placeholder="Demo customer phone +91…" required style="width:220px"><input name="text" placeholder="Simulate an incoming WhatsApp message" required style="width:280px"><button class="btn s">Add incoming</button>`;
    $('#ibox').prepend(f);
    f.onsubmit = async (e) => {
      e.preventDefault();
      await api('/api/inbox/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'whatsapp', to: f.to.value.trim(), text: f.text.value.trim(), dir: 'in' }) });
      await pollInbox(); route();
    };
  };

  V.pricing = () => {
    const f = { quarterly: 1 / 0.8, half: 0.92 / 0.8, annual: 1 }[priceTerm];
    const plans = [['Startup', '3,000 Automation Tasks/month', 1999], ['Growth', '10,000 Automation Tasks/month', 4999]];
    return `<h2 style="text-align:center">AI-powered workflows, priced for your needs</h2>
    <div class="toolbar" style="justify-content:center">${[['quarterly', 'Quarterly'], ['half', 'Half Yearly · Save 8%'], ['annual', 'Annual · Save 20%']].map(([k, v]) => `<button type="button" class="btn s ${priceTerm === k ? '' : 'o'}" data-pt="${k}">${v}</button>`).join('')}</div>
    <div class="grid">${plans.map(([n, t, p]) => `<div class="card"><h3>${n}</h3><p>Includes ${t}</p><div style="font-size:30px;font-weight:800;margin:10px 0">₹${Math.round(p * f).toLocaleString('en-IN')} <small style="font-size:14px;font-weight:400">/ month</small></div><button type="button" class="btn" data-plan="${n}">${S.plan === n ? 'Current plan' : 'Upgrade Plan'}</button></div>`).join('')}
    <div class="card"><h3>Enterprise</h3><p>Custom limits, onboarding and support</p><p><button type="button" class="btn o" data-plan="Enterprise">Talk to sales</button></p></div></div>
    <p style="color:#777;font-size:13px;text-align:center">Choosing a plan updates this demo only. No payment is taken.</p>`;
  };
  V.pricing.bind = () => {
    document.querySelectorAll('[data-pt]').forEach(b => b.onclick = () => { priceTerm = b.dataset.pt; route(); });
    document.querySelectorAll('[data-plan]').forEach(b => b.onclick = () => {
      if (b.dataset.plan === 'Enterprise') { supportOpen = true; supportSubject = 'Enterprise plan'; paintPop(); return; }
      S.plan = b.dataset.plan; S.hideTrial = false; save(); toast(S.plan + ' selected. No card was charged.'); route();
    });
  };
}

installViews();
const routeCore = route;
route = function () {
  const keep = document.activeElement && document.activeElement.id === 'headQ';
  routeCore();
  paintChrome();
  if (keep) { const n = $('#headQ'); if (n) n.focus(); }
};
removeEventListener('hashchange', routeCore);
addEventListener('hashchange', route);
$('#pinMenu').onclick = () => { $('#side').classList.toggle('open'); $('#pinMenu').textContent = $('#side').classList.contains('open') ? '«' : '»'; };
$('#helpBtn').onclick = () => { supportOpen = true; supportSubject = ''; paintPop(); };
$('#fbOpen').onclick = () => { const on = $('#fbText').hidden; $('#fbText').hidden = !on; $('#fbSend').hidden = !on; if (on) $('#fbText').focus(); };
$('#feedback').onsubmit = (e) => {
  e.preventDefault(); const text = $('#fbText').value.trim(); if (!text) return;
  S.feedback.push({ at: Date.now(), text }); save(); $('#fbText').value = ''; $('#fbText').hidden = true; $('#fbSend').hidden = true;
  toast('Thanks. Feedback stays in this workspace.');
};
document.addEventListener('click', (e) => {
  if (e.target.closest('#pop, #noteBtn, #profBtn, #walletBtn, #supBtn, #headNew, .feedback, #helpBtn')) return;
  if (!(notesOpen || profileOpen || campMenu)) return;
  notesOpen = profileOpen = campMenu = false; paintPop();
});
route();
fetch('/api/me').then(r => r.json()).then(j => {
  window.ME = j.user || null;
  if (j.user && !S.profile.name && j.user.name) {
    S.profile.name = j.user.name; S.profile.phone = j.user.phone || S.profile.phone; S.profile.company = j.user.company || S.profile.company; save();
  }
  paintChrome();
}).catch(() => {});
