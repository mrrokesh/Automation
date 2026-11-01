# Automation (Rokesh)

Rokesh is a customer-engagement automation platform: a marketing site, a logged-in workspace with working automations, and a separate frontend/backend login app.

## What is in this repo

| Folder | What it is |
| --- | --- |
| `rokesh/` | Marketing site and workspace app (`site/`) with a zero-dependency Node server (`server/`). Inbox, contacts, broadcasts, sequences, flow builder, forms, chat widget, AI agent. |
| `frontend/` | Vite + React 19 + Tailwind CSS v4 sign-in and sign-up app. |
| `backend/` | Node.js + Express 5 + PostgreSQL API. Passwords use bcrypt with a per-password salt, a secret pepper and 12 rounds. |

## Features (`rokesh/`)

- Channels: WhatsApp and SMS (Twilio), email (Resend), payment links (Razorpay), voice calls (Twilio text-to-speech).
- AI chat agent (Anthropic or Gemini) with human hand-off, plus an email verifier.
- Visual flow builder, sequences, broadcasts from templates, shareable forms, WhatsApp chat button and QR code.
- Without provider keys everything runs in a simulated mode; add keys to send for real.
- `rokesh/NOTES.md` lists what is built and what is not.

## Quick start

Requires Node.js 22.23+ (tested on 26).

Marketing site and workspace:

```bash
cd rokesh
npm test                    # 14 integration tests, no keys or database needed
node server/server.mjs      # open http://127.0.0.1:5173/login.html
node build-pages.mjs        # regenerate the public pages
```

Frontend and backend:

```bash
cd backend && npm install && npm run setup:env   # creates .env with generated PEPPER and JWT_SECRET
# add your DATABASE_URL to backend/.env, then:
npm run migrate && npm run dev                   # API on http://localhost:4000
cd ../frontend && npm install && npm run dev     # http://localhost:5173
```

Full instructions, tests and Docker deployment are in [SETUP.md](SETUP.md).

## Configuration and secrets

Secrets live only in `.env` files, which are git-ignored: `backend/.env` and `rokesh/server/.env` (copy `rokesh/server/.env.example`). Never commit them. Back up `PEPPER`: changing it makes existing passwords unverifiable.

## Status

Placeholder content to replace before launch: the stats on the home page, the contact email `admin@rokesh.example` and the footer address. Not built: Instagram and Messenger inboxes, native Shopify and Facebook nodes, live two-way voice AI, real billing, password reset, and a background scheduler for sequences.

## License

See [LICENSE](LICENSE).
