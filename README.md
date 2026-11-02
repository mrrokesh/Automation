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

## Workspaces, admins and the platform

Rokesh is multi-tenant. Each customer gets their own **workspace** with separate users, contacts, forms, inbox, leads and settings. Every API query is limited to the signed-in user's workspace, and tests prove one workspace cannot read or change another's data.

| Role | Can do |
| --- | --- |
| **Member** | Use their workspace. |
| **Admin** | Everything a member can, plus the workspace admin portal: manage members, view the workspace audit log. |
| **Owner** | Everything an admin can, plus create admins and change roles. Cannot be changed from the portal. |
| **Platform admin** | A flag on a user. Runs the whole platform: create, suspend and delete workspaces, see every demo request and support ticket, the global audit log and system status. |

The first account ever created becomes the owner of the first workspace and the platform admin. After that, platform admins create new workspaces (for example straight from a demo request) with a temporary owner password.

Sign in at **`/admin`** (a dedicated admin login; platform admins land on the platform portal, workspace owners and admins on their own admin portal), or use the normal login and open the **Admin** or **Platform** section in the sidebar. Members never see them, and the API refuses their requests.

**Workspace admin portal (`/app/admin`)**
- **Overview:** this workspace's users, contacts, forms, responses and sign-ins.
- **Users:** invite, change role, disable or enable, set a temporary password, delete. Disabled users are signed out at once.
- **Audit log:** sign-ins and admin actions in this workspace. Passwords are never recorded.

**Platform portal (`/app/platform`)**
- **Overview** across all workspaces, with a 7-day activity chart.
- **Workspaces:** create (with an owner), rename, suspend or reactivate (users are signed out and blocked, public forms go offline), reset any user's password, grant or remove platform admin, rotate a workspace's webhook key, and delete a workspace after typing its address. You cannot suspend or delete your own workspace.
- **Demo requests:** everyone who used "Book a demo", with status and notes, and a **Create workspace** button.
- **Support tickets:** requests from the public `/support` page with status, priority, assignee, notes and email replies (sent when Resend is configured).
- **Audit log** across all workspaces, filterable by workspace. It survives a workspace being deleted.
- **System:** server, database and configuration status. Secrets are never shown.

Provider keys (Twilio, Resend, Razorpay, AI) are set once for the whole platform and shared by every workspace. Inbound webhooks are per workspace: `/webhook/twilio/<workspace>` and `/webhook/contact/<workspace>?key=...` (each workspace has its own key). The old paths without a workspace keep working for the first workspace.

Not included: impersonating a customer, self-serve signup, per-customer billing, and per-workspace provider keys.

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
