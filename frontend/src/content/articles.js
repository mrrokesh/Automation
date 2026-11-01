// Original articles written for Rokesh. General guidance, not statements of Meta's current policy or prices:
// check Meta's documentation before relying on them.
export const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

export const posts = [
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
  ["The dos and don'ts of WhatsApp broadcast", [
    'Do send only to contacts who opted in, personalise with the name and a relevant detail, and keep each message to one clear action.',
    "Don't blast your whole list at once, reuse the same text repeatedly, or ignore replies. Watch your quality rating and slow down if blocks or reports rise.",
    'Segment by label, send at sensible local times, and give people an easy way to opt out.']],
  ["How to write utility templates that Meta won't flag as marketing", [
    'Utility messages support a transaction the customer already started: an order confirmation, a shipping update, a payment receipt.',
    'Keep them factual and specific to that transaction. Adding discounts, upsells or promotional language is what typically gets them recategorised as marketing.',
    "Put offers in a separate marketing template. Rules and pricing change, so confirm current definitions in Meta's documentation."]],
  ['Best WhatsApp automation tools for Indian SMBs', [
    'When comparing tools, look at the official WhatsApp Business API access, template management, a shared team inbox, workflow automation, integrations and clear per-message pricing.',
    'Ask how contacts, templates and conversations can be exported so you are not locked in, and whether support is available in your time zone and language.',
    'Run a short trial with a real workflow, such as lead capture to first reply, before committing.']],
  ['WhatsApp marketing pricing update for India', [
    'Messaging charges depend on the conversation or message category and on the country, and Meta updates them periodically.',
    "This article does not state current prices. Check Meta's official pricing page and your provider's invoice, and model costs per category (marketing, utility, authentication, service) before a large send."]],
  ['Meta is introducing charges for service and utility messages from Oct 2026', [
    "The original announcement is dated August 2026. We have not verified the details here, so treat this as a prompt to check Meta's official notice.",
    'Plan for it by estimating monthly volumes of service and utility messages, asking your provider how the charges will be passed on, and reducing unnecessary template sends.']],
].map(([title, paras]) => ({ title, paras, slug: slug(title) }))

export const guideGroups = [
  ['Getting Started & Channel Onboarding', [
    ['Create your workspace and add contacts', ['Open the workspace, go to Contacts, and add people one by one or import a CSV with the columns name, phone, email and label.', 'Use E.164 phone numbers such as +919876543210 so WhatsApp and SMS can deliver.']],
    ['Connect WhatsApp and SMS (Twilio)', ['Add your Twilio account SID, auth token and sender numbers to backend/.env (see backend/.env.example).', 'Restart the backend. The workspace header switches from "Simulated delivery" to "Live delivery". Test with your own number first.']],
    ['Connect email sending', ['Create a Resend account, verify a sending domain, and put the API key and sender address in backend/.env.', 'Email steps in broadcasts, workflows and sequences then send for real.']]]],
  ['Platform Features & FAQs', [
    ['Send a broadcast from a template', ['Pick a template in Broadcasts, choose a label or all contacts, and send. The campaign table shows how many were sent or failed.']],
    ['Build a workflow', ['In Workflows, click Add flow, choose a trigger, then add steps: send a message, add a label, wait, check a condition, call a webhook or use the AI agent. Use Run test on a contact before switching it on.']],
    ['Create a sequence', ['Write one step per line as delay|unit|channel|message. Enroll a label and the steps go out in order.']],
    ['Create a shareable form', ['In Smart Forms, define fields and share the link or embed it in an iframe. Import responses into Contacts when ready.']],
    ['Add a WhatsApp chat button or QR code', ['Open QR & Chat Button, enter your number and a pre-filled message, and copy the embed snippet, or scan the generated QR code.']],
    ['Train the AI chat agent', ['Write a system prompt and add facts to the knowledge base, one per line. Without an AI key the agent matches keywords; add an Anthropic or Gemini key for generative replies.']]]],
  ['Pricing & Billing', [
    ['How billing works', ['Billing is not built yet. Message costs come from your own providers (Twilio, Resend, Razorpay).']],
    ['Refunds', ['See the Refund Policy page for the published terms.']]]],
].map(([group, items]) => ({ group, items: items.map(([title, paras]) => ({ title, paras, slug: slug(title) })) }))

export const cardPages = {
  channels: {
    title: 'Turn WhatsApp into a revenue channel',
    intro: 'Run automated journeys that capture leads, drive purchases and keep customers coming back, on the channels they already use.',
    cards: [['WhatsApp', 'Broadcasts, templates, chatbots, team inbox and payment links.'], ['Email', 'Onboarding, engagement and support journeys triggered by real actions.'], ['SMS / RCS', 'Event-triggered alerts, reminders and transactional updates.'], ['Instagram / Messenger', 'Route and answer social conversations from one inbox.'], ['Voice AI', 'Inbound and outbound calls with handoff to your team.']],
  },
  solutions: {
    title: 'Turn real-time signals into scalable workflows',
    intro: 'Design, automate and scale customer journeys without engineering support.',
    cards: [['Design & build', 'Drag-and-drop logic or natural-language prompts. Try the builder on the home page.'], ['Triggers', 'Keyword, NLP, fuzzy and event triggers with AI exception handling.'], ['Integrate', 'Connect CRMs, support tools and warehouses.'], ['Monitor', 'Execution tracking, access control and analytics.']],
    cta: { to: '/#automation', label: 'Open the workflow builder' },
  },
  'case-studies': {
    title: 'Real results from AI-powered automation',
    intro: 'How teams use workflow automation to grow revenue and cut operating cost. Replace the placeholders below with real, approved customer results.',
    cards: [['E-commerce & D2C', 'Personalized messaging and engagement for scalable growth.'], ['Real estate', 'Faster lead response and streamlined communication.'], ['BFSI & microfinance', 'Better engagement and retention.'], ['Healthcare', 'Streamlined patient and customer engagement.']],
  },
  careers: {
    title: 'Build the automation layer enterprises run on',
    intro: 'We hire across engineering, product, design, marketing and people, in Bangalore and Hyderabad.',
    cards: [['Ownership', 'Strong ownership and high efficiency.'], ['Equity', 'ESOPs for the team.'], ['Impact', 'Work on systems that run enterprise workflows.']],
    cta: { href: 'mailto:admin@rokesh.example', label: 'Email us' },
  },
}

export const legal = {
  privacy: ['Privacy Policy', 'How personal information is collected, used, stored and shared, with GDPR, CCPA and India DPDP Act compliance.'],
  terms: ['Terms & Conditions', 'The terms that govern use of the service.'],
  refund: ['Refund Policy', 'Refunds apply if a working dashboard is not provided within 10 days of payment, or if a WhatsApp account is disabled in the first 30 days through no policy violation. Request by email to admin@rokesh.example.'],
}

export const plans = [
  { name: 'Startup', tasks: '3,000 Automation Tasks/month', inr: 1999, features: ['WhatsApp + Email + SMS', '50 connectors', '10 custom attributes', 'WhatsApp team inbox', '2 team seats (extra ₹500/seat)'] },
  { name: 'Growth', tasks: '10,000 Automation Tasks/month', inr: 4999, hot: true, features: ['Everything in Startup', 'Higher task limits', 'More seats and connectors', 'Priority onboarding support'] },
  { name: 'Enterprise', tasks: 'Custom automation volume', inr: null, features: ['Voice AI', 'Custom integrations', 'Dedicated onboarding and migration', 'Governance and access controls'] },
]
