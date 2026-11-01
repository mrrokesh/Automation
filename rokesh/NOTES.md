# Cheerio AI site – research notes (2026-10-31)

Sources reviewed: cheerioai.com home, /guides. YouTube @cheerio251 not yet reviewed.

## Home page sections
Hero (agentic AI for enterprise revenue & growth; CTAs: Book a Demo / Try free) · logo strip · "Ask anything" prompts ·
Automation (no-code, prompt-created workflows, NLP/fuzzy/keyword triggers; sample flow: AI qualify -> branch -> new lead response -> CRM -> webhook -> payment link -> email/WhatsApp, AI agent 300+ models) ·
Integrations (8,000+) · Comparison (traditional vs Cheerio) · Omnichannel (WhatsApp, Email, Instagram/Messenger, SMS/RCS, Voice AI) ·
Stats (workflows executed, 25+ enterprise teams, 50 Cr+ revenue, CSAT) · Full-funnel (Acquire, Engage, Convert, Support, Retain) ·
Testimonials · About · Life at Cheerio · Backers · Product overview · Platform capabilities · Contact · FAQ · CTA · Footer.

## Guides page
3 categories: Getting Started & Channel Onboarding (6), Platform Features & FAQs (27), Pricing & Billing (2). Article bodies not yet crawled.

## Footer nav (other pages to build)
Pricing, Channels, Solutions, Resources, Case Studies, Careers, Privacy, Terms, Refund, Support, PR, Login.

## Crawled public pages (2026-10-31)
- /pricing: plans in INR/USD, billing toggles (quarterly/half-yearly/annual, save 8-20%). Startup plan Rs1999/mo: WhatsApp+Email+SMS, 3000 automation tasks/mo, 50 connectors, 10 custom attributes, team inbox, 2 seats (+Rs500/seat). Other tiers not yet captured.
- /channel/whatsapp ("3x revenue channel"), /solutions/workflow (drag-and-drop or prompt-built workflows), /case-studies (D2C/e-commerce, real estate, BFSI/MFI, healthcare), /careers (Bangalore, Hyderabad), legal: /privacy-policy, /terms-and-conditions, /refund-policy.
- /blogs: ~13 posts, mostly WhatsApp templates/pricing/broadcast and agentic AI (e.g. Meta charges for service/utility messages from Oct 2026).
- /guides: 3 categories; article bodies are not linked from the page (likely load client-side).
- Other links: app.cheerio.in/login, hsforms demo form, LinkedIn, Instagram @cheerio_ai, YouTube @cheerio251.

## Logged-in app (app.cheerio.in/creator, user's own trial account, read-only look)
Sidebar: Dashboard, Contacts, Campaigns, Analytics, WhatsApp Inbox (desktop only), Templates, Email, Integrations, Automation/Sequences, Smart Forms, LinkedIn Sequences, WA Commerce, Shopify Analytics, Raise a Ticket.
Dashboard: email credits, wallet (INR), WA API quality, daily WABA limit, chatbot analytics (CSAT, conversations, completion, unique users), messaging analytics (WhatsApp/SMS/Email delivery, open, CTR, response), help videos (upload contacts + campaign, WA template submit, keyword workflow, embeddable form, GPT assistant on WABA).
Trial expires in ~7 days. Nothing was changed in the account.

