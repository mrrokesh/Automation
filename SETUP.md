# Rokesh: setup, tests and deployment

```
frontend/   Vite + React + Tailwind CSS v4          (dev server :5173, proxies /api to :4000)
backend/    Node.js + Express + PostgreSQL          (bcrypt: salt + pepper + 12 rounds)
rokesh/     Separate static site + workspace app with its own Node server (see rokesh/README.md)
```

## First run (frontend + backend)

1. `cd backend && npm run setup:env` creates `backend/.env` with generated `PEPPER` and `JWT_SECRET`.
2. Open `backend/.env` and paste your PostgreSQL connection string after `DATABASE_URL=`.
3. `npm run migrate` creates the tables.
4. `npm run dev` starts the API on http://localhost:4000 (health: `/api/health`).
5. In another terminal: `cd frontend && npm run dev` (http://localhost:5173).

## Tests

| Project | Command | What it covers |
| --- | --- | --- |
| `backend/` | `npm test` | hashing (bcrypt, 12 rounds, salt, pepper), register, login, logout, session tampering, rate limiting, error handling. Uses your real database with throwaway `test-*@example.test` rows that it deletes. |
| `rokesh/` | `npm test` | auth and owner rules, API protection, forms, webhooks, inbox, sending validation, payments, calls, verifier, AI agent (against a fake API). No database or keys needed. |
| `frontend/` | `npm run lint` and `npm run build` | static checks only; the UI was tested by hand in a browser. |

## How passwords are stored

- Salt: bcrypt makes a new random salt for every password and stores it inside the hash.
- Pepper: `PEPPER` (in `.env`, never in the database) is mixed in with HMAC-SHA256 before bcrypt.
- Rounds: 12, fixed in `backend/src/config.js`.
- Losing or changing `PEPPER` makes every existing password unverifiable. Back it up like a key.

## Deploying frontend + backend as one service

`npm run build` in `frontend/` creates `frontend/dist`; when it exists the backend serves it, so one process serves the site and the API.

```
docker build -t rokesh .
docker run -p 4000:4000 --env-file backend/.env -e NODE_ENV=production -e TRUST_PROXY=1 rokesh
```

- `NODE_ENV=production` marks the session cookie Secure, so use HTTPS (your platform's proxy).
- `TRUST_PROXY=1` makes rate limits use the real client address behind that proxy.
- The Dockerfile has not been built here (Docker is not installed on this machine).
- Set the same variables as in `backend/.env` in your hosting platform's secret settings; do not bake `.env` into an image.

## Security notes

- Sessions are a signed JWT in an HttpOnly, SameSite=Strict cookie (Secure when NODE_ENV=production).
- Login and register are limited to 10 attempts per 15 minutes per IP.
- A connection string with `sslmode=disable` sends the database password and data unencrypted. Use `sslmode=require` if the server supports it.
- Rotate any secret that has been pasted into chat or committed anywhere.
