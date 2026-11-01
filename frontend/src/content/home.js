export const chips = ['WhatsApp', 'Email', 'SMS', 'Voice AI', 'Instagram', 'Messenger', 'Shopify', 'HubSpot', 'Zapier', 'Google Sheets', 'Webhooks', 'Razorpay']

export const tiles = [
  ['W', 'WhatsApp', '#25d366'], ['@', 'Email', '#ea4335'], ['S', 'SMS', '#5b8def'], ['$', 'Shopify', '#7ab55c'],
  ['H', 'HubSpot', '#ff7a59'], ['#', 'Slack', '#611f69'], ['G', 'Sheets', '#0f9d58'], ['Z', 'Zapier', '#ff4a00'],
  ['⇄', 'Webhooks', '#8765d6'], ['R', 'Razorpay', '#3395ff'], ['T', 'Twilio', '#f22f46'], ['AI', 'Models', '#483953'],
]

export const oldWay = ['Rule-heavy setup and maintenance', 'Channel-specific logic', 'Manual updates and handoffs', 'Limited visibility across systems', 'Hard to scale across teams', 'Heavy dependence on engineering teams', 'Slow changes due to rigid workflows', 'Disconnected reporting across tools']
export const newWay = ['Prompt-driven workflow creation', 'One workflow engine across channels', 'Structured execution from intent', 'Real-time visibility and control', 'Designed to scale across teams', 'Minimal engineering dependency', 'Fast updates through editable workflows', 'Unified reporting across channels']

export const channelCards = [
  ['WhatsApp', 'Plan, converse and track in real time', 'Broadcasts, templates, chatbots, a shared team inbox and payment links on the channel customers already use.'],
  ['Email', 'Email journeys that run themselves', 'Automate onboarding, engagement and support with workflows that respond to real customer actions, not manual sends.'],
  ['SMS / RCS', 'Timely messaging that drives action', 'Send event-triggered alerts, reminders and transactional updates when timing matters most.'],
  ['Voice AI', 'Human-like conversations on every call', 'Automate inbound and outbound calls that qualify leads, answer queries and hand off to your team.'],
  ['Instagram / Messenger', 'Manage conversations at scale', 'Handle inbound messages, automate responses and route conversations while keeping context intact.'],
]

export const words = ['unnecessary complexity', 'rigid workflows', 'manual resolutions', 'disconnected tooling', 'rule-heavy automation', 'operational friction', 'AI hallucinations']

// Placeholder figures: replace with your real numbers before launch.
export const stats = [[1, 'B+', 'Workflows executed'], [25, '+', 'Enterprise teams enabled'], [50, ' Cr+', 'Additional revenue generated'], [40, '%', 'Higher CSAT']]

export const lifecycle = [
  ['Acquire', 'Capture and qualify leads', 'Capture and route inbound leads across channels with instant replies and smart qualification, so high-intent prospects never wait.'],
  ['Engage', 'Engagement that adapts in real time', 'Engage customers with timely, personalised messages across WhatsApp, email, SMS and social so every interaction feels relevant.'],
  ['Convert', 'Turn intent into revenue', 'Nudge customers to act with automated follow-ups, catalogs, payment links and conversion-focused journeys.'],
  ['Support', 'Support at scale', 'Combine AI assistants and human agents to handle FAQs, route complex cases and manage conversations from one inbox.'],
  ['Retain', 'Drive long-term customer value', 'Re-engage customers with reminders, updates and lifecycle campaigns that keep your brand top of mind.'],
]

export const features = [
  ['Create workflows in natural language', 'AI turns intent into clear, editable workflow structures.'],
  ['Run once. Execute everywhere.', 'Deploy the same workflow across WhatsApp, email and SMS.'],
  ['Works with your existing stack', 'Connect your tools without re-architecting systems.'],
  ['Built for teams and governance', 'Track execution, manage access and maintain compliance.'],
]

export const faqs = [
  ['How does Rokesh work?', 'Describe a workflow in plain language or build it visually, connect your channels and tools, and Rokesh runs it for every customer in real time.'],
  ['What integrations are available?', 'Rokesh connects to thousands of platforms, including Salesforce, HubSpot, Zendesk, Jira and Google Workspace, directly or through webhooks.'],
  ['What channels does Rokesh support?', 'WhatsApp, email, SMS, Instagram, Messenger and voice, all from one workflow engine.'],
  ['Is Rokesh secure?', 'Role-based access, monitoring and compliance controls are built in.'],
  ['Can I try Rokesh before committing?', 'Yes. Start a free trial or book a demo and we will walk you through it.'],
  ['Do I need technical expertise to use Rokesh?', 'No. Workflows are created from simple prompts and edited visually.'],
  ['Does Rokesh replace our existing tools?', 'No. It works alongside your stack and connects the pieces.'],
]

// Prompt-to-workflow parser: rule-based, no API key needed.
const CATALOG = [
  [/lead|inquiry|enquiry|signup|sign up|form/i, 'Trigger', 'New lead received'],
  [/qualif|score|intent/i, 'AI', 'AI qualifies lead'],
  [/crm|hubspot|salesforce|update contact/i, 'Integration', 'Update CRM'],
  [/whatsapp/i, 'Channel', 'Send WhatsApp message'],
  [/sms|rcs/i, 'Channel', 'Send SMS/RCS'],
  [/email|mail/i, 'Channel', 'Send email'],
  [/instagram|messenger|dm/i, 'Channel', 'Reply on Instagram/Messenger'],
  [/call|voice/i, 'Channel', 'Voice AI call'],
  [/payment|pay link|invoice|checkout/i, 'Action', 'Send payment link'],
  [/webhook|api/i, 'Action', 'Send webhook'],
  [/wait|delay|after \d|remind/i, 'Control', 'Wait 24h / reminder'],
  [/human|agent|escalat|handoff|support/i, 'Action', 'Hand off to human agent'],
]
export function parseWorkflow(prompt) {
  const hits = CATALOG.map(([re, type, label]) => ({ i: prompt.search(re), type, label })).filter((x) => x.i >= 0).sort((a, b) => a.i - b.i)
  if (!hits.length) return []
  if (hits[0].type !== 'Trigger') hits.unshift({ type: 'Trigger', label: 'Incoming event' })
  return hits
}

export const examples = [
  ['Welcome on keyword', 'When a customer replies with the keyword hello, send a WhatsApp message and update the CRM.'],
  ['Qualify + payment link', 'When a new lead arrives, qualify with AI, send a WhatsApp message and a payment link.'],
  ['Post-purchase follow-up', 'After a purchase, wait, send an email, then ask for feedback on WhatsApp.'],
]