### Modules opened (read-only)
- Routes: /creator (dashboard), /creator/contacts/labels, /creator/announcements (= Campaigns), /creator/templates. Guessed /creator/integrations and /creator/forms render an empty shell (wrong routes).
- Desktop layout has a collapsed sidebar with groups (Dat.., Mar.., Aut.., Age.., Sup.., Com..) that I could not expand; mobile layout has the full menu but covers the content.
- Contacts > Labels: table (Label, Contacts, Added on, Action) with "Add Contacts"; empty.
- Campaigns: table (name, label, type, channels, status, contacts, sent, delivered, opened, clicked), filters (channel, status, search, sort), "New Campaign", "Export Report"; banner about syncing templates from library; empty.
- Templates: Template Library with tabs WhatsApp Templates / Email Templates, "Create a Template", category chips (All, Ecommerce, Banking, Education, Real Estate, Healthcare, Webinar...) and ready templates with {{n}} variables (offer, order cancelled, COD to prepaid, delivery tracking, upsell, product launch, product details), each with "Add Template".
- Full desktop sidebar (seen later): Setup Workspace, Dashboard; Data (Contacts: All Contacts, Labels, Contacts; Smart Forms); Marketing (Broadcasts, Email Manager, Template Library); Automations (AI Workflows); Agentic AI (AI Chat Agents, AI Voice Agents); Support (Team Inbox, WA Support Analytics); Commerce (WhatsApp Payments, WhatsApp Catalog); Integrations; Account settings; Cheerio Support.
- AI Chat Agent editor (/creator/ai-assistants/edit/<id>): header actions Raise a ticket / Help guide / Save. Sections: provider+model picker, System Prompt, Knowledge Base (docx, pdf, txt, csv, markdown, png, jpeg, links), Tools (workflows, other AI assistants, human agents it can trigger), WhatsApp Catalog access, Google Sheets permissions (read/search, add rows, edit rows, delete rows, add columns, delete columns), Response Settings, Data Collection (collect user info in defined formats), Conversation Exit Rules, Message Ground (token counter), and a side "New Chat" test panel.
- Automations submenu: Keywords, Workflows, AI Workflows. /creator/workflow has tabs My Workflows / Workflows Library, "Add flow", "+ New folder", search, Help guide, settings. Table: Name, Event Type, Created At, Last Updated, Actions (on/off toggle, edit, menu). 4 samples: Admission Registration (incomingWA), Reply in comment / Incoming DM Message / Reply to story (instagramEvent, IG samples), all off. Dashboard also has quick starts (AI chat agent, AI voice agent, send test WhatsApp, Instagram automation) and a product tour overlay.
- Could not open the visual workflow editor (the edit click did not navigate; the narrow pane makes the sidebar overlay the table).
- Not opened: Automation/Sequences, Smart Forms, Integrations, Email, WA Commerce, Shopify Analytics, LinkedIn Sequences, Inbox.
- Not done on purpose: calling the app's private backend API (newprod.api.cheerio.in) directly.

## Build phases
1. (done here) Static site + working prompt-to-workflow builder with run simulator + lead form.
2. Real sending: email (SMTP), SMS/WhatsApp (Twilio / WhatsApp Business) – needs user API keys.
3. Platform: auth, DB, integrations, voice AI – needs backend decisions and accounts.

## YouTube @cheerio251 (30 videos, 162 subscribers) - titles only, videos not watched
Feature tutorials: keyword workflows, WhatsApp template creation/submission, shareable/embeddable forms, email campaigns, contact upload + campaigns, sequences, email templates, WhatsApp QR code + chat button, embed sign-up, GPT assistant on WABA, DLT registration, Facebook integration, Shopify integration, Pabbly integration, omni-channel, Meta pixel optimizer for CTWA lead quality.
Demos: company brain AI demo, AI voice bot on WhatsApp, KYC verification chatbot (BFSI/MFI), ed-tech chatbot, Tulsi Tea chatbot, Instagram masterclass with Meta, feature showcase webinar.

