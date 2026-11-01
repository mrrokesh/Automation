# Rokesh replica

Static marketing site + workspace app (`site/`) and a zero-dependency Node backend (`server/`).

```
node server/server.mjs      # then open http://127.0.0.1:5173/login.html
node build-pages.mjs        # regenerates the public pages (pricing, blog, guides...) into site/
```

Credentials go in `server/.env` (copy `server/.env.example`). See `NOTES.md` for what is built and what is not.
This folder is separate from `frontend/` and `backend/` (the Vite + Express app), which do not use it.

## Tests

`npm test` runs 14 integration tests against the real server (temp data, fake AI API, no keys needed).
