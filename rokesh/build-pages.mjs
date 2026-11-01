// Generates the public pages into ./site. Run: node build-pages.mjs
import { writeFileSync } from 'node:fs';

const nav = [['pricing.html','Pricing'],['channels.html','Channels'],['solutions.html','Solutions'],['case-studies.html','Case Studies'],['blog.html','Resources']];
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300..700&family=Onest:wght@400;500;600;700&display=swap">';
const layout = (title, body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#f3f1ef"><title>${title} | Rokesh</title>${FONTS}<link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="marketing.css"><script>document.documentElement.classList.add('js')</script></head><body class="site">
<header><div class="wrap"><nav><a class="logo" href="index.html"><i class="mark"></i>Rokesh</a>
<button class="nav-toggle" aria-label="Menu" aria-expanded="false" type="button">&#9776;</button>
<div class="links">${nav.map(([h,t]) => `<a class="l" href="${h}">${t}</a>`).join('')}<a class="l mob-only" href="login.html">Login</a><a class="btn mob-cta" href="index.html#contact">Book a Demo</a></div>
<div class="nav-cta"><a class="btn o sm" href="login.html">Login</a><a class="btn sm" href="index.html#contact">Book a Demo</a></div></nav></div></header>
<main>${body}</main>
<section style="padding:0 0 96px"><div class="cta-dark reveal"><h2>See Rokesh in action</h2><p>Schedule a demo to explore how Rokesh runs workflows across your systems and channels.</p><a class="btn" href="index.html#contact">Book a demo</a></div></section>
<footer><div class="wrap cols"><div class="brand"><a class="logo" href="index.html" style="display:flex;align-items:center;gap:9px;font-family:Onest,sans-serif;font-weight:600;font-size:20px;color:var(--fg);text-decoration:none"><i class="mark"></i>Rokesh</a><p style="max-width:300px">Running workflows with clarity and control.</p><p>admin@rokesh.example</p></div>
<div><b>Pages</b><br><a href="index.html">Home</a><br><a href="pricing.html">Pricing</a><br><a href="channels.html">Channels</a><br><a href="solutions.html">Solutions</a><br><a href="blog.html">Resources</a><br><a href="case-studies.html">Case Studies</a><br><a href="careers.html">Careers</a></div>
<div><b>Appendix</b><br><a href="privacy.html">Privacy Policy</a><br><a href="terms.html">Terms &amp; Conditions</a><br><a href="refund.html">Refund Policy</a><br><a href="guides.html">Support</a><br><a href="blog.html">PR Releases</a><br><a href="login.html">Login</a></div>
<div><b>Social</b><br><a href="#">LinkedIn</a><br><a href="#">Instagram</a><br><a href="#">YouTube</a></div></div>
<div class="wrap" style="padding-top:20px;font-size:13px;color:var(--mut,#7a6f84)">&copy; 2026 Rokesh. All rights reserved. Replace this line with your registered address.</div></footer>
<script src="app.js"></script><script src="site.js" defer></script></body></html>
`;
const cards = a => `<div class="grid">${a.map(([h, p], i) => `<div class="card reveal" style="--d:${(i % 6) * 0.07}s"><h3>${h}</h3><p>${p}</p></div>`).join('')}</div>`;
const sec = (h, intro, inner = '') => `<section><div class="wrap"><h1 class="reveal" style="font-size:clamp(30px,4.4vw,48px)">${h}</h1><p class="lead reveal" style="--d:.08s">${intro}</p>${inner}</div></section>`;

const pages = {};

// Pricing: monthly figures; only the Startup tier is known from research, others are placeholders to edit.
pages['pricing.html'] = layout('Pricing', `<section><div class="wrap centered">
<h1 class="reveal">AI-powered workflows, priced for your needs</h1>
<p class="lead reveal" style="--d:.08s">Flexible plans for teams running AI-driven automation across systems and channels, with visibility and control.</p>
<div class="seg reveal" style="--d:.12s" id="seg-term" role="group" aria-label="Billing term"><button data-t="quarterly" type="button">Quarterly</button><button data-t="half" type="button">Half Yearly <small>Save 8%</small></button><button data-t="annual" type="button" aria-pressed="true" class="on">Annual <small>Save 20%</small></button></div>
<div class="seg sm reveal" style="--d:.14s" id="seg-cur" role="group" aria-label="Currency"><button data-c="INR" type="button" class="on">INR</button><button data-c="USD" type="button">USD</button></div>
<div class="plans" id="plans"></div>
<p class="statnote">Annual prices are as shown in the product; quarterly and half-yearly are estimated from the stated discounts and USD from a rough rate. Billing and upgrades are not connected in this demo.</p>
</div></section>
<script>
(function(){
  var P=[{n:'Startup',t:'3,000 Automation Tasks/month',inr:1999,f:['WhatsApp + Email + SMS','50 connectors','10 custom attributes','WhatsApp team inbox','2 team seats (extra ₹500/seat)']},
         {n:'Growth',t:'10,000 Automation Tasks/month',inr:4999,hot:1,f:['Everything in Startup','Higher task limits','More seats and connectors','Priority onboarding support']},
         {n:'Enterprise',t:'Custom automation volume',inr:null,f:['Voice AI','Custom integrations','Dedicated onboarding and migration','Governance and access controls']}];
  var term='annual',cur='INR',F={quarterly:1/0.8,half:0.92/0.8,annual:1};
  function money(v){return cur==='INR'?'₹'+Math.round(v).toLocaleString('en-IN'):'$'+Math.round(v/83).toLocaleString('en-US')}
  function esc(x){return String(x).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function render(){
    document.getElementById('plans').innerHTML=P.map(function(p){
      return '<div class="plan'+(p.hot?' hot':'')+'"><h3>'+esc(p.n)+'</h3><p class="inc">'+(p.inr?'Includes '+esc(p.t):esc(p.t))+'</p>'
       +'<div class="price">'+(p.inr?money(p.inr*F[term])+' <small>/ month</small>':'Custom')+'</div>'
       +'<a class="btn'+(p.hot?'':' o')+'" href="index.html#contact">'+(p.inr?'Upgrade Plan':'Talk to sales')+'</a>'
       +'<ul class="ticks">'+p.f.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div>'}).join('');
    document.querySelectorAll('#seg-term button').forEach(function(b){b.classList.toggle('on',b.dataset.t===term)});
    document.querySelectorAll('#seg-cur button').forEach(function(b){b.classList.toggle('on',b.dataset.c===cur)});
  }
  document.getElementById('seg-term').addEventListener('click',function(e){var b=e.target.closest('button');if(b){term=b.dataset.t;render()}});
  document.getElementById('seg-cur').addEventListener('click',function(e){var b=e.target.closest('button');if(b){cur=b.dataset.c;render()}});
  render();
})();
</script>`);

pages['channels.html'] = layout('Channels', sec('Turn WhatsApp into a revenue channel',
 'Run automated journeys that capture leads, drive purchases and keep customers coming back, on the channels they already use.',
 cards([['WhatsApp','Broadcasts, templates, chatbots, team inbox and payment links.'],['Email','Onboarding, engagement and support journeys triggered by real actions.'],['SMS / RCS','Event-triggered alerts, reminders and transactional updates.'],['Instagram / Messenger','Route and answer social conversations from one inbox.'],['Voice AI','Inbound and outbound calls with handoff to your team.']])));

pages['solutions.html'] = layout('Solutions', sec('Turn real-time signals into scalable workflows',
 'Design, automate and scale customer journeys without engineering support.',
 cards([['Design & build','Drag-and-drop logic or natural-language prompts. Try the builder on the home page.'],['Triggers','Keyword, NLP, fuzzy and event triggers with AI exception handling.'],['Integrate','Connect CRMs, support tools and warehouses.'],['Monitor','Execution tracking, access control and analytics.']]) +
 `<p style="margin-top:24px"><a class="btn" href="index.html#automation">Open the workflow builder</a></p>`));

pages['case-studies.html'] = layout('Case Studies', sec('Real results from AI-powered automation',
 'How teams use workflow automation to grow revenue and cut operating cost. Replace the placeholders below with real, approved customer results.',
 cards([['E-commerce &amp; D2C','Personalized messaging and engagement for scalable growth.'],['Real estate','Faster lead response and streamlined communication.'],['BFSI &amp; microfinance','Better engagement and retention.'],['Healthcare','Streamlined patient and customer engagement.']])));

// Original articles written for this replica. They are general guidance, not statements of Meta's current policy or prices: check Meta's docs before relying on them.
const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const article = (title, paras, back, backLabel) => layout(title, `<section><div class="wrap" style="max-width:720px"><p><a href="${back}">&larr; ${backLabel}</a></p><h1 style="font-size:clamp(26px,4vw,40px)">${title}</h1>${paras.map(p => `<p>${p}</p>`).join('')}<p><a class="btn" href="index.html#contact">Book a Demo</a></p></div></section>`);
const posts = [
 ['What is agentic AI and how is it changing customer engagement?', [
  'Agentic AI means software that does more than answer: it decides on a next step and carries it out, such as qualifying a lead, updating a CRM and sending a follow-up.',
  'In customer engagement this replaces long rule trees with a goal ("book a demo") plus tools the agent may use, like messaging channels, forms and payment links.',
  'The practical safeguards are the same as for any automation: limit which tools an agent can call, log every action, and hand off to a person when confidence is low.']],
 ['How to build an automated marketing funnel that converts', [
  'Start with the stages: acquire (capture the lead), engage (first reply within minutes), convert (follow-up, offer, payment link) and retain (reminders and lifecycle messages).',
  'Capture leads with a form or a WhatsApp click-to-chat link, label each contact by stage, and trigger a workflow when the label changes.',
  'Use a sequence for follow-ups with increasing delays, and stop it when the contact replies or buys. Measure replies and conversions per stage, not just sends.']],
 ['50 WhatsApp templates that get approved on the first try', [
  'Templates are reviewed before use, so clarity matters. State who is writing, what the message is about, and what the customer can do next.',
  'Use numbered variables like {{1}} for the name and the specific detail, keep marketing and utility content separate, and avoid vague or promotional wording in utility messages.',
  'Good starting categories are order updates, appointment reminders, delivery tracking, abandoned cart nudges and event invitations. Check the current approval guidelines before submitting.']],
 ['The dos and don\'ts of WhatsApp broadcast', [
  'Do send only to contacts who opted in, personalise with the name and a relevant detail, and keep each message to one clear action.',
  'Don\'t blast your whole list at once, reuse the same text repeatedly, or ignore replies. Watch your quality rating and slow down if blocks or reports rise.',
  'Segment by label, send at sensible local times, and give people an easy way to opt out.']],
 ['How to write utility templates that Meta won\'t flag as marketing', [
  'Utility messages support a transaction the customer already started: an order confirmation, a shipping update, a payment receipt.',
  'Keep them factual and specific to that transaction. Adding discounts, upsells or promotional language is what typically gets them recategorised as marketing.',
  'Put offers in a separate marketing template. Rules and pricing change, so confirm current definitions in Meta\'s documentation.']],
 ['Best WhatsApp automation tools for Indian SMBs', [
  'When comparing tools, look at the official WhatsApp Business API access, template management, a shared team inbox, workflow automation, integrations and clear per-message pricing.',
  'Ask how contacts, templates and conversations can be exported so you are not locked in, and whether support is available in your time zone and language.',
  'Run a short trial with a real workflow, such as lead capture to first reply, before committing.']],
 ['WhatsApp marketing pricing update for India', [
  'Messaging charges depend on the conversation or message category and on the country, and Meta updates them periodically.',
  'This article does not state current prices. Check Meta\'s official pricing page and your provider\'s invoice, and model costs per category (marketing, utility, authentication, service) before a large send.']],
 ['Meta is introducing charges for service and utility messages from Oct 2026', [
  'The original announcement is dated August 2026. We have not verified the details in this replica, so treat this as a prompt to check Meta\'s official notice.',
  'Plan for it by estimating monthly volumes of service and utility messages, asking your provider how the charges will be passed on, and reducing unnecessary template sends.']],
];
pages['blog.html'] = layout('Blog', sec('Automation insights for teams that move fast',
 'Practical guides on automation, customer journeys and AI-powered operations.',
 `<div class="grid">${posts.map(([t]) => `<a class="card reveal" href="blog-${slug(t)}.html" style="text-decoration:none"><h3>${t}</h3></a>`).join('')}</div>`));
posts.forEach(([t, ps]) => { pages[`blog-${slug(t)}.html`] = article(t, ps, 'blog.html', 'All posts'); });

const guideGroups = [
 ['Getting Started &amp; Channel Onboarding', [
  ['Create your workspace and add contacts', ['Open the workspace, go to Contacts, and add people one by one or import a CSV with the columns name, phone, email and label.', 'Use E.164 phone numbers such as +919876543210 so WhatsApp and SMS can deliver.']],
  ['Connect WhatsApp and SMS (Twilio)', ['Copy server/.env.example to server/.env and add your Twilio account SID, auth token and sender numbers.', 'Restart the server. The workspace header switches from "Simulated delivery" to "Live delivery". Test with your own number first.']],
  ['Connect email sending', ['Create a Resend account, verify a sending domain, and put the API key and sender address in server/.env.', 'Email steps in broadcasts, workflows and sequences then send for real.']]]],
 ['Platform Features &amp; FAQs', [
  ['Send a broadcast from a template', ['Pick a template in Broadcasts, choose a label or all contacts, and send. The campaign table shows how many were sent or failed.']],
  ['Build a workflow', ['In Workflows, click Add flow, choose a trigger, then add steps: send a message, add a label, wait, check a condition, call a webhook or use the AI agent. Use Run test on a contact before switching it on.']],
  ['Create a sequence', ['Write one step per line as delay|unit|channel|message. Enroll a label and the steps go out in order. Sequences only run while the workspace tab is open.']],
  ['Create a shareable form', ['In Smart Forms, define fields and share the link or embed it in an iframe. Import responses into Contacts when ready.']],
  ['Add a WhatsApp chat button or QR code', ['Open QR &amp; Chat Button, enter your number and a pre-filled message, and copy the embed snippet, or scan the generated QR code.']],
  ['Train the AI chat agent', ['Write a system prompt and add facts to the knowledge base, one per line. Without an AI backend the agent matches keywords; connect a backend for generative replies.']]]],
 ['Pricing &amp; Billing', [
  ['How billing works in this demo', ['This replica has no billing. Message costs come from your own providers (Twilio, Resend, Razorpay).']],
  ['Refunds', ['See the Refund Policy page for the terms published on the original site.']]]],
];
pages['guides.html'] = layout('Guides', sec('Guides to help you automate, scale and convert',
 'Step-by-step resources for better customer journeys and automated conversations.',
 guideGroups.map(([g, items]) => `<h2 style="margin-top:32px">${g}</h2><div class="grid">${items.map(([t]) => `<a class="card reveal" href="guide-${slug(t)}.html" style="text-decoration:none"><h3>${t}</h3></a>`).join('')}</div>`).join('')));
guideGroups.forEach(([, items]) => items.forEach(([t, ps]) => { pages[`guide-${slug(t)}.html`] = article(t, ps, 'guides.html', 'All guides'); }));

pages['careers.html'] = layout('Careers', sec('Build the automation layer enterprises run on',
 'We hire across engineering, product, design, marketing and people, in Bangalore and Hyderabad.',
 cards([['Ownership','Strong ownership and high efficiency.'],['Equity','ESOPs for the team.'],['Impact','Work on systems that run enterprise workflows.']]) +
 `<p style="margin-top:24px"><a class="btn" href="mailto:admin@rokesh.example">Email us</a></p>`));

const legal = (t, intro) => layout(t, sec(t, intro, '<p style="color:var(--mut)">Placeholder: replace this page with legal text reviewed by counsel before launch. Do not publish placeholder policy text for a real business.</p>'));
pages['privacy.html'] = legal('Privacy Policy', 'How personal information is collected, used, stored and shared, with GDPR, CCPA and India DPDP Act compliance.');
pages['terms.html'] = legal('Terms & Conditions', 'The terms that govern use of the service.');
pages['refund.html'] = legal('Refund Policy', 'Refunds apply if a working dashboard is not provided within 10 days of payment, or if a WhatsApp account is disabled in the first 30 days through no policy violation. Request by email to admin@rokesh.example.');

for (const [f, h] of Object.entries(pages)) writeFileSync(new URL('./site/' + f, import.meta.url), h);
console.log('wrote', Object.keys(pages).join(', '));