## Status of replica (2026-11-01)
Built: marketing site, public pages, workspace (contacts, labels, templates, broadcasts, workflows with engine, AI agent, smart forms with public link, integrations as webhooks, team inbox, product catalog), backend (Twilio WhatsApp/SMS, Resend email, forms storage, inbound webhook).
Not built: sequences, WhatsApp QR/chat button, Shopify/Facebook/Pabbly native integrations, Meta pixel optimizer, voice AI, WhatsApp payments, auth/multi-user, real LLM agent (needs AGENT_ENDPOINT), real article bodies.
Run: node server/server.mjs  (then http://127.0.0.1:5173). Credentials go in server/.env (see .env.example).

## Platform Features & FAQs page (27 articles) - what is implemented (2026-11-01)
Read: keywords, custom attributes, filters, canned responses, chat assignment/statuses, FRT, workflow nodes, voice AI nodes, new conversation, contact upload/mapping.
Built: attributes (12 types, max 50), contacts filters (up to 5, AND/OR, 6 operators), CSV upload with column mapping and label choice, keywords (exact case-sensitive / approximate; actions message, template, assign, workflow), Team Inbox (statuses OPEN/PENDING/RESOLVED/CHATBOT/INTERVENED, ACTIVE/EXPIRED 24h window, FRT EXCEEDED, UNASSIGNED, assignment, resolve, new conversation via template, expired-window template send), canned responses with "/" shortcuts, chat preferences (FRT minutes), agent invite (owner-created accounts), workflow steps "Set attribute" and "Make call".
Not built (need Meta/Shopify/other accounts or big scope): Cheerio MCP, Shopify store connect + workflows + segments, click-to-Instagram DM ads, conversion pixel, voice AI agent module with inbound trigger node, workspaces (multi-tenant), Facebook lead / Kylas / Pabbly event nodes, campaign-sent node, Appsumo/onboarding articles, WhatsApp-native UPI payments (payment links only), lat/long article (use Google Maps right-click).

## Screenshot inventory (62 screens, Downloads/cheerio-screens) - coverage (2026-11-01)
Built in the workspace (site/modules.js, site/modules2.js): setup workspace checklist, contacts/labels/attributes (earlier), broadcasts + New Campaign shortcuts, broadcast analytics, global analytics (WhatsApp/Email/SMS/RCS tabs, CSV export), email design library (block editor + starters), HTML email campaign, email verifier (syntax/disposable/MX), manage sender, email drips (= Sequences), template library, smart forms, workflows (linear) + visual Flow Builder (drag nodes, connectors, triggers/actions, library, run test, live triggers), AI chat agent, voice agents (talk in browser, test call), voice campaigns, voice numbers, voice analytics, voice compliance (record only), WA support analytics, WhatsApp payments analytics, WhatsApp catalog, discover platforms / manage integrations, account settings (people, automation settings incl. abandoned chat, inbox settings, webhooks, attributes), profile, wallet (local ledger), notifications, pricing plans (display only).
Not real / not built: Instagram + Messenger inboxes (need Meta Graph API approval), Shopify/Facebook/Kylas/Pabbly/Meta Pixel flow nodes (shown disabled), two-way live voice AI on phone calls, delivered/opened/clicked metrics (need provider callbacks), real billing/upgrade, payment collected status (needs Razorpay webhooks), flow zoom/minimap, multi-workspace.

Flow builder polish (2026-11-01): zoom (buttons, Ctrl+wheel, fit), minimap, undo/redo (50 steps), duplicate node, Delete/Ctrl+D/Ctrl+Z/Ctrl+Y keys, auto-layout, validation warnings, activation blocked without trigger, Ask-a-Question node (waits for reply, saves variable, resumes flow), run highlighting, rule-based describe-a-flow generator, flow duplicate/export/import (sanitised).

## Design pass 2 (matched to the reference site, 2026-11-01)
Public site now follows the reference: floating capsule header, Onest + DM Sans, #483953 ink, purple pill gradient, warm off-white page, tag pills, framed product shots (real Rokesh screenshots in site/img), V/S comparison, rotating "Wave goodbye" words, lifecycle tabs, dark product section, white contact card, FAQ accordion, dark CTA, pricing with segmented toggle (Startup 1,999 / Growth 4,999). Theme lives in site/marketing.css (scoped to body.site); workspace pages are unaffected. Not copied: reference images, logos, customer names, testimonials, founder claims.
