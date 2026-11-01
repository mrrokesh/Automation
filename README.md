# Automation (Rokesh)

Rokesh is a customer-engagement automation platform: a marketing site and a signed-in workspace for contacts, broadcasts, workflows, an inbox and an AI agent.

**Stack:** Vite + React + Tailwind CSS (frontend), Node.js + Express (backend), PostgreSQL (database).

| Folder | What it is |
| --- | --- |
| `frontend/` | Vite + React 19 + Tailwind CSS v4. Public pages (home, pricing, channels, solutions, case studies, blog, guides, careers, legal), the login screen, the public form page and the workspace under `/app`. |
| `backend/` | Node.js + Express 5 + PostgreSQL API. Passwords use bcrypt with a per-password salt, a secret pepper and 12 rounds. Sessions are HttpOnly JWT cookies. |

## Workspace features

Everything below lives under `/app` and saves to PostgreSQL.

- **Data:** contacts with filters and CSV import and column mapping, custom attributes, labels, Smart Forms with a public embeddable link.
- **Marketing:** template library, broadcasts, QR code and WhatsApp chat button.
- **Automations:** keyword rules, a workflow builder and runner, sequences, saved webhooks, a webhook that pushes contacts in.
- **AI and voice:** AI chat agent (Anthropic or Gemini, with keyword matching as fallback) and text-to-speech voice calls.
- **Support:** team inbox with chat statuses, canned responses, team members and roles.
- **Commerce and tools:** WhatsApp catalog, Razorpay payment links, email verifier.
- **Channels:** WhatsApp and SMS (Twilio), email (Resend). Without provider keys everything runs in a simulated mode.

## Quick start

Requires Node.js 22.23+ and a PostgreSQL database.

```bash
cd backend && npm install && npm run setup:env   # creates .env with generated PEPPER and JWT_SECRET
# add your DATABASE_URL to backend/.env, then:
npm run migrate && npm run dev                   # API on http://localhost:4000
cd ../frontend && npm install && npm run dev     # http://localhost:5173 (proxies /api to the backend)
```

The first account you create on the login page becomes the workspace owner. After that, only the owner adds members (Team & Chat Settings). Forgotten passwords are reset from the login page with a code that is emailed when Resend is configured.

## Configuration and secrets

Secrets live only in `backend/.env`, which is git-ignored. Copy `backend/.env.example` for the full list: database, pepper, JWT secret, and the optional Twilio, Resend, Razorpay and AI keys. Never commit `.env`. Back up `PEPPER`: changing it makes existing passwords unverifiable.

## Tests

| Where | Command | What it covers |
| --- | --- | --- |
| `backend/` | `npm test` | Password hashing, owner and member rules, sessions, password reset, rate limits, forms, inbox, leads, webhooks, sending, payments, calls, the AI agent (against a fake API) and workspace state. Each run uses its own temporary PostgreSQL schema and drops it afterwards, so real data is never touched. |
| `frontend/` | `npm run lint` and `npm run build` | Static checks. |

## Deploy as one service

Build the frontend, then the backend serves `frontend/dist` and the API from one process.

```bash
docker build -t rokesh .
docker run -p 4000:4000 --env-file backend/.env -e NODE_ENV=production -e TRUST_PROXY=1 rokesh
```

`NODE_ENV=production` makes the session cookie Secure, so serve it over HTTPS.

## Status

Placeholder content to replace before launch: the sample stats on the home page, the contact email `admin@rokesh.example` and the footer address.

Not built: the visual flow builder, analytics pages, voice agents and campaigns, Instagram and Messenger inboxes, native Shopify and Facebook connectors, live two-way voice AI, real billing, and a background scheduler for sequences (they run only while the workspace is open).

## License

See [LICENSE](LICENSE).
